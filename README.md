# Locoomo Christmas Shopping Fund: promo site

Next.js (App Router) + Tailwind 4 + Motion + `lucide-react`. Registrations go to Google Sheets; confirmation emails go out through Resend. Everything privileged runs in `src/app/api/register` and `src/server`; no secret is ever sent to the browser.

## Setup
1. `npm install`, then copy `.env.example` to `.env.local` and fill it in.
2. **Google Sheet**: create a Google Cloud service account, enable the Sheets API, and share a new spreadsheet with the service-account email as *Editor*. Put its ID, the account email and private key in `.env.local`. The header row is written automatically on first use. Tab name defaults to `Registrations`.
3. **Resend**: verify a sending domain, create an API key, set `EMAIL_FROM` on that domain.
4. **IP header (rate limiting only)**: set `TRUSTED_IP_HEADER` to the header *your host overwrites* with the client IP (`x-vercel-forwarded-for`, `cf-connecting-ip`, `x-real-ip`, or `x-forwarded-for` + `TRUSTED_PROXY_HOPS`). Never point it at a header the client can set directly.
5. `npm run dev` / `npm run build && npm start` / `npm test`.

`MOCK_SERVICES=1` swaps in an in-memory store and fake mailer for local testing. It is ignored when `NODE_ENV=production`.

## How registration works (`src/server/service.ts`)
1. Validate (zod, same schema on client and server; item link required, Lagos-resident and excluded-partner confirmations required; price must be > ₦0 and ≤ ₦50,000, the top reward tier; Pickup Station nominations must be a real map-pin link or coordinates).
2. Inside a per-instance lock, read the sheet. **Existing registrations are checked before any write or email.**
   - Email already present (case/`+tag`/Gmail-dot insensitive) → `409`, nothing written, nothing sent. If that earlier entry's confirmation email *failed*, the same email is re-sent (max 3 attempts) and **no new row is created**.
   - There is no per-network restriction: several people may register from the same connection.
3. Append the row, re-read, and confirm ours is the earliest row for that email. If another server instance raced us, the later row is marked `DUPLICATE_RACE` and gets no email. (Sheets has no transactions; this write-then-verify step is what closes the multi-instance gap.)
4. Only then send the Resend email (idempotency key `confirm-<id>`), and record `SENT`/`FAILED` in the sheet. A Resend failure never rolls back or duplicates the registration; a Sheets failure sends no email.

The client IP is used only for in-memory rate limiting and is never stored.

## Sheet statuses
`ACCEPTED`, `NEEDS_REVIEW` (legacy rows only; no longer set automatically), `DUPLICATE_RACE` (ignore). Email status: `PENDING`, `SENT`, `FAILED`, `SKIPPED`.

## Known limits
- Rate limiting is in-memory per instance: a speed bump, not a hard limit.
- The sheet is read in full on each registration. Fine for thousands of rows, not hundreds of thousands.

## Admin dashboard (`/admin`)
Set `ADMIN_SESSION_SECRET` (32+ chars) in the environment. Admins sign in at `/admin` with their email and password; "Forgot your password?" emails a reset link.
- **Inviting admins is possible only from the owner's computer.** In your *local* `.env.local` (never on the host) set `ALLOW_ADMIN_INVITE=1`, point the Sheets/Resend vars at production and `NEXT_PUBLIC_SITE_URL` at the live site, run `npm run dev`, and open `http://localhost:3000/admin/invite`. The invitee gets an email link (72h) to choose a password. On the live site the page and API return 404.
- Lists every registration with all details, search, filters and a CSV export. Pins open in a new tab; the IP hash is never sent to the browser.
- **Station established** (with a confirm step) makes the admin pick the prize (₦50,000 / ₦20,000 / ₦15,000, see `src/lib/brand.ts`), marks the entry in the sheet (`Station Status`, `Reward Amount`, `Station Email Status`) and emails the participant that their Pickup Station is live and how much they won. A **Winners** panel on the dashboard totals what has been awarded per category. It never emails twice; if the email fails the station stays marked and the button becomes **Retry email**.
- Session is a signed, HttpOnly, SameSite=Strict cookie (8h). Login is throttled (5 failures / 15 min per IP, in memory), and every state-changing call checks the Origin header. It is a single shared password: rotate it when staff change.
