import { NextResponse } from "next/server";
import { adminConfigured, loginThrottle, sameOrigin } from "@/server/admin-auth";
import { setPassword } from "@/server/admin-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!adminConfigured()) return NextResponse.json({ error: "Admin access isn't configured." }, { status: 503 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const t = loginThrottle(req, "setpw", 10);
  if (t.blocked) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { token?: unknown; password?: unknown };
  if (typeof body.token !== "string" || typeof body.password !== "string" || body.token.length > 300) {
    return NextResponse.json({ error: "This link is invalid or has expired. Ask for a new one." }, { status: 400 });
  }
  try {
    const r = await setPassword(body.token, body.password);
    if (!r.ok) {
      if (r.reason === "invalid") t.fail();
      return NextResponse.json({ error: r.message, reason: r.reason }, { status: r.reason === "weak" ? 422 : 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin-setpw]", (e as Error).message);
    return NextResponse.json({ error: "Couldn't save your password. Try again.", detail: process.env.NODE_ENV !== "production" ? (e as Error).message : undefined }, { status: 503 });
  }
}
