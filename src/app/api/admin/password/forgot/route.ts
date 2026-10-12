import { NextResponse } from "next/server";
import { adminConfigured, loginThrottle, publicSiteUrl, sameOrigin } from "@/server/admin-auth";
import { requestReset } from "@/server/admin-users";
import { getDeps } from "@/server/deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!adminConfigured()) return NextResponse.json({ error: "Admin access isn't configured." }, { status: 503 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const t = loginThrottle(req, "forgot", 5);
  if (t.blocked) return NextResponse.json({ error: "Too many requests. Try again in 15 minutes." }, { status: 429 });
  t.fail();
  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const siteUrl = publicSiteUrl(req);
  if (typeof body.email === "string" && body.email.length < 255 && siteUrl) {
    try { await requestReset(getDeps().mailer, siteUrl, body.email); } catch (e) { console.error("[admin-forgot]", (e as Error).message); }
  }
  // Same answer whether or not the address belongs to an admin.
  return NextResponse.json({ ok: true, message: "If that email belongs to an admin, we've sent a link to reset the password." });
}
