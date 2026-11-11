import { randomUUID } from "node:crypto";
import { MAX_EMAIL_ATTEMPTS } from "./config";
import type { Mailer, RegistrationRecord, RegistrationStore, StoredRegistration } from "./types";
import { emailKey, type RegistrationInput } from "@/lib/validation";

export type Outcome =
  | { kind: "created"; id: string; emailSent: boolean }
  | { kind: "resent"; id: string;}
  
  | { kind: "resend_failed" }
  | { kind: "duplicate_email" };

const STALE_PENDING_MS = 2 * 60_000;

/** Single critical section per server instance. Cross-instance races are caught by verifyAfterWrite. */
let chain: Promise<unknown> = Promise.resolve();
export function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

const firstBy = (rows: StoredRegistration[], pred: (r: StoredRegistration) => boolean) =>
  rows.filter(pred).sort((a, b) => a.rowNumber - b.rowNumber)[0];

async function deliver(store: RegistrationStore, mailer: Mailer, rec: StoredRegistration): Promise<boolean> {
  const attempts = rec.emailAttempts + 1;
  try {
    await mailer.sendConfirmation(rec);
    await store.update(rec.rowNumber, {
      emailStatus: "SENT", emailAttempts: attempts, emailSentAt: new Date().toISOString(), emailError: "",
    });
    return true;
  } catch (e) {
    // A Sheets failure while recording status must not mask the send result.
    await store
      .update(rec.rowNumber, {
        emailStatus: "FAILED", emailAttempts: attempts, emailError: String((e as Error).message).slice(0, 200),
      })
      .catch(() => undefined);
    return false;
  }
}

export async function register(
  deps: { store: RegistrationStore; mailer: Mailer },
  input: RegistrationInput,
): Promise<Outcome> {
  const { store, mailer } = deps;
  const key = emailKey(input.email);

  // ---- Phase 1 (serialised): check existing registrations, then write. No email is sent here. ----
  const phase1 = await exclusive(async () => {
    const rows = await store.list();

    const sameEmail = firstBy(rows, (r) => r.emailKey === key && r.status !== "DUPLICATE_RACE");
    if (sameEmail) {
      // Retry path: the entry already exists, so never add a row. If its confirmation email never
      // went out, try that email again (bounded), otherwise report the duplicate.
      // A PENDING row younger than STALE_PENDING_MS is still being delivered by a concurrent request.
      const retryable =
        sameEmail.emailStatus === "FAILED" ||
        (sameEmail.emailStatus === "PENDING" && Date.now() - Date.parse(sameEmail.createdAt) > STALE_PENDING_MS);
      if (sameEmail.status === "ACCEPTED" && retryable && sameEmail.emailAttempts < MAX_EMAIL_ATTEMPTS) {
        return { kind: "retry_email" as const, rec: sameEmail };
      }
      return { kind: "duplicate_email" as const };
    }

    const rec: RegistrationRecord = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: "ACCEPTED",
      fullName: input.fullName,
      email: input.email,
      emailKey: key,
      phone: input.phone,
      item: input.item,
      price: input.price,
      itemLink: input.itemLink,
      vendorName: input.vendorName,
      vendorPhone: input.vendorPhone,
      vendorSocial: input.vendorSocial,
      nomination: input.nomination,
      nominationPin: input.nominationPin,
      nominationLat: input.nominationLat ?? "",
      nominationLng: input.nominationLng ?? "",
      ipHash: "",
      emailStatus: "PENDING",
      emailAttempts: 0,
      emailSentAt: "",
      emailError: "",
      stationStatus: "",
      stationEstablishedAt: "",
      stationEmailStatus: "",
      rewardAmount: "",
      reviewNote: "",
    };
    const rowNumber = await store.append(rec);

    // Verify after write: if another instance wrote the same email concurrently, the lower row wins.
    const after = await store.list();
    const winner = firstBy(after, (r) => r.emailKey === key && r.status !== "DUPLICATE_RACE");
    if (winner && winner.rowNumber !== rowNumber) {
      await store.update(rowNumber, { status: "DUPLICATE_RACE", emailStatus: "SKIPPED", reviewNote: "Concurrent duplicate email" });
      return { kind: "duplicate_email" as const };
    }
    return { kind: "created" as const, rec: { ...rec, rowNumber } as StoredRegistration };
  });


  // ---- Phase 2 (outside the lock): email only after the row is safely stored. ----
  switch (phase1.kind) {
    case "retry_email":
      return (await deliver(store, mailer, phase1.rec)) 
        ? { kind: "resent", id: phase1.rec.id } 
        : { kind: "resend_failed" };
    case "created":
      return { 
        kind: "created", 
        id: phase1.rec.id, 
        emailSent: await deliver(store, mailer, phase1.rec) 
      };
    default:
      return phase1;
  }
}
