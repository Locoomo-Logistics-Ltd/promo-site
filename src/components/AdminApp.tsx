"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BadgeCheck, CircleCheck, Download, ExternalLink, LoaderCircle, LogOut, Lock, MapPin, Search, Send, TriangleAlert, RefreshCw, Mail, Phone, Store, AtSign, Tag, User, Users,
} from "lucide-react";
import { Logo } from "./ui";
import { Team } from "./AdminTeam";

type Row = {
  id: string; createdAt: string; status: "ACCEPTED" | "NEEDS_REVIEW"; fullName: string; email: string; phone: string; item: string; price: number;
  vendorName: string; vendorPhone: string; vendorSocial: string; nomination: string; nominationPin: string; nominationLat: number | ""; nominationLng: number | "";
  emailStatus: string; reviewNote: string; stationStatus: "" | "ESTABLISHED"; stationEstablishedAt: string; stationEmailStatus: "" | "SENT" | "FAILED";
};

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const when = (iso: string) => new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
const safeHref = (u: string) => (/^https:\/\//.test(u) ? u : null);
const socialHref = (s: string) => (s.startsWith("@") ? `https://instagram.com/${s.slice(1)}` : safeHref(`https://${s}`));

export async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  return { res, data: await res.json().catch(() => ({})) };
}

export function AdminApp() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [me, setMe] = useState<{ email: string; owner: boolean } | null>(null);
  const [team, setTeam] = useState(false);

  const load = useCallback(async () => {
    setError("");
    const { res, data } = await api("/api/admin/registrations");
    if (res.status === 401) return setState("login");
    if (!res.ok) { setError(data.error ?? "Couldn't load registrations."); return setState("ready"); }
    setRows(data.rows);
    setMe(data.me ?? null);
    setState("ready");
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (state === "loading") return <Shell><div className="grid h-64 place-items-center"><LoaderCircle className="size-8 animate-spin text-brand" aria-label="Loading" /></div></Shell>;
  if (state === "login") return <Shell><Login onDone={load} /></Shell>;
  return (
    <Shell
      actions={
        <>
          <button onClick={() => setTeam((v) => !v)} aria-expanded={team} className="flex min-h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10"><Users className="size-4" aria-hidden /><span className="hidden sm:inline">Team</span></button>
          <button onClick={load} className="grid size-10 place-items-center rounded-full text-white/80 hover:bg-white/10" aria-label="Refresh"><RefreshCw className="size-5" aria-hidden /></button>
          <button
            onClick={async () => { await api("/api/admin/logout", { method: "POST" }); setRows([]); setTeam(false); setState("login"); }}
            className="flex min-h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10"
          ><LogOut className="size-4" aria-hidden />Log out</button>
        </>
      }
    >
      {team && <Team me={me} />}
      {error && <p role="alert" className="mb-4 flex items-center gap-2 rounded-xl bg-[#fff1f3] p-4 text-sm font-medium text-berry"><TriangleAlert className="size-4" aria-hidden />{error}</p>}
      <Dashboard rows={rows} onChange={(r) => setRows((all) => all.map((x) => (x.id === r.id ? r : x)))} />
    </Shell>
  );
}

export function Shell({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-navy"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"><div className="flex items-center gap-3"><Logo light /><span className="hidden rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold sm:inline">Admin</span></div><div className="flex items-center gap-2">{actions}</div></div><div className="candy" aria-hidden /></header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(""); setInfo("");
    if (mode === "forgot") {
      const { res, data } = await api("/api/admin/password/forgot", { method: "POST", body: JSON.stringify({ email }) });
      setBusy(false);
      if (res.ok) setInfo(data.message); else setErr(data.error ?? "Couldn't send the link.");
      return;
    }
    const { res, data } = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ email, password: pw }) });
    setBusy(false);
    if (res.ok) onDone(); else setErr(data.detail ? `${data.error} (${data.detail})` : data.error ?? "Couldn't sign in.");
  }
  const field = "mt-1.5 w-full rounded-xl border border-line px-4 py-3 text-base focus:border-brand focus:outline-none focus:shadow-[0_0_0_4px_rgb(0_108_223/.12)]";
  return (
    <form onSubmit={submit} className="mx-auto mt-10 max-w-sm rounded-3xl border border-line bg-white p-7 shadow-card">
      <span className="grid size-12 place-items-center rounded-2xl bg-navy text-gold"><Lock className="size-6" aria-hidden /></span>
      <h1 className="mt-4 text-2xl font-bold">{mode === "signin" ? "Admin sign in" : "Reset your password"}</h1>
      {mode === "forgot" && <p className="mt-2 text-sm text-ink-2">Enter your admin email and we'll send you a link to choose a new password.</p>}
      <label htmlFor="em" className="mt-5 block text-sm font-semibold">Email</label>
      <input id="em" type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      {mode === "signin" && (
        <>
          <label htmlFor="pw" className="mt-4 block text-sm font-semibold">Password</label>
          <input id="pw" type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)}
            aria-invalid={err ? true : undefined} aria-describedby={err ? "pw-err" : undefined} className={field} />
        </>
      )}
      {err && <p id="pw-err" role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-medium text-berry"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{err}</p>}
      {info && <p role="status" className="mt-3 flex items-start gap-1.5 rounded-xl bg-[#eefaf3] p-3 text-sm font-medium text-pine"><CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />{info}</p>}
      <button disabled={busy} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand font-display text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark disabled:opacity-70">
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}{mode === "signin" ? "Sign in" : "Send reset link"}
      </button>
      <button type="button" onClick={() => { setMode(mode === "signin" ? "forgot" : "signin"); setErr(""); setInfo(""); }} className="mt-4 w-full text-center text-sm font-semibold text-brand hover:underline">
        {mode === "signin" ? "Forgot your password?" : "Back to sign in"}
      </button>
    </form>
  );
}

type Filter = "all" | "no-station" | "pending-station" | "established" | "review";

function Dashboard({ rows, onChange }: { rows: Row[]; onChange: (r: Row) => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const stats = useMemo(() => ({
    total: rows.length,
    nominated: rows.filter((r) => r.nomination || r.nominationPin).length,
    established: rows.filter((r) => r.stationStatus === "ESTABLISHED").length,
    review: rows.filter((r) => r.status === "NEEDS_REVIEW").length,
  }), [rows]);

  const shown = rows.filter((r) => {
    const hasStation = Boolean(r.nomination || r.nominationPin);
    if (filter === "review" && r.status !== "NEEDS_REVIEW") return false;
    if (filter === "no-station" && hasStation) return false;
    if (filter === "pending-station" && !(hasStation && r.stationStatus !== "ESTABLISHED")) return false;
    if (filter === "established" && r.stationStatus !== "ESTABLISHED") return false;
    const n = q.trim().toLowerCase();
    return !n || [r.fullName, r.email, r.phone, r.item, r.vendorName, r.nomination, r.id].some((f) => f.toLowerCase().includes(n));
  });

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Registered", stats.total], ["Nominated a station", stats.nominated], ["Stations established", stats.established], ["Needs review", stats.review]].map(([l, n]) => (
          <div key={l as string} className="rounded-2xl border border-line bg-white p-4"><dt className="text-xs font-bold uppercase tracking-wider text-ink-3">{l}</dt><dd className="mt-1 font-display text-3xl font-extrabold">{n}</dd></div>
        ))}
      </dl>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search registrations" placeholder="Search name, email, phone, item, vendor, shop, reference"
            className="w-full rounded-xl border border-line bg-white py-3 pl-10 pr-4 text-base focus:border-brand focus:outline-none" />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filter" className="rounded-xl border border-line bg-white px-4 py-3 text-base">
          <option value="all">All entries</option>
          <option value="pending-station">Station nominated, not yet established</option>
          <option value="established">Station established</option>
          <option value="no-station">No station nominated</option>
          <option value="review">Needs review (same network)</option>
        </select>
        <a href="/api/admin/registrations/export" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-2"><Download className="size-4" aria-hidden />CSV</a>
      </div>

      <p className="mt-4 text-sm text-ink-2" aria-live="polite">{shown.length} of {rows.length} entries</p>
      <ul className="mt-3 space-y-4">
        {shown.map((r) => <li key={r.id}><Card r={r} onChange={onChange} /></li>)}
        {!shown.length && <li className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-ink-3">No registrations match.</li>}
      </ul>
    </>
  );
}

function Detail({ icon: Icon, label, children }: { icon: typeof User; label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-3"><Icon className="size-3.5" aria-hidden />{label}</dt><dd className="mt-0.5 break-words text-sm font-medium">{children || <span className="text-ink-3">-</span>}</dd></div>;
}

function Card({ r, onChange }: { r: Row; onChange: (r: Row) => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const hasStation = Boolean(r.nomination || r.nominationPin);
  const mapHref = safeHref(r.nominationPin);
  const notified = r.stationStatus === "ESTABLISHED" && r.stationEmailStatus === "SENT";
  const retry = r.stationStatus === "ESTABLISHED" && r.stationEmailStatus === "FAILED";

  async function establish() {
    setBusy(true); setMsg(null);
    const { res, data } = await api(`/api/admin/registrations/${r.id}/station`, { method: "POST" });
    setBusy(false); setConfirm(false);
    setMsg({ ok: res.ok, text: data.message ?? data.error ?? "Something went wrong." });
    if (data.result === "notified" || data.result === "already_notified") onChange({ ...r, stationStatus: "ESTABLISHED", stationEmailStatus: "SENT", stationEstablishedAt: data.at ?? new Date().toISOString() });
    else if (data.result === "email_failed") onChange({ ...r, stationStatus: "ESTABLISHED", stationEmailStatus: "FAILED", stationEstablishedAt: data.at ?? new Date().toISOString() });
  }

  const badge = (t: string, c: string) => <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${c}`}>{t}</span>;
  return (
    <article className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">{r.fullName}</h2>
          <p className="text-xs text-ink-3">{when(r.createdAt)} · Ref {r.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {r.status === "NEEDS_REVIEW" && badge("Needs review", "bg-gold/25 text-[#7a5200]")}
          {badge(r.emailStatus === "SENT" ? "Confirmation sent" : r.emailStatus === "FAILED" ? "Confirmation failed" : r.emailStatus === "SKIPPED" ? "No auto email" : "Email pending", r.emailStatus === "FAILED" ? "bg-berry/10 text-berry" : "bg-surface text-ink-2")}
          {r.stationStatus === "ESTABLISHED" && badge(notified ? "Station live, notified" : "Station live, email failed", notified ? "bg-pine/15 text-pine" : "bg-berry/10 text-berry")}
        </div>
      </div>
      {r.reviewNote && <p className="mt-2 text-sm text-[#7a5200]">Note: {r.reviewNote}</p>}

      <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <Detail icon={Mail} label="Email"><a className="text-brand underline" href={`mailto:${r.email}`}>{r.email}</a></Detail>
        <Detail icon={Phone} label="Phone"><a className="text-brand underline" href={`tel:${r.phone}`}>{r.phone}</a></Detail>
        <Detail icon={Tag} label="Item">{r.item} · <strong>{naira(r.price)}</strong></Detail>
        <Detail icon={Store} label="Vendor">{r.vendorName}</Detail>
        <Detail icon={Phone} label="Vendor phone">{r.vendorPhone && <a className="text-brand underline" href={`tel:${r.vendorPhone}`}>{r.vendorPhone}</a>}</Detail>
        <Detail icon={AtSign} label="Vendor social">{socialHref(r.vendorSocial) ? <a className="text-brand underline" href={socialHref(r.vendorSocial)!} target="_blank" rel="noopener noreferrer">{r.vendorSocial}</a> : r.vendorSocial}</Detail>
      </dl>

      <div className="mt-4 rounded-xl bg-surface p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-berry"><MapPin className="size-3.5" aria-hidden />Nominated Pickup Station</p>
        {hasStation ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 text-sm">
              <p className="font-semibold">{r.nomination || "Unnamed shop"}</p>
              {r.nominationLat !== "" && <p className="text-ink-3">{Number(r.nominationLat).toFixed(5)}, {Number(r.nominationLng).toFixed(5)}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {mapHref && (
                <a href={mapHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-brand/30 bg-white px-4 text-sm font-semibold text-brand hover:bg-brand/5">
                  <ExternalLink className="size-4" aria-hidden />Open map pin
                </a>
              )}
              {!notified && !confirm && (
                <button onClick={() => setConfirm(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-pine px-5 text-sm font-bold text-white hover:bg-[#186a41]">
                  <BadgeCheck className="size-4" aria-hidden />{retry ? "Retry email" : "Station established"}
                </button>
              )}
              {notified && <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-pine"><CircleCheck className="size-4" aria-hidden />Notified {r.stationEstablishedAt && when(r.stationEstablishedAt)}</span>}
            </div>
          </div>
        ) : <p className="mt-1 text-sm text-ink-3">No station nominated.</p>}

        <AnimatePresence>
          {confirm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div role="alertdialog" aria-label="Confirm" className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-pine/30 bg-white p-3 text-sm">
                <span className="flex-1">This emails <strong>{r.email}</strong> that their Pickup Station is live. Continue?</span>
                <button onClick={() => setConfirm(false)} disabled={busy} className="min-h-10 rounded-full px-4 font-semibold text-ink-2 hover:bg-surface">Cancel</button>
                <button onClick={establish} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-pine px-5 font-bold text-white disabled:opacity-70">
                  {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}Send email
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {msg && <p role="status" className={`mt-3 flex items-start gap-1.5 text-sm font-medium ${msg.ok ? "text-pine" : "text-berry"}`}>{msg.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}{msg.text}</p>}
      </div>
    </article>
  );
}
