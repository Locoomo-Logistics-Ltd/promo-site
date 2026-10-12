import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" aria-label="Locoomo home" className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="" width={26} height={32} />
      <span className={`font-display text-lg font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}>LOCOOMO</span>
    </Link>
  );
}

export function CtaLink({ href, children, variant = "gold" }: { href: string; children: ReactNode; variant?: "gold" | "blue" }) {
  const styles =
    variant === "gold"
      ? "bg-gold text-navy hover:bg-[#ffc962] shadow-[0_10px_30px_-10px_rgb(242_184_75/.7)]"
      : "bg-brand text-white hover:bg-brand-dark shadow-[0_10px_30px_-10px_rgb(0_108_223/.6)]";
  return (
    <a
      href={href}
      className={`group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 py-3 font-display text-sm font-semibold uppercase tracking-wide transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] ${styles}`}
    >
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
    </a>
  );
}

export function SectionHead({ eyebrow, title, children, light = false }: { eyebrow: string; title: string; children?: ReactNode; light?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className={`inline-block rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-[.14em] ${light ? "bg-white/10 text-gold" : "bg-brand/10 text-brand-dark"}`}>
        {eyebrow}
      </span>
      <h2 className={`mt-4 text-3xl font-bold sm:text-4xl ${light ? "text-white" : "text-ink"}`}>{title}</h2>
      {children && <p className={`mt-4 text-lg leading-relaxed ${light ? "text-white/75" : "text-ink-2"}`}>{children}</p>}
    </div>
  );
}

const BULBS = ["#c8102e", "#f2b84b", "#2fa66a", "#3d93e0"];

/** Decorative string of twinkling Christmas lights. Pure CSS; hidden from assistive tech. */
export function Lights({ className = "relative" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none flex w-full justify-between overflow-hidden px-2 ${className}`}>
      <svg className="absolute inset-x-0 top-0 h-4 w-full" preserveAspectRatio="none" viewBox="0 0 100 10"><path d="M0 1 Q 12.5 9 25 1 T 50 1 T 75 1 T 100 1" fill="none" stroke="#26324a" strokeWidth=".8" vectorEffect="non-scaling-stroke" /></svg>
      {Array.from({ length: 28 }, (_, i) => (
        <span key={i} className="bulb" style={{ background: BULBS[i % 4], boxShadow: `0 0 14px 2px ${BULBS[i % 4]}99`, animationDelay: `${(i % 7) * 0.35}s`, marginTop: i % 2 ? 14 : 8 }} />
      ))}
    </div>
  );
}
