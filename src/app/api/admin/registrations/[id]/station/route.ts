import { NextResponse } from "next/server";
import { getAdmin, sameOrigin } from "@/server/admin-auth";
import { getDeps } from "@/server/deps";
import { markStationEstablished } from "@/server/stations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getAdmin(req);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    const r = await markStationEstablished(getDeps(), id);
    const map = {
      notified: [200, "Station marked as established and the participant has been emailed."],
      in_progress: [409, "An email for this station is already being sent."],
      already_notified: [409, "This participant has already been told their station is live."],
      email_failed: [502, "Station marked as established, but the email failed. Press the button again to retry."],
      not_found: [404, "Registration not found."],
      no_station: [422, "This participant didn't nominate a Pickup Station."],
    } as const;
    const [status, message] = map[r.kind];
    return NextResponse.json({ result: r.kind, message, at: "at" in r ? r.at : undefined }, { status });
  } catch {
    return NextResponse.json({ error: "Couldn't update the sheet. Nothing was emailed." }, { status: 503 });
  }
}
