import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { env } from "./config";
import type { Mailer, RegistrationRecord } from "./types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
// The logo is sent as an inline attachment (cid:) so it shows even when the site URL isn't publicly reachable
// (localhost, previews) and in clients that block remote images. Falls back to the hosted file if it can't be read.
const LOGO_CID = "locoomo-logo";
let logoB64: string | null | undefined;
const logo = () => {
  if (logoB64 === undefined) {
    try { logoB64 = readFileSync(join(process.cwd(), "public", "logo-email.png")).toString("base64"); } catch { logoB64 = null; }
  }
  return logoB64;
};
const logoSrc = (siteUrl: string) => (logo() ? `cid:${LOGO_CID}` : `${siteUrl}/logo-email.png`);

/** Brand header: white band with the full-colour logo, then the navy headline block and candy-stripe rule. */
export function head(siteUrl: string, headline: string, kicker = "CHRISTMAS SHOPPING FUND") {
  return `<tr><td style="background:#ffffff;padding:22px 32px;border-top:5px solid #006CDF">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td><img src="${logoSrc(siteUrl)}" width="42" height="51" alt="Locoomo" style="display:block;border:0"></td>
        <td style="padding-left:12px;font:800 22px Arial,sans-serif;letter-spacing:1px;color:#000E2E">LOCOOMO</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#000E2E;padding:26px 32px 28px">
      <div style="font:700 26px/1.25 Arial,sans-serif;color:#fff">${headline}</div>
      <div style="margin-top:8px;font:700 12px Arial,sans-serif;color:#F2B84B;letter-spacing:1.2px">${kicker}</div>
    </td></tr>`;
}

export async function postEmail(o: { to: string; subject: string; html: string; text: string; key: string; replyTo?: string }) {
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info@locoomo.com";
  const l = logo();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      // Same key on every retry: Resend de-duplicates, so a timeout that actually delivered can't send twice.
      "Idempotency-Key": o.key,
    },
    body: JSON.stringify({
      from: env("EMAIL_FROM"),
      to: [o.to],
      reply_to: o.replyTo ?? (process.env.EMAIL_REPLY_TO || support),
      subject: o.subject,
      html: o.html,
      text: o.text,
      ...(l ? { attachments: [{ filename: "locoomo-logo.png", content: l, content_type: "image/png", content_id: LOGO_CID }] } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 160)}`);
  }
}

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

export function confirmationEmail(r: RegistrationRecord, siteUrl: string, support: string) {
  const first = esc(r.fullName.split(" ")[0]);
  const step = (n: number, title: string, body: string) => `
    <tr><td style="padding:0 0 14px 0">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td valign="top" style="width:34px"><div style="width:26px;height:26px;border-radius:13px;background:#006CDF;color:#fff;font:700 13px/26px Arial,sans-serif;text-align:center">${n}</div></td>
        <td style="font:15px/1.5 Arial,sans-serif;color:#3a5075"><strong style="color:#000E2E">${title}</strong><br>${body}</td>
      </tr></table>
    </td></tr>`;
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;font:13px Arial,sans-serif;color:#7a8fa8;width:110px">${k}</td><td style="padding:6px 0;font:14px Arial,sans-serif;color:#000E2E;font-weight:600">${esc(v)}</td></tr>`;

  const html = `<!doctype html><html><body style="margin:0;background:#eef3fb;padding:24px 12px">
  <div style="display:none;max-height:0;overflow:hidden">We've got your application. Please don't buy anything until we approve your slot.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
    ${head(siteUrl, `We've got your application, ${first}.`)}
    <tr><td style="height:4px;background:linear-gradient(90deg,#C8102E,#F2B84B,#1F7A4D)"></td></tr>
    <tr><td style="padding:28px 32px 8px">
      <p style="margin:0 0 18px;font:15px/1.6 Arial,sans-serif;color:#3a5075">Thanks for applying. Your entry has been received. It does <strong>not</strong> mean you've been selected yet. Slots are limited and your Pickup Station has to be activated first.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fc;border-radius:12px;padding:12px 18px;margin-bottom:22px">
        ${row("Item", r.item)}${row("Price", naira(r.price))}${row("Vendor", r.vendorName)}${r.nomination || r.nominationPin ? row("Pickup Station", r.nomination || "Location pin received") : ""}${row("Reference", r.id.slice(0, 8).toUpperCase())}
      </table>
      <div style="font:700 17px Arial,sans-serif;color:#000E2E;margin-bottom:14px">What happens next</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${step(1, "We review your application", "We check your details and your vendor.")}
        ${step(2, "We look at your Pickup Station", "We speak with the business you nominated and see whether it can become a Locoomo Pickup Station.")}
        ${step(3, "We approve your slot", "If your station goes live and a slot is available, we'll email you: &ldquo;You're approved. Go shopping.&rdquo;")}
        ${step(4, "You shop, we move it", "Your vendor prepares the order and Locoomo delivers it to your Pickup Station for free.")}
      </table>
      <div style="margin:8px 0 22px;padding:14px 16px;border-radius:12px;background:#FFF6E0;border:1px solid #F2D58A;font:14px/1.55 Arial,sans-serif;color:#5a4300">
        <strong>The most important rule:</strong> please don't buy anything until Locoomo approves your shopping slot. Purchases made before approval may not qualify for funding.
      </div>
      <p style="margin:0 0 24px;font:14px/1.6 Arial,sans-serif;color:#3a5075">Need to change something, or think this was a mistake? Reply to this email or write to <a href="mailto:${support}" style="color:#006CDF">${support}</a> and quote your reference.</p>
    </td></tr>
    <tr><td style="background:#f4f7fc;padding:18px 32px;font:12px/1.6 Arial,sans-serif;color:#7a8fa8">
      You're receiving this because this email address was used to apply to the Locoomo Christmas Shopping Fund. We use your details, including a protected record of your network address, only to verify applications and prevent duplicate entries. <a href="${siteUrl}/privacy" style="color:#006CDF">Privacy notice</a>
    </td></tr>
  </table></td></tr></table></body></html>`;

  const text = `We've got your application, ${r.fullName.split(" ")[0]}.

Your entry to the Locoomo Christmas Shopping Fund has been received. It does not mean you've been selected yet.

Item: ${r.item}
Price: ${naira(r.price)}
Vendor: ${r.vendorName}
Reference: ${r.id.slice(0, 8).toUpperCase()}

What happens next:
1. We review your application.
2. We speak with the business you nominated about becoming a Locoomo Pickup Station.
3. If your station goes live and a slot is available, we'll email you: "You're approved. Go shopping."
4. You shop, and we deliver to your Pickup Station for free.

IMPORTANT: Please don't buy anything until Locoomo approves your shopping slot.

Questions or think this was a mistake? Reply to this email or write to ${support}.

Privacy notice: ${siteUrl}/privacy`;

  return { subject: "We've received your Locoomo Christmas Shopping Fund application", html, text };
}

export function stationLiveEmail(r: RegistrationRecord, siteUrl: string, support: string) {
  const first = esc(r.fullName.split(" ")[0]);
  const shop = esc(r.nomination || "the shop you nominated");
  const map = /^https:\/\//.test(r.nominationPin) ? esc(r.nominationPin) : "";
  const html = `<!doctype html><html><body style="margin:0;background:#eef3fb;padding:24px 12px">
  <div style="display:none;max-height:0;overflow:hidden">Your nominated Pickup Station is live.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
    ${head(siteUrl, `Great news, ${first}. Your Pickup Station is live.`)}
    <tr><td style="height:4px;background:linear-gradient(90deg,#C8102E,#F2B84B,#1F7A4D)"></td></tr>
    <tr><td style="padding:28px 32px 8px">
      <p style="margin:0 0 18px;font:15px/1.6 Arial,sans-serif;color:#3a5075">The Pickup Station you nominated, <strong style="color:#000E2E">${shop}</strong>, is now a Locoomo Pickup Station. Thank you for helping us bring one to your neighbourhood.</p>
      ${map ? `<p style="margin:0 0 22px"><a href="${map}" style="display:inline-block;background:#006CDF;color:#fff;font:700 14px Arial,sans-serif;text-decoration:none;padding:12px 22px;border-radius:999px">View the Pickup Station on the map</a></p>` : ""}
      <div style="font:700 17px Arial,sans-serif;color:#000E2E;margin-bottom:10px">What this means for you</div>
      <p style="margin:0 0 14px;font:15px/1.6 Arial,sans-serif;color:#3a5075">This is where your package will be delivered, and where you'll go to collect it. When your package arrives, we'll email you that it's ready, and you'll verify your collection at the station.</p>
      <div style="margin:8px 0 22px;padding:14px 16px;border-radius:12px;background:#FFF6E0;border:1px solid #F2D58A;font:14px/1.55 Arial,sans-serif;color:#5a4300">
        <strong>Still the most important rule:</strong> please don't buy anything until we confirm your shopping slot. We'll tell you: &ldquo;You're approved. Go shopping.&rdquo;
      </div>
      <p style="margin:0 0 24px;font:14px/1.6 Arial,sans-serif;color:#3a5075">Questions? Reply to this email or write to <a href="mailto:${support}" style="color:#006CDF">${support}</a> and quote your reference: <strong>${r.id.slice(0, 8).toUpperCase()}</strong>.</p>
    </td></tr>
    <tr><td style="background:#f4f7fc;padding:18px 32px;font:12px/1.6 Arial,sans-serif;color:#7a8fa8">You're receiving this because you nominated a Pickup Station in the Locoomo Christmas Shopping Fund. <a href="${siteUrl}/privacy" style="color:#006CDF">Privacy notice</a></td></tr>
  </table></td></tr></table></body></html>`;
  const text = `Great news, ${r.fullName.split(" ")[0]}. Your Pickup Station is live.

The Pickup Station you nominated, ${r.nomination || "the shop you nominated"}, is now a Locoomo Pickup Station.
${map ? `Map: ${r.nominationPin}\n` : ""}
This is where your package will be delivered and where you'll collect it. We'll email you when your package is ready.

Still the most important rule: please don't buy anything until we confirm your shopping slot ("You're approved. Go shopping.").

Reference: ${r.id.slice(0, 8).toUpperCase()}. Questions: ${support}`;
  return { subject: "Your Locoomo Pickup Station is live", html, text };
}

const urls = () => ({
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  support: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info@locoomo.com",
});

async function send(r: RegistrationRecord, key: string, build: typeof confirmationEmail) {
  const { siteUrl, support } = urls();
  await postEmail({ to: r.email, key, ...build(r, siteUrl, support) });
}

export function adminLinkEmail(kind: "invite" | "reset", name: string, url: string, siteUrl: string) {
  const invite = kind === "invite";
  const first = esc(name.split(" ")[0] || "there");
  const hours = invite ? 72 : 1;
  const expiry = invite ? "72 hours" : "1 hour";
  const html = `<!doctype html><html><body style="margin:0;background:#eef3fb;padding:24px 12px">
  <div style="display:none;max-height:0;overflow:hidden">${invite ? "You've been invited to the Locoomo promo admin." : "Reset your Locoomo admin password."}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
    ${head(siteUrl, invite ? `You're invited, ${first}.` : "Reset your password", "PROMO ADMIN")}
    <tr><td style="height:4px;background:linear-gradient(90deg,#C8102E,#F2B84B,#1F7A4D)"></td></tr>
    <tr><td style="padding:28px 32px 12px">
      <p style="margin:0 0 20px;font:15px/1.6 Arial,sans-serif;color:#3a5075">${invite
        ? "You've been invited to manage the Locoomo Christmas Shopping Fund. Choose a password to activate your admin account."
        : "We received a request to reset the password for your Locoomo promo admin account. Choose a new one below."}</p>
      <p style="margin:0 0 22px"><a href="${esc(url)}" style="display:inline-block;background:#006CDF;color:#fff;font:700 15px Arial,sans-serif;text-decoration:none;padding:14px 28px;border-radius:999px">${invite ? "Set your password" : "Choose a new password"}</a></p>
      <p style="margin:0 0 8px;font:13px/1.6 Arial,sans-serif;color:#5d7391">This link works once and expires in ${expiry}. If the button doesn't work, paste this address into your browser:</p>
      <p style="margin:0 0 22px;font:12px/1.5 Arial,sans-serif;color:#006CDF;word-break:break-all">${esc(url)}</p>
      <div style="margin:0 0 24px;padding:14px 16px;border-radius:12px;background:#FFF6E0;border:1px solid #F2D58A;font:13px/1.55 Arial,sans-serif;color:#5a4300">
        ${invite ? "If you weren't expecting this invitation, you can safely ignore this email." : "If you didn't ask for this, ignore this email. Your password stays the same."}
      </div>
    </td></tr>
    <tr><td style="background:#f4f7fc;padding:18px 32px;font:12px/1.6 Arial,sans-serif;color:#7a8fa8">Locoomo Christmas Shopping Fund admin. Never share this link with anyone.</td></tr>
  </table></td></tr></table></body></html>`;
  const text = `${invite ? `You're invited, ${name.split(" ")[0] || "there"}.\n\nYou've been invited to manage the Locoomo Christmas Shopping Fund. Set your password to activate your admin account:` : "Reset your Locoomo promo admin password:"}

${url}

This link works once and expires in ${hours === 1 ? "1 hour" : expiry}. ${invite ? "If you weren't expecting this, ignore this email." : "If you didn't ask for this, ignore this email."}`;
  return { subject: invite ? "You're invited to the Locoomo promo admin" : "Reset your Locoomo admin password", html, text };
}

export const resendMailer: Mailer = {
  sendConfirmation: (r) => send(r, `confirm-${r.id}`, confirmationEmail),
  sendStationLive: (r) => send(r, `station-${r.id}`, stationLiveEmail),
  async sendAdminLink(to, name, kind, url) {
    const { siteUrl } = urls();
    await postEmail({ to, key: `admin-${kind}-${createHash("sha256").update(url).digest("hex").slice(0, 24)}`, ...adminLinkEmail(kind, name, url, siteUrl) });
  },
};
