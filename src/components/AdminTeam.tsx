"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, LoaderCircle, Mail, TriangleAlert, UserPlus, UserX } from "lucide-react";
import { api } from "./AdminApp";

type Member = { id: string; email: string; name: string; status: "INVITED" | "ACTIVE" | "DISABLED"; createdAt: string; invitedBy: string; lastLoginAt: string };

const badge: Record<Member["status"], string> = {
  ACTIVE: "bg-[#eefaf3] text-pine",
  INVITED: "bg-[#fff6e0] text-[#5a4300]",
  DISABLED: "bg-surface text-ink-3",
};

export function Team({ me }: { me: { email: string; owner: boolean } | null }) {
  const [users, setUsers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { res, data } = await api("/api/admin/users");
    if (res.ok) setUsers(data.users);
    else setMsg({ ok: false, text: data.detail ? `${data.error} (${data.detail})` : data.error });
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg(null);
    const { res, data } = await api("/api/admin/users", { method: "POST", body: JSON.stringify({ email, name }) });
    setBusy(false);
    if (res.ok) { setMsg({ ok: true, text: `Invite sent to ${email}.` }); setEmail(""); setName(""); } else setMsg({ ok: false, text: data.detail ? `${data.error} (${data.detail})` : data.error });
    void load();
  }

  async function disable(u: Member) {
    if (!confirm(`Remove ${u.email}'s admin access? They'll be signed out.`)) return;
    const { res, data } = await api(`/api/admin/users/${u.id}/disable`, { method: "POST" });
    if (!res.ok) setMsg({ ok: false, text: data.error });
    void load();
  }

  const input = "mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:shadow-[0_0_0_4px_rgb(0_108_223/.12)]";
  return (
    <section aria-label="Admin team" className="mb-8 rounded-3xl border border-line bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold"><UserPlus className="size-5 text-brand" aria-hidden />Invite an admin</h2>
      <p className="mt-1 text-sm text-ink-2">They'll get an email from Locoomo with a link to set their own password. Signed in as <strong>{me?.email}</strong>{me?.owner ? " (owner)" : ""}.</p>
      <form onSubmit={invite} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-sm font-semibold">Name (optional)<input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={input} /></label>
        <label className="text-sm font-semibold">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></label>
        <button disabled={busy} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-70">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Mail className="size-4" aria-hidden />}Send invite
        </button>
      </form>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`mt-3 flex items-start gap-2 text-sm font-medium ${msg.ok ? "text-pine" : "text-berry"}`}>
          {msg.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}{msg.text}
        </p>
      )}
      {users.length > 0 && (
        <ul className="mt-5 divide-y divide-line rounded-2xl border border-line">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="min-w-0"><strong className="block truncate">{u.name || u.email}</strong>{u.name && <span className="block truncate text-ink-3">{u.email}</span>}</span>
              <span className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge[u.status]}`}>{u.status === "INVITED" ? "Invite pending" : u.status === "ACTIVE" ? "Active" : "Removed"}</span>
                {u.status !== "DISABLED" && u.email !== me?.email && (
                  <button onClick={() => disable(u)} className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-berry hover:bg-[#fff1f3]"><UserX className="size-3.5" aria-hidden />Remove</button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
