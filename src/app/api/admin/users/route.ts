import { NextResponse } from "next/server";
import { getAdmin } from "@/server/admin-auth";
import { listAdmins } from "@/server/admin-users";

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
