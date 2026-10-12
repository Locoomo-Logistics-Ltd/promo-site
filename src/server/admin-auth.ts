import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { activeAdmin, sessionTag } from "./admin-users";
import { clientIp } from "./ip";

export const COOKIE = "locoomo_admin";
const TTL_MS = 8 * 60 * 60 * 1000;

export const adminConfigured = () =>
  Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_OWNER_EMAIL && (process.env.ADMIN_SESSION_SECRET || "").length >= 32);
export const ownerEmail = () => (process.env.ADMIN_OWNER_EMAIL ?? "").trim().toLowerCase();

const digest = (s: string) => createHash("sha256").update(s).digest();
const sign = (payload: string) => createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(payload).digest("base64url");

/** The bootstrap owner signs in with ADMIN_OWNER_EMAIL + ADMIN_PASSWORD (both from env). */
export function ownerLoginOk(email: string, candidate: string): boolean {
  const passOk = timingSafeEqual(digest(candidate), digest(process.env.ADMIN_PASSWORD ?? ""));
  return email.trim().toLowerCase() === ownerEmail() && passOk;
}

export interface AdminSession { email: string; owner: boolean }

export function newSession(s: { email: string; owner: boolean; passwordHash?: string }): { value: string; maxAge: number } {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TTL_MS, sub: s.email, o: s.owner, pv: s.owner ? "" : sessionTag(s.passwordHash ?? "") })).toString("base64url");
  return { value: `${payload}.${sign(payload)}`, maxAge: TTL_MS / 1000 };
}

function cookieValue(req: Request): string | null {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(req.headers.get("cookie") ?? "");
  return m ? m[1] : null;
}

/** Valid cookie AND the account is still active with the same password (disabling or resetting ends old sessions). */
export async function getAdmin(req: Request): Promise<AdminSession | null> {
  if (!adminConfigured()) return null;
  const v = cookieValue(req);
  if (!v) return null;
  const [payload, sig] = v.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp: number; sub: string; o: boolean; pv: string };
    if (!(p.exp > Date.now()) || typeof p.sub !== "string") return null;
    if (p.o) return p.sub === ownerEmail() ? { email: p.sub, owner: true } : null;
    return (await activeAdmin(p.sub, p.pv)) ? { email: p.sub, owner: false } : null;
  } catch {
    return null;
  }
}

/** State-changing admin calls must come from our own origin (defence in depth on top of SameSite=Strict). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export const cookieHeader = (value: string, maxAge: number) =>
  `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

const fails = new Map<string, number[]>();
export function loginThrottle(req: Request, scope = "login", max = 5) {
  const key = `${scope}:${clientIp(req.headers) ?? "unknown"}`;
  const now = Date.now();
  const recent = (fails.get(key) ?? []).filter((t) => now - t < 15 * 60_000);
  fails.set(key, recent);
  return { blocked: recent.length >= max, fail: () => void fails.set(key, [...recent, now]), clear: () => void fails.delete(key) };
}

/** Public site URL for links in emails. Never derived from request headers in production (host-header poisoning). */
export function publicSiteUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  return process.env.NODE_ENV === "production" ? "" : new URL(req.url).origin;
}
