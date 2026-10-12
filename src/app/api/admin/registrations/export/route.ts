import { getAdmin } from "@/server/admin-auth";
import { getDeps } from "@/server/deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Spreadsheet apps run text starting with = + - @ as formulas; prefix a quote so user input can't.
const cell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  const me = await getAdmin(req);
  if (!me) return new Response("Unauthorized", { status: 401 });
  const rows = (await getDeps().store.list()).filter((r) => r.status !== "DUPLICATE_RACE");
  const cols = ["createdAt", "id", "status", "fullName", "email", "phone", "item", "price", "vendorName", "vendorPhone", "vendorSocial", "nomination", "nominationPin", "stationStatus", "stationEstablishedAt", "stationEmailStatus", "emailStatus"] as const;
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="locoomo-registrations.csv"', "Cache-Control": "no-store" } });
}
