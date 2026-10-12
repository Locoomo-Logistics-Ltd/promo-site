import { z } from "zod";

export const MAX_PRICE = 50000;

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
const text = (label: string, min: number, max: number) =>
  z
    .string({ error: `${label} is required.` })
    .transform(collapse)
    .pipe(
      z
        .string()
        .min(min, `${label} is required.`)
        .max(max, `${label} is too long (max ${max} characters).`),
    );

/** Nigerian mobile numbers: 0XXXXXXXXXX, 234XXXXXXXXXX or +234XXXXXXXXXX. Returns E.164 or null. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-().]/g, "");
  const m = /^(?:\+?234|0)([789][01]\d{8})$/.exec(digits);
  return m ? `+234${m[1]}` : null;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Accepts @handle, a bare handle, or a profile URL for common platforms. Returns a normalized value or null. */
export function normalizeSocial(raw: string): string | null {
  const v = collapse(raw);
  if (!v) return null;
  const handle = /^@?([A-Za-z0-9._]{1,30})$/.exec(v);
  if (handle) return `@${handle[1]}`;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const ok = ["instagram.com", "tiktok.com", "facebook.com", "x.com", "twitter.com", "wa.me", "linktr.ee", "snapchat.com"];
    if (ok.some((d) => host === d || host.endsWith(`.${d}`)) && url.pathname.length > 1) {
      return `${host}${url.pathname.replace(/\/$/, "")}`;
    }
  } catch {
    /* fall through */
  }
  return null;
}

const priceField = z
  .union([z.string(), z.number()], { error: "Enter the item price." })
  .transform((v, ctx) => {
    const s = typeof v === "number" ? String(v) : v.replace(/[₦,\s]/g, "");
    if (s === "" || !/^\d+(\.\d{1,2})?$/.test(s)) {
      ctx.addIssue({ code: "custom", message: "Enter the price as a number, e.g. 12500." });
      return z.NEVER;
    }
    return Number(s);
  })
  .pipe(
    z
      .number()
      .gt(0, "Price must be greater than ₦0.")
      .max(MAX_PRICE, "Price can't be more than ₦50,000."),
  );

export const registrationSchema = z.object({
  fullName: text("Full name", 3, 80).refine((v) => v.includes(" "), "Please enter your first and last name."),
  email: z
    .string({ error: "Email address is required." })
    .transform((v) => normalizeEmail(v))
    .pipe(z.string().max(254, "Email is too long.").email("Enter a valid email address.")),
  phone: z
    .string({ error: "Phone number is required." })
    .transform((v) => normalizePhone(v) as string)
    .refine((v) => v !== null, "Enter a valid Nigerian phone number, e.g. 0803 123 4567."),
  item: text("Requested item", 2, 120),
  price: priceField,
  vendorName: text("Vendor name", 2, 80),
  vendorPhone: z
    .string()
    .optional()
    .default("")
    .transform((v) => v.trim())
    .transform((v) => (v === "" ? "" : normalizePhone(v)))
    .refine((v) => v !== null, "Enter a valid vendor phone number or leave it blank.")
    .transform((v) => v as string),
  vendorSocial: z
    .string({ error: "Vendor Instagram or social account is required." })
    .transform((v, ctx) => {
      const n = normalizeSocial(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "Enter an Instagram handle (e.g. @vendorname) or a profile link." });
        return z.NEVER;
      }
      return n;
    }),
  nomination: z
    .string()
    .optional()
    .default("")
    .transform(collapse)
    .pipe(z.string().max(120, "Keep the shop name under 120 characters.")),
  /** A location pin: a Google/Apple/OpenStreetMap link, or plain "lat, lng" coordinates. Anything else is rejected. */
  nominationPin: z
    .string()
    .optional()
    .default("")
    .transform((v) => v.trim())
    .superRefine((v, ctx) => {
      // Field-level so the message appears even while other fields are still invalid.
      const pin = v ? parsePin(v) : null;
      if (pin && !pin.ok) ctx.addIssue({ code: "custom", message: pin.error });
    }),
  consent: z.literal(true, { error: "Please accept the privacy notice to continue." }),
  /** Honeypot: real users never fill this in. */
  website: z.string().optional().default(""),
}).superRefine((v, ctx) => {
  if (!v.nominationPin && v.nomination) {
    ctx.addIssue({ code: "custom", path: ["nominationPin"], message: "Paste the shop's location pin so we can find it." });
  }
}).transform((v) => {
  const pin = v.nominationPin ? parsePin(v.nominationPin) : null;
  return {
    ...v,
    nominationPin: pin?.ok ? pin.link : "",
    nominationLat: pin?.ok ? pin.lat : null,
    nominationLng: pin?.ok ? pin.lng : null,
  };
});

export type RegistrationInput = z.output<typeof registrationSchema>;
export type FieldErrors = Partial<Record<keyof RegistrationInput, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out as FieldErrors;
}

export type ApiResult =
  | { status: "success"; emailSent: boolean; message: string }
  | { status: "resent"; message: string }
  | { status: "duplicate_email"; message: string }
  | { status: "ip_flagged"; message: string }
  | { status: "ip_blocked"; message: string }
  | { status: "invalid"; errors: FieldErrors; message: string }
  | { status: "rate_limited"; message: string }
  | { status: "error"; message: string; detail?: string };

/** Canonical key for duplicate detection: ignores case, +tags, and (for Gmail) dots. */
export function emailKey(email: string): string {
  const [local = "", domain = ""] = normalizeEmail(email).split("@");
  const d = domain === "googlemail.com" ? "gmail.com" : domain;
  let l = local.split("+")[0];
  if (d === "gmail.com") l = l.replace(/\./g, "");
  return `${l}@${d}`;
}

// ---- Location pins ----------------------------------------------------------------------------------

export type PinResult =
  | { ok: true; link: string; lat: number | null; lng: number | null }
  | { ok: false; error: string };

const NG = { lat: [4, 14], lng: [2.6, 14.8] } as const;
export const inNigeria = (lat: number, lng: number) =>
  lat >= NG.lat[0] && lat <= NG.lat[1] && lng >= NG.lng[0] && lng <= NG.lng[1];

/** Pull coordinates out of an expanded map URL, if it carries any. */
export function coordsFromUrl(u: string): { lat: number; lng: number } | null {
  const n = "(-?\\d{1,3}\\.\\d+)";
  const patterns = [
    new RegExp(`!3d${n}!4d${n}`),
    new RegExp(`@${n},${n}`),
    new RegExp(`[?&](?:q|ll|query|destination|center|mlat)=${n}(?:,|%2C|&mlon=)${n}`, "i"),
    new RegExp(`#map=\\d+/${n}/${n}`),
  ];
  for (const re of patterns) {
    const m = re.exec(u);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  }
  return null;
}

const SHORT_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);
export const isShortPinHost = (host: string) => SHORT_HOSTS.has(host);
const isGoogleHost = (h: string) => /(^|\.)google\.[a-z.]{2,6}$/.test(h);

const bad = "That doesn't look like a location pin. In Google Maps, open the shop, tap Share, copy the link and paste it here.";

export function parsePin(raw: string): PinResult {
  const v = raw.trim();
  const coords = /^\(?\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?$/.exec(v);
  if (coords) {
    const lat = Number(coords[1]), lng = Number(coords[2]);
    if (!inNigeria(lat, lng)) return { ok: false, error: "That pin is outside Nigeria." };
    return { ok: true, link: `https://www.google.com/maps?q=${lat},${lng}`, lat, lng };
  }
  if (/\s/.test(v) || v.length > 500 || !v.includes(".")) return { ok: false, error: bad };
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`); } catch { return { ok: false, error: bad }; }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, error: bad };
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname;
  const link = url.href;

  if (host === "maps.app.goo.gl" || (host === "goo.gl" && path.startsWith("/maps")))
    return path.length > 2 ? { ok: true, link, lat: null, lng: null } : { ok: false, error: bad };

  const known = coordsFromUrl(url.href);
  const isGoogleMap = isGoogleHost(host) && (host.startsWith("maps.") || path.startsWith("/maps"));
  const isApple = host === "maps.apple.com";
  const isOsm = host.endsWith("openstreetmap.org");
  if (!isGoogleMap && !isApple && !isOsm) return { ok: false, error: bad };

  if (known) {
    if (!inNigeria(known.lat, known.lng)) return { ok: false, error: "That pin is outside Nigeria." };
    return { ok: true, link, ...known };
  }
  // A named place with no coordinates in the URL is still a pin; a bare maps homepage is not.
  const namedPlace = /\/maps\/place\//.test(path) || /[?&](cid|place_id|q)=/.test(url.search) || isApple && /[?&](address|auid|place-id)=/.test(url.search);
  return namedPlace ? { ok: true, link, lat: null, lng: null } : { ok: false, error: bad };
}
