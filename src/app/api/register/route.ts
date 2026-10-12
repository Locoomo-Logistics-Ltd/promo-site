import { NextResponse } from "next/server";
import { registrationSchema, fieldErrors, inNigeria, isShortPinHost, type ApiResult } from "@/lib/validation";
import { clientIp, hashIp } from "@/server/ip";
import { register } from "@/server/service";
import { getDeps } from "@/server/deps";
import { isMock, ConfigError } from "@/server/config";
import { resolveShortPin } from "@/server/pin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hits = new Map<string, number[]>();
function limited(key: string, max = 8, windowMs = 10 * 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > windowMs) hits.delete(k);
  return recent.length > max;
}

const reply = (body: ApiResult, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  try {
    const ip = clientIp(req.headers);
    if (limited(ip ?? "unknown")) {
      return reply({ status: "rate_limited", message: "Too many attempts. Please wait a few minutes and try again." }, 429);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return reply({ status: "error", message: "We couldn't read that request. Please try again." }, 400);
    }

    const parsed = registrationSchema.safeParse(body);
    if (!parsed.success) {
      return reply({ status: "invalid", errors: fieldErrors(parsed.error), message: "Please fix the highlighted fields." }, 422);
    }
    // Honeypot: pretend success so bots learn nothing; nothing is stored or sent.
    if (parsed.data.website) {
      return reply({ status: "success", emailSent: true, message: "Your application has been received." });
    }

    // Short map links hide their coordinates; read them (best effort) so staff get an exact point.
    const d = parsed.data;
    if (d.nominationPin && d.nominationLat === null && isShortPinHost(new URL(d.nominationPin).hostname)) {
      const c = await resolveShortPin(d.nominationPin);
      if (c && !inNigeria(c.lat, c.lng)) {
        return reply({ status: "invalid", errors: { nominationPin: "That pin is outside Nigeria." }, message: "Please fix the highlighted fields." }, 422);
      }
      if (c) { d.nominationLat = c.lat; d.nominationLng = c.lng; }
    }

    const mock = isMock();
    if (!mock && !process.env.IP_HASH_SECRET) throw new ConfigError("IP_HASH_SECRET not set");
    const ipHash = ip ? hashIp(ip, process.env.IP_HASH_SECRET || "dev-only-secret") : null;

    const outcome = await register(
      getDeps(),
      parsed.data,
      ipHash,
    );

    switch (outcome.kind) {
      case "created":
        return reply({
          status: "success",
          emailSent: outcome.emailSent,
          message: outcome.emailSent
            ? "Your application has been received. Check your inbox for a confirmation email."
            : "Your application has been received, but we couldn't send the confirmation email just now. Submit the form again with the same email address and we'll resend it. You won't be entered twice.",
        });
      case "resent":
        return reply({ status: "resent", message: "You've already applied, and we've now re-sent your confirmation email. Please check your inbox and spam folder." });
      case "resend_failed":
        return reply({ status: "error", message: "You've already applied, but we still couldn't send your confirmation email. Please try again later or contact support." }, 502);
      case "duplicate_email":
        return reply({ status: "duplicate_email", message: "This email address has already been registered for the promo." }, 409);
      case "ip_flagged":
        return reply({
          status: "ip_flagged",
          message: "Your details have been saved, but a registration from this network has already been recorded. To keep the campaign fair, only one entry per household or network is approved automatically, so our team will review yours manually. You won't get an automatic confirmation email.",
        }, 202);
      case "ip_blocked":
        return reply({
          status: "ip_blocked",
          message: "A registration from this network has already been recorded, and multiple entries from the same household or network are restricted. If you share a connection with someone who applied, contact support and we'll review it.",
        }, 409);
    }
  } catch (e) {
    const reason = (e as Error).message;
    console.error("[register]", reason);
    // Setup problems are only spelled out in development; production visitors get the generic message.
    const detail = process.env.NODE_ENV !== "production" ? reason : undefined;
    return reply({ status: "error", message: "Something went wrong on our side and your application was not completed. Please try again in a moment.", detail }, 503);
  }
}
