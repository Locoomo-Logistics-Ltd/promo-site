import { NextResponse } from "next/server";
import { adminConfigured, cookieHeader, loginThrottle, newSession, sameOrigin } from "@/server/admin-auth";
import { verifyLogin } from "@/server/admin-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!adminConfigured()) return NextResponse.json({ error: "Admin access isn't configured (set ADMIN_SESSION_SECRET)." }, { status: 503 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const t = loginThrottle(req);
  if (t.blocked) return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
  if (typeof body.email !== "string" || typeof body.password !== "string" || body.password.length > 256) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  try {
    const u = await verifyLogin(body.email, body.password);
    const session = u ? newSession({ email: u.email, passwordHash: u.passwordHash }) : null;
    if (!session) {
      t.fail();
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }
    t.clear();
    return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": cookieHeader(session.value, session.maxAge) } });
  } catch (e) {
    console.error("[admin-login]", (e as Error).message);
    return NextResponse.json({ error: "Couldn't check your account right now. Try again.", detail: process.env.NODE_ENV !== "production" ? (e as Error).message : undefined }, { status: 503 });
  }
}
