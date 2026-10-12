import type { Mailer, RegistrationStore, StoredRegistration } from "./types";

/** In-memory stand-ins for local testing. Only reachable when MOCK_SERVICES=1 and NODE_ENV!=production. */
const g = globalThis as unknown as { __mockRows?: StoredRegistration[]; __mockMail?: { to: string; id: string }[] };
const rows = (g.__mockRows ??= []);
export const sentMail = (g.__mockMail ??= []);

export const mockStore: RegistrationStore = {
  async list() { return rows.map((r) => ({ ...r })); },
  async append(rec) { rows.push({ ...rec, rowNumber: rows.length + 2 }); return rows.length + 1; },
  async update(n, patch) { Object.assign(rows.find((r) => r.rowNumber === n)!, patch); },
};

export const adminMail = ((globalThis as unknown as { __mockAdminMail?: { to: string; kind: string; url: string }[] }).__mockAdminMail ??= []);

export const mockMailer: Mailer = {
  async sendAdminLink(to, _name, kind, url) {
    if (to.startsWith("failmail")) throw new Error("Resend 500: simulated failure");
    adminMail.push({ to, kind, url });
  },
  async sendConfirmation(r) {
    if (r.email.startsWith("failmail")) throw new Error("Resend 500: simulated failure");
    sentMail.push({ to: r.email, id: r.id });
  },
  async sendStationLive(r) {
    if (r.email.startsWith("failstation")) throw new Error("Resend 500: simulated failure");
    sentMail.push({ to: r.email, id: `station-${r.id}` });
  },
};
