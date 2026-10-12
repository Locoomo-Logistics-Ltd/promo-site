import { createHmac, timingSafeEqual } from "node:crypto";
import { activeAdmin, sessionTag } from "./admin-users";
import { clientIp } from "./ip";

export const COOKIE = "locoomo_admin";
const TTL_MS = 8 * 60 * 60 * 1000;

export const adminConfigured = () =>
  Boolean((process.env.ADMIN_SESSION_SECRET || "").length >= 32);

const sign = (payload: string) => createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(payload).digest("base64url");

const isLoopback = (v: string) => /^(localhost|127(\.\d+){3}|::1|::ffff:127(\.\d+){3})$/i.test(v.trim().replace(/^\[|\]$/g, "").replace(/:\d+$/, (m, i, str) => (str.includes("::") || str.split(":").length > 2 ? m : "")));

/**
 * Inviting admins is only possible from the developer's own machine: the server must be running locally with
 * ALLOW_ADMIN_INVITE=1 (set it only in your local .env.local, never on the host), the request must be addressed
 * to localhost, and any forwarding headers (`next dev` adds its own) may only name loopback addresses.
 */
export function inviteAllowed(headers: Headers): boolean {
  if (process.env.ALLOW_ADMIN_INVITE !== "1") return false;
  if (!isLoopback(headers.get("host") ?? "")) return false;
  if (["x-real-ip", "x-vercel-forwarded-for", "cf-connecting-ip", "forwarded"].some((h) => headers.has(h))) return false;
  return ["x-forwarded-for", "x-forwarded-host"].every((h) => (headers.get(h) ?? "").split(",").filter(Boolean).every(isLoopback));
}

export interface AdminSession { email: string }

export function newSession(s: { email: string; passwordHash: string }): { value: string; maxAge: number } {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TTL_MS, sub: s.email, pv: sessionTag(s.passwordHash) })).toString("base64url");
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
    const p = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp: number; sub: string; pv: string };
    if (!(p.exp > Date.now()) || typeof p.sub !== "string") return null;
    return (await activeAdmin(p.sub, p.pv)) ? { email: p.sub } : null;
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
