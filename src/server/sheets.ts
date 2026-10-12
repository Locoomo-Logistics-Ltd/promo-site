import { createSign } from "node:crypto";
import { env } from "./config";
import type { RegistrationRecord, RegistrationStore, StoredRegistration } from "./types";

const COLUMNS = [
  "id", "createdAt", "status", "fullName", "email", "emailKey", "phone", "item", "price",
  "vendorName", "vendorPhone", "vendorSocial", "nomination", "ipHash", "emailStatus",
  "emailAttempts", "emailSentAt", "emailError", "reviewNote",
  "nominationPin", "nominationLat", "nominationLng",
  "stationStatus", "stationEstablishedAt", "stationEmailStatus",
] as const satisfies readonly (keyof RegistrationRecord)[];

const HEADERS = [
  "ID", "Created At", "Status", "Full Name", "Email", "Email Key", "Phone", "Requested Item", "Price (NGN)",
  "Vendor", "Vendor Phone", "Vendor Social", "Pickup Station Nomination", "IP Hash (HMAC)", "Email Status",
  "Email Attempts", "Email Sent At", "Email Error", "Review Note",
  "Pickup Station Pin", "Pickup Station Lat", "Pickup Station Lng",
  "Station Status", "Station Established At", "Station Email Status",
];

const LAST_COL = "Y"; // 25 columns
const API = "https://sheets.googleapis.com/v4/spreadsheets";

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

// Accepts the bare key, a key with literal "\\n" sequences, or the whole service-account JSON pasted in.
function pemKey(raw: string): string {
  const text = raw.replace(/\\n/g, "\n");
  const m = text.match(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/);
  if (!m) throw new Error("GOOGLE_PRIVATE_KEY does not contain a PEM private key");
  return m[0];
}

let token: { value: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (token && token.exp - 60_000 > Date.now()) return token.value;
  const rawKey = env("GOOGLE_PRIVATE_KEY");
  // If the whole service-account JSON was pasted, its client_email is authoritative (the key only works for that account).
  const email = rawKey.match(/"client_email"\s*:\s*"([^"]+)"/)?.[1] ?? env("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const key = pemKey(rawKey);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  )}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64url(sig)}`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string; error_description?: string };
    throw new Error(`Google sign-in failed (${res.status}): ${j.error ?? "unknown"}${j.error_description ? ` - ${j.error_description}` : ""}. Check GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY.`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return token.value;
}

async function call(path: string, init: RequestInit = {}, retries = 2): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}/${env("GOOGLE_SHEET_ID")}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return res.json();
    // 429 = rejected before processing, so retrying is safe even for appends.
    if (res.status === 429 && attempt < retries) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      continue;
    }
    if (res.status === 401) token = null;
    const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    const hint =
      res.status === 403 ? " Share the spreadsheet with the service account as Editor, and enable the Google Sheets API." :
      res.status === 404 ? " Check GOOGLE_SHEET_ID." :
      res.status === 400 ? " Check that the tab named in GOOGLE_SHEET_TAB exists." : "";
    throw new Error(`Google Sheets error ${res.status}: ${j.error?.message ?? "no details"}.${hint}`);
  }
}

export const sheetsCall = call;
const tab = () => process.env.GOOGLE_SHEET_TAB || "Registrations";
const range = (r: string) => encodeURIComponent(`'${tab()}'!${r}`);

let headerChecked = false;
async function ensureHeader() {
  if (headerChecked) return;
  const data = await call(`/values/${range(`A1:${LAST_COL}1`)}`);
  if (!data.values?.[0]?.length) {
    await call(`/values/${range(`A1:${LAST_COL}1`)}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [HEADERS] }),
    });
  }
  headerChecked = true;
}

const toRow = (r: RegistrationRecord) => COLUMNS.map((c) => r[c] ?? "");

function fromRow(row: string[], rowNumber: number): StoredRegistration {
  const g = (i: number) => row[i] ?? "";
  return {
    id: g(0), createdAt: g(1), status: g(2) as StoredRegistration["status"], fullName: g(3), email: g(4),
    emailKey: g(5), phone: g(6), item: g(7), price: Number(g(8)), vendorName: g(9), vendorPhone: g(10),
    vendorSocial: g(11), nomination: g(12), ipHash: g(13), emailStatus: (g(14) || "PENDING") as StoredRegistration["emailStatus"],
    emailAttempts: Number(g(15)) || 0, emailSentAt: g(16), emailError: g(17), reviewNote: g(18), nominationPin: g(19),
    nominationLat: g(20) === "" ? "" : Number(g(20)), nominationLng: g(21) === "" ? "" : Number(g(21)),
    stationStatus: g(22) as StoredRegistration["stationStatus"], stationEstablishedAt: g(23),
    stationEmailStatus: g(24) as StoredRegistration["stationEmailStatus"], rowNumber,
  };
}

export const sheetsStore: RegistrationStore = {
  async list() {
    await ensureHeader();
    const data = await call(`/values/${range(`A2:${LAST_COL}`)}?valueRenderOption=UNFORMATTED_VALUE`);
    return ((data.values ?? []) as unknown[][])
      .map((row, i) => fromRow(row.map((c) => String(c ?? "")), i + 2))
      .filter((r) => r.id);
  },

  async append(record) {
    await ensureHeader();
    const data = await call(
      `/values/${range(`A:${LAST_COL}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: "POST", body: JSON.stringify({ values: [toRow(record)] }) },
    );
    const m = /!A(\d+)/.exec(data.updates?.updatedRange ?? "");
    if (!m) throw new Error("Sheets append returned no row number");
    return Number(m[1]);
  },

  async update(rowNumber, patch) {
    const data = Object.entries(patch).map(([k, v]) => {
      const i = COLUMNS.indexOf(k as (typeof COLUMNS)[number]);
      const col = String.fromCharCode(65 + i);
      return { range: `'${tab()}'!${col}${rowNumber}`, values: [[v]] };
    });
    await call(`/values:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ valueInputOption: "RAW", data }),
    });
  },
};
