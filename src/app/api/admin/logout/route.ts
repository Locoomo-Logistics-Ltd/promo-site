import { NextResponse } from "next/server";
import { cookieHeader, sameOrigin } from "@/server/admin-auth";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": cookieHeader("", 0) } });
}
