import { createHmac } from "node:crypto";
import { isIP } from "node:net";

/**
 * Resolve the client IP from a header that YOUR hosting proxy sets/overwrites.
 * Never reads anything the browser can supply in the request body.
 * x-forwarded-for is read from the right, skipping TRUSTED_PROXY_HOPS-1 trusted proxies, so
 * entries a client prepends cannot spoof the result.
 */
export function clientIp(headers: Headers): string | null {
  const name = (process.env.TRUSTED_IP_HEADER || "").toLowerCase();
  if (!name) return process.env.NODE_ENV === "production" ? null : "127.0.0.1";
  const raw = headers.get(name);
  if (!raw) return null;
  let candidate: string;
  if (name === "x-forwarded-for") {
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
    candidate = parts[Math.max(0, parts.length - hops)] ?? "";
  } else {
    candidate = raw.split(",")[0].trim();
  }
  candidate = candidate.replace(/^\[|\]$/g, "").replace(/^(\d+\.\d+\.\d+\.\d+):\d+$/, "$1");
  return isIP(candidate) ? candidate.toLowerCase() : null;
}

/** IPv6 clients rotate within their /64, so match on the /64 prefix. */
export function ipFingerprint(ip: string): string {
  if (!ip.includes(":")) return ip;
  const [head, tail = ""] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = ip.includes("::") && tail ? tail.split(":") : [];
  const groups = ip.includes("::") ? [...h, ...Array(8 - h.length - t.length).fill("0"), ...t] : h;
  return groups.slice(0, 4).map((g) => g.padStart(4, "0")).join(":");
}

/** Keyed hash: lets us compare IPs without storing them in plaintext. */
export function hashIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(ipFingerprint(ip)).digest("hex").slice(0, 32);
}
