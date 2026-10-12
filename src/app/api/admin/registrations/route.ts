import { NextResponse } from "next/server";
import { getAdmin } from "@/server/admin-auth";
import { getDeps } from "@/server/deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const me = await getAdmin(req);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = (await getDeps().store.list())
      .filter((r) => r.status !== "DUPLICATE_RACE")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      // The IP hash stays in the sheet; the dashboard never needs it.
      .map(({ ipHash: _ip, emailKey: _k, ...r }) => r);
    return NextResponse.json({ rows, me }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Couldn't read the registrations sheet." }, { status: 503 });
  }
}
