import type { Metadata, Viewport } from "next";
import { Sora, DM_Sans } from "next/font/google";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "Locoomo Christmas Shopping Fund",
  description:
    "Locoomo is funding December shopping for selected participants. Apply, nominate a Pickup Station near you, and collect your order with free delivery.",
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "Locoomo Christmas Shopping Fund",
    description: "We fund your approved purchase. We move it free. You pick it up.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#000e2e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
