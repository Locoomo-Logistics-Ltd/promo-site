"use client";

import { motion } from "motion/react";
import { Gift, Truck, PackageCheck, Snowflake, TreePine, Star } from "lucide-react";
import { CtaLink, Lights } from "./ui";

const flakes = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 47) % 100}%`,
  size: 3 + ((i * 7) % 5),
  dur: `${9 + ((i * 3) % 9)}s`,
  delay: `-${(i * 1.7) % 12}s`,
  drift: `${((i % 2 ? 1 : -1) * (15 + ((i * 11) % 40)))}px`,
}));

const rise = (i: number) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] as const },
});

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-navy pb-24 pt-32 text-white sm:pt-40">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_75%_10%,rgb(0_108_223/.4),transparent),radial-gradient(45%_45%_at_8%_95%,rgb(200_16_46/.38),transparent),radial-gradient(40%_40%_at_95%_95%,rgb(31_122_77/.35),transparent)]" />
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        {flakes.map((f, i) => (
          <span key={i} className="snowflake" style={{ left: f.left, width: f.size, height: f.size, animationDuration: f.dur, animationDelay: f.delay, ["--drift" as string]: f.drift }} />
        ))}
      </div>

      <Lights className="absolute inset-x-0 top-14 -z-0" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 flex items-end justify-between px-2 text-pine/35">
        {[88, 140, 96, 170, 110, 150, 90].map((h, i) => <TreePine key={i} strokeWidth={1.2} style={{ height: h, width: h * 0.7 }} className={i > 3 ? "hidden sm:block" : ""} />)}
      </div>
      <Star aria-hidden className="absolute right-[12%] top-28 -z-10 size-6 animate-float fill-gold text-gold" />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <motion.p {...rise(0)} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-gold">
            <Snowflake className="size-3.5" aria-hidden /> Christmas Shopping Fund
          </motion.p>
          <motion.h1 {...rise(1)} className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            We're putting <span className="gold-text">₦5 million</span> behind your December shopping.
          </motion.h1>
          <motion.p {...rise(2)} className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
            Choose something you genuinely want from your favourite vendor. We fund your approved purchase. We move it free. You pick it up.
          </motion.p>
          <motion.div {...rise(3)} className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <CtaLink href="#apply">Apply for the Christmas Fund</CtaLink>
            <p className="text-sm text-white/60">Limited slots. Eligibility and campaign terms apply.</p>
          </motion.div>
        </div>

        <motion.ul {...rise(3)} className="grid gap-3" aria-label="How the fund works at a glance">
          {[
            [Gift, "We fund your approved purchase", "Up to ₦50,000, paid straight to your vendor. Not cash to you."],
            [Truck, "We move it free", "Delivery to a Locoomo Pickup Station is on us."],
            [PackageCheck, "You pick it up", "Collect from the station you helped bring to your area."],
          ].map(([Icon, t, d], i) => {
            const I = Icon as typeof Gift;
            return (
              <motion.li
                key={t as string}
                whileHover={{ x: 6 }}
                className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[.06] p-5 backdrop-blur-sm"
                style={{ marginLeft: i * 14 }}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold"><I className="size-5" aria-hidden /></span>
                <span><span className="block font-display font-semibold">{t as string}</span><span className="mt-0.5 block text-sm text-white/65">{d as string}</span></span>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
      <div aria-hidden className="candy absolute inset-x-0 bottom-0" />
    </section>
  );
}
