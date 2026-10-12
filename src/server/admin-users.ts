import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { isMock } from "./config";
import { exclusive } from "./service";
import { sheetsCall } from "./sheets";
import type { Mailer } from "./types";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export type AdminStatus = "INVITED" | "ACTIVE" | "DISABLED";
export interface AdminUser {
  id: string; email: string; name: string; status: AdminStatus; passwordHash: string;
  tokenHash: string; tokenExpires: string; tokenPurpose: "" | "invite" | "reset";
  createdAt: string; invitedBy: string; lastLoginAt: string; rowNumber: number;
}
export interface AdminStore {
  list(): Promise<AdminUser[]>;
  append(u: Omit<AdminUser, "rowNumber">): Promise<void>;
  update(rowNumber: number, patch: Partial<AdminUser>): Promise<void>;
}

export const INVITE_TTL_MS = 72 * 3600_000;
export const RESET_TTL_MS = 3600_000;
export const MIN_PASSWORD = 10;

// ---------- stores ----------
const COLS = ["id", "email", "name", "status", "passwordHash", "tokenHash", "tokenExpires", "tokenPurpose", "createdAt", "invitedBy", "lastLoginAt"] as const;
const TAB = "Admins";
const rng = (r: string) => encodeURIComponent(`'${TAB}'!${r}`);
let tabReady = false;

async function ensureTab() {
  if (tabReady) return;
  const meta = await sheetsCall(`?fields=sheets.properties.title`);
  if (!(meta.sheets ?? []).some((s: { properties: { title: string } }) => s.properties.title === TAB)) {
    await sheetsCall(`:batchUpdate`, { method: "POST", body: JSON.stringify({ requests: [{ addSheet: { properties: { title: TAB } } }] }) });
  }
  const h = await sheetsCall(`/values/${rng("A1:K1")}`);
  if (!h.values?.[0]?.length) {
    await sheetsCall(`/values/${rng("A1:K1")}?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [COLS] }) });
  }
  tabReady = true;
}

const sheetsAdmins: AdminStore = {
  async list() {
    await ensureTab();
    const d = await sheetsCall(`/values/${rng("A2:K")}?valueRenderOption=UNFORMATTED_VALUE`);
    return ((d.values ?? []) as unknown[][]).map((row, i) => {
      const g = (n: number) => String(row[n] ?? "");
      return { id: g(0), email: g(1), name: g(2), status: g(3) as AdminStatus, passwordHash: g(4), tokenHash: g(5), tokenExpires: g(6), tokenPurpose: g(7) as AdminUser["tokenPurpose"], createdAt: g(8), invitedBy: g(9), lastLoginAt: g(10), rowNumber: i + 2 };
    }).filter((u) => u.id);
  },
  async append(u) {
    await ensureTab();
    await sheetsCall(`/values/${rng("A:K")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: "POST", body: JSON.stringify({ values: [COLS.map((c) => u[c])] }) });
  },
  async update(n, patch) {
    await sheetsCall(`/values:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ valueInputOption: "RAW", data: Object.entries(patch).map(([k, v]) => ({ range: `'${TAB}'!${String.fromCharCode(65 + COLS.indexOf(k as (typeof COLS)[number]))}${n}`, values: [[v]] })) }),
    });
  },
};

const mockRows = ((globalThis as unknown as { __mockAdmins?: AdminUser[] }).__mockAdmins ??= []);
const mockAdmins: AdminStore = {
  async list() { return mockRows.map((r) => ({ ...r })); },
  async append(u) { mockRows.push({ ...u, rowNumber: mockRows.length + 2 }); },
  async update(n, patch) { Object.assign(mockRows.find((r) => r.rowNumber === n)!, patch); },
};

const store = (): AdminStore => (isMock() ? mockAdmins : sheetsAdmins);

// Short cache so session checks don't hit Sheets on every request; cleared on any change here.
let cache: { at: number; rows: AdminUser[] } | null = null;
const listCached = async () => {
  if (cache && Date.now() - cache.at < 15_000) return cache.rows;
  const rows = await store().list();
  cache = { at: Date.now(), rows };
  return rows;
};
const write = async <T>(fn: () => Promise<T>) => { cache = null; try { return await fn(); } finally { cache = null; } };

// ---------- crypto ----------
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64")}$${(await scryptAsync(pw, salt, 64)).toString("base64")}`;
}
async function checkPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, s, h] = stored.split("$");
  const salt = Buffer.from(s ?? "AAAAAAAAAAAAAAAAAAAAAA==", "base64");
  const want = Buffer.from(h ?? "", "base64");
  const got = await scryptAsync(pw, salt, 64); // always computed, so unknown users cost the same time
  return alg === "scrypt" && want.length === got.length && timingSafeEqual(want, got);
}
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const normEmail = (e: string) => e.trim().toLowerCase();
export const sessionTag = (hash: string) => sha(hash).slice(0, 12);

function issueToken(id: string, purpose: "invite" | "reset") {
  const secret = randomBytes(32).toString("base64url");
  const ttl = purpose === "invite" ? INVITE_TTL_MS : RESET_TTL_MS;
  return { token: `${id}.${secret}`, patch: { tokenHash: sha(secret), tokenExpires: new Date(Date.now() + ttl).toISOString(), tokenPurpose: purpose } };
}

export function passwordProblem(pw: unknown, email = ""): string | null {
  if (typeof pw !== "string" || pw.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (pw.length > 128) return "Use 128 characters or fewer.";
  if (email && pw.toLowerCase() === email.toLowerCase()) return "Your password can't be your email address.";
  if (/^(.)\1+$/.test(pw)) return "Choose a less repetitive password.";
  return null;
}

const linkFor = (siteUrl: string, token: string) => `${siteUrl}/admin/set-password?token=${encodeURIComponent(token)}`;

// ---------- operations ----------
export async function inviteAdmin(mailer: Mailer, siteUrl: string, a: { email: string; name: string; invitedBy: string }) {
  const email = normEmail(a.email);
  const name = a.name.trim().slice(0, 80);
  type Out = { token: string; name: string } | "exists";
  const out: Out = await exclusive(() => write(async (): Promise<Out> => {
    const existing = (await store().list()).find((u) => u.email === email);
    if (existing?.status === "ACTIVE") return "exists";
    if (existing) { // re-invite (still INVITED, or previously DISABLED)
      const t = issueToken(existing.id, "invite");
      await store().update(existing.rowNumber, { ...t.patch, status: "INVITED", passwordHash: "", name: name || existing.name, invitedBy: a.invitedBy });
      return { token: t.token, name: name || existing.name };
    }
    const id = randomUUID();
    const t = issueToken(id, "invite");
    await store().append({ id, email, name, status: "INVITED", passwordHash: "", ...t.patch, createdAt: new Date().toISOString(), invitedBy: a.invitedBy, lastLoginAt: "" });
    return { token: t.token, name };
  }));
  if (out === "exists") return "exists" as const;
  try {
    await mailer.sendAdminLink(email, out.name, "invite", linkFor(siteUrl, out.token));
    return "invited" as const;
  } catch (e) {
    console.error("[admin-invite]", (e as Error).message);
    return "email_failed" as const;
  }
}

/** Never reveals whether the address belongs to an admin. */
export async function requestReset(mailer: Mailer, siteUrl: string, emailRaw: string) {
  const email = normEmail(emailRaw);
  const out = await exclusive(() => write(async () => {
    const u = (await store().list()).find((x) => x.email === email);
    if (!u || u.status === "DISABLED") return null;
    // Don't let anyone spam an inbox: at most one fresh link per minute.
    const ttl = u.tokenPurpose === "invite" ? INVITE_TTL_MS : RESET_TTL_MS;
    if (u.tokenExpires && Date.parse(u.tokenExpires) - ttl > Date.now() - 60_000) return null;
    const purpose = u.status === "INVITED" ? "invite" : "reset";
    const t = issueToken(u.id, purpose);
    await store().update(u.rowNumber, t.patch);
    return { token: t.token, name: u.name, purpose } as const;
  }));
  if (!out) return;
  try {
    await mailer.sendAdminLink(email, out.name, out.purpose, linkFor(siteUrl, out.token));
  } catch (e) {
    console.error("[admin-reset]", (e as Error).message);
  }
}

export async function setPassword(token: string, password: string): Promise<{ ok: true; email: string } | { ok: false; reason: "invalid" | "weak"; message: string }> {
  const dot = token.indexOf(".");
  const id = dot > 0 ? token.slice(0, dot) : "";
  const secret = dot > 0 ? token.slice(dot + 1) : "";
  const bad = { ok: false, reason: "invalid", message: "This link is invalid or has expired. Ask for a new one." } as const;
  if (!id || !secret) return bad;
  const hash = await hashPassword(password); // hashed up front so the lock stays short
  return exclusive(() => write(async () => {
    const u = (await store().list()).find((x) => x.id === id);
    if (!u || u.status === "DISABLED" || !u.tokenHash || Date.parse(u.tokenExpires) < Date.now()) return bad;
    const a = Buffer.from(sha(secret)), b = Buffer.from(u.tokenHash);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return bad;
    const problem = passwordProblem(password, u.email);
    if (problem) return { ok: false, reason: "weak", message: problem } as const;
    await store().update(u.rowNumber, { passwordHash: hash, status: "ACTIVE", tokenHash: "", tokenExpires: "", tokenPurpose: "" });
    return { ok: true, email: u.email } as const;
  }));
}

export async function verifyLogin(emailRaw: string, password: string): Promise<AdminUser | null> {
  const email = normEmail(emailRaw);
  const u = (await listCached()).find((x) => x.email === email);
  const ok = await checkPassword(password, u?.passwordHash ?? "");
  if (!u || u.status !== "ACTIVE" || !ok) return null;
  return u;
}

export async function activeAdmin(email: string, tag: string): Promise<AdminUser | null> {
  const u = (await listCached()).find((x) => x.email === email);
  return u && u.status === "ACTIVE" && sessionTag(u.passwordHash) === tag ? u : null;
}

export async function listAdmins() {
  cache = null;
  return (await listCached()).map(({ id, email, name, status, createdAt, invitedBy, lastLoginAt }) => ({ id, email, name, status, createdAt, invitedBy, lastLoginAt }));
}

export async function disableAdmin(id: string) {
  return exclusive(() => write(async () => {
    const u = (await store().list()).find((x) => x.id === id);
    if (!u) return false;
    await store().update(u.rowNumber, { status: "DISABLED", tokenHash: "", tokenExpires: "", tokenPurpose: "" });
    return true;
  }));
}
