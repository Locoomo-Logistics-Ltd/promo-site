import { NextResponse } from "next/server";
import { getAdmin, sameOrigin } from "@/server/admin-auth";
import { disableAdmin, listAdmins } from "@/server/admin-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getAdmin(req);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const target = (await listAdmins()).find((u) => u.id === id);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.email === me.email) return NextResponse.json({ error: "You can't remove your own access." }, { status: 409 });
  try {
    await disableAdmin(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Couldn't update that account.", detail: process.env.NODE_ENV !== "production" ? (e as Error).message : undefined }, { status: 503 });
  }
}
