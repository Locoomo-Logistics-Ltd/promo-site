"use client";

import { useState } from "react";
import { CircleCheck, LoaderCircle, TriangleAlert, UserPlus } from "lucide-react";
import { Shell, api } from "./AdminApp";

export function InviteAdmin() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sentTo, setSentTo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(""); setSentTo("");
    const { res, data } = await api("/api/admin/invite", { method: "POST", body: JSON.stringify({ email, name }) });
    setBusy(false);
    if (res.ok) { setSentTo(email.trim()); setEmail(""); setName(""); }
    else setErr(data.detail ? `${data.error} (${data.detail})` : data.error ?? "Couldn't send the invite.");
  }

  const field = "mt-1.5 w-full rounded-xl border border-line px-4 py-3 text-base focus:border-brand focus:outline-none focus:shadow-[0_0_0_4px_rgb(0_108_223/.12)]";
  return (
    <Shell>
      <form onSubmit={submit} className="mx-auto mt-10 max-w-sm rounded-3xl border border-line bg-white p-7 shadow-card">
        <span className="grid size-12 place-items-center rounded-2xl bg-navy text-gold"><UserPlus className="size-6" aria-hidden /></span>
        <h1 className="mt-4 text-2xl font-bold">Invite an admin</h1>
        <p className="mt-2 text-sm text-ink-2">We'll email them a link to choose their own password.</p>
        <label htmlFor="iname" className="mt-5 block text-sm font-semibold">Name <span className="font-normal text-ink-2">(optional)</span></label>
        <input id="iname" type="text" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        <label htmlFor="iem" className="mt-4 block text-sm font-semibold">Their email</label>
        <input id="iem" type="email" autoComplete="off" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        {err && <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm font-medium text-berry"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{err}</p>}
        {sentTo && <p role="status" className="mt-3 flex items-start gap-1.5 rounded-xl bg-[#eefaf3] p-3 text-sm font-medium text-pine"><CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />Invite sent to {sentTo}. The link works for 72 hours.</p>}
        <button disabled={busy} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand font-display text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark disabled:opacity-70">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}Send invite
        </button>
        <a href="/admin" className="mt-4 block text-center text-sm font-semibold text-brand hover:underline">Back to sign in</a>
      </form>
    </Shell>
  );
}
