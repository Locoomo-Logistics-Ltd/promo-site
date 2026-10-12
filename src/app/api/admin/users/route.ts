import { NextResponse } from "next/server";
import { getAdmin, ownerEmail, publicSiteUrl, sameOrigin } from "@/server/admin-auth";
import { inviteAdmin, listAdmins } from "@/server/admin-users";
import { getDeps } from "@/server/deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await getAdmin(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ users: await listAdmins() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: "Couldn't read the team list.", detail: process.env.NODE_ENV !== "production" ? (e as Error).message : undefined }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const me = await getAdmin(req);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; name?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return NextResponse.json({ error: "Enter a valid email address." }, { status: 422 });
  if (email === ownerEmail()) return NextResponse.json({ error: "That's the owner account; it already has access." }, { status: 409 });
  const siteUrl = publicSiteUrl(req);
  if (!siteUrl) return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL must be set to send invite links." }, { status: 503 });
  try {
    const r = await inviteAdmin(getDeps().mailer, siteUrl, { email, name: typeof body.name === "string" ? body.name : "", invitedBy: me.email });
    if (r === "exists") return NextResponse.json({ error: "That person already has an active admin account." }, { status: 409 });
    if (r === "email_failed") return NextResponse.json({ error: "The invite was created but the email couldn't be sent. Press invite again to retry." }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin-invite]", (e as Error).message);
    return NextResponse.json({ error: "Couldn't create the invite.", detail: process.env.NODE_ENV !== "production" ? (e as Error).message : undefined }, { status: 503 });
  }
}
