"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, TriangleAlert, UserX, Users } from "lucide-react";
import { api } from "./AdminApp";

type Member = { id: string; email: string; name: string; status: "INVITED" | "ACTIVE" | "DISABLED"; createdAt: string; invitedBy: string; lastLoginAt: string };

const badge: Record<Member["status"], string> = {
  ACTIVE: "bg-[#eefaf3] text-pine",
  INVITED: "bg-[#fff6e0] text-[#5a4300]",
  DISABLED: "bg-surface text-ink-3",
};

export function Team({ me }: { me: { email: string } | null }) {
  const [users, setUsers] = useState<Member[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { res, data } = await api("/api/admin/users");
    if (res.ok) setUsers(data.users);
    else setMsg({ ok: false, text: data.detail ? `${data.error} (${data.detail})` : data.error });
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function disable(u: Member) {
    if (!confirm(`Remove ${u.email}'s admin access? They'll be signed out.`)) return;
    const { res, data } = await api(`/api/admin/users/${u.id}/disable`, { method: "POST" });
    if (!res.ok) setMsg({ ok: false, text: data.error });
    void load();
  }

  const input = "mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:shadow-[0_0_0_4px_rgb(0_108_223/.12)]";
  return (
    <section aria-label="Admin team" className="mb-8 rounded-3xl border border-line bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="size-5 text-brand" aria-hidden />Admin team</h2>
      <p className="mt-1 text-sm text-ink-2">Signed in as <strong>{me?.email}</strong>. New admins can only be invited from the owner's own computer.</p>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`mt-3 flex items-start gap-2 text-sm font-medium ${msg.ok ? "text-pine" : "text-berry"}`}>
          {msg.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}{msg.text}
        </p>
      )}
      {users.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
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
