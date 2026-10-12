import type { Metadata } from "next";
import { SetPassword } from "@/components/SetPassword";

export const metadata: Metadata = { title: "Set password | Locoomo Admin", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <SetPassword token={typeof token === "string" ? token : ""} />;
}
