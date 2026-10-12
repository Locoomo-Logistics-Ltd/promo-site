import { coordsFromUrl } from "@/lib/validation";

const allowed = (h: string) => h === "maps.app.goo.gl" || h === "goo.gl" || /(^|\.)google\.[a-z.]{2,6}$/.test(h);

/**
 * Short Google Maps links (maps.app.goo.gl/...) hide the coordinates. Follow the redirects by hand,
 * only through Google hosts, to read them. Best effort: null means "couldn't tell", not "invalid".
 */
export async function resolveShortPin(link: string): Promise<{ lat: number; lng: number } | null> {
  try {
    let url = new URL(link);
    for (let hop = 0; hop < 5; hop++) {
      if (!allowed(url.hostname.replace(/^www\./, ""))) return null;
      const known = coordsFromUrl(url.href);
      if (known) return known;
      const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(4000), headers: { "User-Agent": "Mozilla/5.0 (compatible; LocoomoPromo/1.0)" } });
      const next = res.headers.get("location");
      if (!next || res.status < 300 || res.status > 399) return coordsFromUrl(url.href);
      url = new URL(next, url);
    }
  } catch {
    /* ignore */
  }
  return null;
}
