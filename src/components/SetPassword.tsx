"use client";

import { useState } from "react";
import { CircleCheck, KeyRound, LoaderCircle, TriangleAlert } from "lucide-react";
import { Shell, api } from "./AdminApp";

export function SetPassword({ token }: { token: string }) {
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr("");
    if (pw.length < 10) return setErr("Use at least 10 characters.");
    if (pw !== again) return setErr("The two passwords don't match.");
    setBusy(true);
    const { res, data } = await api("/api/admin/password/set", { method: "POST", body: JSON.stringify({ token, password: pw }) });
    setBusy(false);
    if (res.ok) setDone(true); else setErr(data.detail ? `${data.error} (${data.detail})` : data.error ?? "Couldn't save your password.");
  }

  const field = "mt-1.5 w-full rounded-xl border border-line px-4 py-3 text-base focus:border-brand focus:outline-none focus:shadow-[0_0_0_4px_rgb(0_108_223/.12)]";
  return (
    <Shell>
      <div className="mx-auto mt-10 max-w-sm rounded-3xl border border-line bg-white p-7 shadow-card">
        {done ? (
          <div className="text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eefaf3] text-pine"><CircleCheck className="size-6" aria-hidden /></span>
            <h1 className="mt-4 text-2xl font-bold">Password saved</h1>
            <p className="mt-2 text-sm text-ink-2">Your admin account is ready. Sign in with your email and new password.</p>
            <a href="/admin" className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-brand font-display text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark">Go to sign in</a>
          </div>
        ) : !token ? (
          <div>
            <h1 className="text-2xl font-bold">Link not valid</h1>
            <p className="mt-2 text-sm text-ink-2">This page needs the link from your invite or reset email. <a className="font-semibold text-brand underline" href="/admin">Request a new one from the sign-in page</a>.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <span className="grid size-12 place-items-center rounded-2xl bg-navy text-gold"><KeyRound className="size-6" aria-hidden /></span>
            <h1 className="mt-4 text-2xl font-bold">Choose your password</h1>
            <p className="mt-2 text-sm text-ink-2">At least 10 characters. A few random words works well.</p>
            <label htmlFor="np" className="mt-5 block text-sm font-semibold">New password</label>
            <input id="np" type="password" autoComplete="new-password" autoFocus required minLength={10} value={pw} onChange={(e) => setPw(e.target.value)} className={field} />
            <label htmlFor="np2" className="mt-4 block text-sm font-semibold">Confirm password</label>
            <input id="np2" type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} className={field} />
            {err && <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm font-medium text-berry"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{err}</p>}
            <button disabled={busy} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand font-display text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark disabled:opacity-70">
              {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}Save password
            </button>
          </form>
        )}
      </div>
    </Shell>
  );
}
