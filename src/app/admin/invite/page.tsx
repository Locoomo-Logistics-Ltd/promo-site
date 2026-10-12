import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { InviteAdmin } from "@/components/InviteAdmin";
import { inviteAllowed } from "@/server/admin-auth";

export const metadata: Metadata = { title: "Invite admin | Locoomo Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (!inviteAllowed(await headers())) notFound();
  return <InviteAdmin />;
}
