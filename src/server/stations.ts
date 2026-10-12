import { exclusive } from "./service";
import type { Mailer, RegistrationStore } from "./types";

export type StationOutcome =
  | { kind: "notified"; at: string }
  | { kind: "already_notified" }
  | { kind: "in_progress" }
  | { kind: "email_failed"; at: string }
  | { kind: "not_found" }
  | { kind: "no_station" };

/**
 * Admin marks the nominated station as established and the nominator is emailed.
 * Idempotent: an already-notified entry is never emailed twice; a failed email can be retried and the
 * station stays marked established in the meantime.
 */
export async function markStationEstablished(deps: { store: RegistrationStore; mailer: Mailer }, id: string): Promise<StationOutcome> {
  const { store, mailer } = deps;
  const claim = await exclusive(async () => {
    const rec = (await store.list()).find((r) => r.id === id);
    if (!rec || rec.status === "DUPLICATE_RACE") return { kind: "not_found" as const };
    if (!rec.nomination && !rec.nominationPin) return { kind: "no_station" as const };
    if (rec.stationStatus === "ESTABLISHED" && rec.stationEmailStatus === "SENT") return { kind: "already_notified" as const };
    // PENDING means another click is mid-send; only treat it as abandoned after two minutes.
    if (rec.stationEmailStatus === "PENDING" && Date.now() - Date.parse(rec.stationEstablishedAt) < 2 * 60_000) return { kind: "in_progress" as const };
    const at = new Date().toISOString();
    await store.update(rec.rowNumber, { stationStatus: "ESTABLISHED", stationEstablishedAt: at, stationEmailStatus: "PENDING" });
    return { kind: "go" as const, rec: { ...rec, stationStatus: "ESTABLISHED" as const, stationEstablishedAt: at }, at };
  });
  if (claim.kind !== "go") return claim;

  try {
    await mailer.sendStationLive(claim.rec);
    await store.update(claim.rec.rowNumber, { stationEmailStatus: "SENT" });
    return { kind: "notified", at: claim.at };
  } catch {
    await store.update(claim.rec.rowNumber, { stationEmailStatus: "FAILED" }).catch(() => undefined);
    return { kind: "email_failed", at: claim.at };
  }
}
