import {
  BadgeCheck, Ban, Star, TreePine, Gift, Megaphone, Trophy, ChevronDown, Handshake, MapPin, PackageCheck, ShieldCheck, ShoppingBag, Store, TriangleAlert, Wrench, CalendarClock, Users, Eye, Lock,
} from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "./Motion";
import { CtaLink, SectionHead, Logo } from "./ui";
import { FAQ, NOMINEES, STEPS } from "./content";

const ICONS = { ShoppingBag, MapPin, Wrench, BadgeCheck, PackageCheck };
const wrap = "mx-auto max-w-6xl px-4 sm:px-6";

export function Prizes() {
  const tiers = [
    { who: "First 15", amount: "₦50,000", total: "₦750,000", icon: Trophy, style: "from-gold to-[#e09a1f] text-navy", sub: "text-navy/70" },
    { who: "Next 100", amount: "₦20,000", total: "₦2,000,000", icon: Gift, style: "from-berry to-[#9d0b23] text-white", sub: "text-white/75" },
    { who: "Next 150", amount: "₦15,000", total: "₦2,250,000", icon: TreePine, style: "from-pine to-[#155a39] text-white", sub: "text-white/75" },
  ];
  return (
    <section id="prizes" className="relative overflow-hidden bg-white py-20 sm:py-28">
      <div className={wrap}>
        <Reveal><SectionHead eyebrow="The Christmas pot" title="₦5 million. 265 shopping slots.">
          The first 15 people get ₦50,000. The next 100 get ₦20,000. The next 150 get ₦15,000. The earlier you are, the bigger your reward. Funds are paid to your vendor for your approved purchase, never as cash.
        </SectionHead></Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {tiers.map((t, i) => (
            <Reveal key={t.who} delay={i * 0.1}>
              <div className={`relative h-full overflow-hidden rounded-3xl bg-gradient-to-br p-7 shadow-card transition-transform duration-300 hover:-translate-y-1.5 hover:rotate-[-.4deg] ${t.style}`}>
                <t.icon aria-hidden className="absolute -right-4 -top-4 size-28 opacity-15" />
                <p className="text-xs font-bold uppercase tracking-[.16em] opacity-80">{t.who} people get</p>
                <p className="mt-3 font-display text-5xl font-extrabold">{t.amount}</p>
                <p className="mt-1 font-semibold">each</p>
                <p className={`mt-5 border-t border-current/20 pt-4 text-sm ${t.sub}`}>{t.who.split(" ")[1]} participants · {t.total} in total</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal><p className="mt-8 flex items-center justify-center gap-2 text-center text-sm font-semibold text-ink-2"><Star className="size-4 fill-gold text-gold" aria-hidden />15 + 100 + 150 = 265 slots · ₦750,000 + ₦2,000,000 + ₦2,250,000 = ₦5,000,000</p></Reveal>
      </div>
    </section>
  );
}

export function Catch() {
  return (
    <section className="relative bg-white py-20 sm:py-28">
      <div className={`${wrap} grid items-center gap-12 lg:grid-cols-2`}>
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full bg-berry/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[.14em] text-berry"><TriangleAlert className="size-3.5" aria-hidden />There's just one catch</span>
          <h2 className="mt-4 text-3xl font-bold sm:text-5xl">You have to pick it up.</h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-2">Your package isn't coming to your doorstep. It has to come through a <strong className="text-ink">Locoomo Pickup Station</strong>.</p>
          <p className="mt-4 leading-relaxed text-ink-2">If there isn't a convenient Pickup Station near you, tell us where you need one, or nominate a trusted business in your area. If your route gets activated and you qualify, we'll support your approved purchase and deliver it to your Pickup Station for free.</p>
          <p className="mt-4 leading-relaxed text-ink-2">And unlike the Christmas campaign, the Pickup Station doesn't disappear afterwards. You help us build something your neighbourhood can keep using.</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="rounded-3xl bg-surface p-7 sm:p-9">
            <p className="font-display text-xl font-bold">This Christmas, we're building more Locoomo Pickup Stations across Lagos.</p>
            <p className="mt-4 leading-relaxed text-ink-2">Nominate a trusted shop, pharmacy, supermarket, mini-mart or other suitable business close to you. If we're able to turn it into a Locoomo Pickup Station, you could unlock a place in our Christmas Shopping Fund.</p>
            <ul className="mt-6 space-y-3 font-medium">
              {["You get something you wanted.", "Your neighbourhood gets a Pickup Station.", "And we pay for the delivery."].map((t) => (
                <li key={t} className="flex items-center gap-3"><BadgeCheck className="size-5 shrink-0 text-pine" aria-hidden />{t}</li>
              ))}
            </ul>
            <p className="mt-6 font-display text-lg font-bold text-brand">Simple.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="bg-surface py-20 sm:py-28">
      <div className={wrap}>
        <Reveal><SectionHead eyebrow="How it works" title="Five steps from wish to pickup" /></Reveal>
        <ol className="relative mx-auto mt-14 max-w-3xl space-y-5 before:absolute before:bottom-8 before:left-[27px] before:top-8 before:w-px before:bg-line">
          {STEPS.map((s, i) => {
            const Icon = ICONS[s.icon];
            return (
              <Reveal as="li" key={s.title} delay={0.04}>
                <div className="group relative flex gap-5 rounded-2xl border border-line bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-card sm:p-6">
                  <span className={`relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl ${i % 2 ? "bg-pine" : "bg-berry"} text-white transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3`}><Icon className="size-6" aria-hidden /></span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.14em] text-brand">Step {i + 1}</p>
                    <h3 className="mt-0.5 text-xl font-bold">{s.title}</h3>
                    {s.body.map((p) => <p key={p} className="mt-2 leading-relaxed text-ink-2">{p}</p>)}
                    {i === 1 && <a href="#apply" className="mt-3 inline-block text-sm font-bold uppercase tracking-wide text-brand underline underline-offset-4">Nominate a Pickup Station</a>}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ol>
        <Reveal><div className="mx-auto mt-14 max-w-xl text-center">
          <p className="font-display text-2xl font-bold">That's it.</p>
          <p className="mt-2 text-ink-2">You choose what you want. You help us decide where a Pickup Station should be. We handle everything in between.</p>
          <div className="mt-6"><CtaLink href="#apply" variant="blue">Apply now</CtaLink></div>
        </div></Reveal>
      </div>
    </section>
  );
}

export function Nominate() {
  return (
    <section id="nominate" className="bg-white py-20 sm:py-28">
      <div className={`${wrap} grid gap-6 lg:grid-cols-2`}>
        <Reveal><div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-berry to-[#8d0a21] p-7 text-white sm:p-9 lg:col-span-2">
          <Megaphone className="absolute -right-3 -top-3 size-32 opacity-10" aria-hidden />
          <p className="text-xs font-bold uppercase tracking-[.16em] text-gold">Our recommendation</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Drop a word at the shop for us.</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-white/85">Once you've picked a shop, walk in and sell it on Locoomo. Tell them a Pickup Station brings customers to their door and extra income. <strong>You don't need to negotiate or handle any onboarding.</strong> You just need the shop to be eager to hear from us. Locoomo takes it from there.</p>
        </div></Reveal>
        <Reveal>
          <div className="h-full rounded-3xl border border-line p-7 sm:p-9">
            <Store className="size-8 text-brand" aria-hidden />
            <h2 className="mt-4 text-2xl font-bold sm:text-3xl">What can I nominate?</h2>
            <p className="mt-3 text-ink-2">Think about the businesses you already trust around you.</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {NOMINEES.map((n) => <li key={n} className="rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink-2">{n}</li>)}
            </ul>
            <p className="mt-5 text-ink-2">You nominate it. Locoomo decides whether it meets the requirements to become a Pickup Station.</p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="h-full rounded-3xl border border-line p-7 sm:p-9">
            <Handshake className="size-8 text-brand" aria-hidden />
            <h2 className="mt-4 text-2xl font-bold sm:text-3xl">What about my vendor?</h2>
            <p className="mt-3 text-ink-2">Don't worry about that part. You tell us who you want to buy from. Locoomo works with the vendor to arrange how the package gets into our network.</p>
            <p className="mt-3 text-ink-2">Your vendor does not have to become a public Pickup Station. If needed, we can set up their location so only authorised Locoomo riders can collect their packages. Customers won't suddenly start showing up at their shop or home.</p>
            <p className="mt-3 font-display font-bold text-brand">Simple.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Rule() {
  return (
    <section className="bg-navy py-20 text-white sm:py-24">
      <div className={`${wrap} grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]`}>
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-3.5 py-1 text-xs font-bold uppercase tracking-[.14em] text-gold"><Ban className="size-3.5" aria-hidden />The most important rule</span>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Please don't buy anything until Locoomo approves your shopping slot.</h2>
          <p className="mt-5 leading-relaxed text-white/75">Applying does not mean you've automatically been selected. If you buy before we approve you, we may not be able to pay for the purchase.</p>
        </Reveal>
        <Reveal delay={0.1}>
          <ol className="flex flex-wrap items-center gap-2 text-sm font-bold">
            {["Apply", "Nominate", "We activate", "We approve you", "Then you shop"].map((t, i, a) => (
              <li key={t} className="flex items-center gap-2">
                <span className={`rounded-full px-4 py-2 ${i === a.length - 1 ? "bg-gold text-navy" : "bg-white/10"}`}>{t}</span>
                {i < a.length - 1 && <span aria-hidden className="text-white/40">→</span>}
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

export function Timeline() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className={wrap}>
        <Reveal><SectionHead eyebrow="Don't wait until December" title="November is for getting your Pickup Station ready.">
          We need time to speak with the business, check the location and set everything up properly. The earlier your station goes live, the better your chances of getting one of the available Shopping Fund slots.
        </SectionHead></Reveal>
        <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
          {[["November", "Build the network", "Applications open on November 1. Nominate, and we onboard your station.", "bg-brand text-white"], ["December", "Shop and deliver", "Approved participants shop. Locoomo moves orders to Pickup Stations for free.", "bg-berry text-white"]].map(([m, t, d, c], i) => (
            <Reveal key={m} delay={i * 0.1}>
              <div className={`h-full rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1 ${c}`}>
                <CalendarClock className="size-7 opacity-80" aria-hidden />
                <p className="mt-4 font-display text-3xl font-extrabold">{m}</p>
                <p className="mt-1 font-semibold">{t}</p>
                <p className="mt-2 text-sm text-white/80">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Apply({ children }: { children: ReactNode }) {
  return (
    <section id="apply" className="relative bg-surface py-20 sm:py-28">
      <div className={wrap}>
        <Reveal><SectionHead eyebrow="Apply" title="So… what are you buying this Christmas?">
          That dress? New hair? Skincare? Sneakers? A Christmas gift? Something that's been sitting in your saved posts since March? Tell us. Then tell us where you'd like to pick it up. We'll take it from there.
        </SectionHead></Reveal>
        <Reveal delay={0.1}><div className="mt-12">{children}</div></Reveal>
        <p className="mt-6 text-center text-sm font-semibold text-ink-2">Applications open November 1.</p>
      </div>
    </section>
  );
}

export function FairPlay() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className={`${wrap} max-w-4xl`}>
        <Reveal><SectionHead eyebrow="Fair play" title="We want it exciting. We also want it fair.">
          You can nominate as many genuine locations as you like. What you can't do is create fake accounts, fake vendors, fake shops, fake receipts or fake transactions to get campaign money.
        </SectionHead></Reveal>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {["Real people.", "Real businesses.", "Real purchases.", "Real packages.", "Real Pickup Stations."].map((t, i) => (
            <Reveal as="li" key={t} delay={i * 0.06}>
              <div className="flex h-full items-center gap-2 rounded-2xl border border-line bg-surface p-4 text-sm font-bold"><ShieldCheck className="size-5 shrink-0 text-pine" aria-hidden />{t}</div>
            </Reveal>
          ))}
        </ul>
        <Reveal>
          <div className="mt-10 grid gap-4 rounded-3xl border border-line p-6 sm:grid-cols-3 sm:p-8">
            {[
              [Users, "One entry per email", "Each email address can apply once. Variants such as name+tag@ or dots in Gmail addresses count as the same address."],
              [Eye, "Network checks, not accusations", "Households, offices and mobile networks share connections. If another entry came from yours, we review it by hand rather than rejecting you."],
              [Lock, "Private by design", "Your network address is stored only as a one-way hash, used for verification and fraud prevention, and never shared."],
            ].map(([I, t, d]) => {
              const Icon = I as typeof Users;
              return <div key={t as string}><Icon className="size-6 text-brand" aria-hidden /><p className="mt-3 font-display font-bold">{t as string}</p><p className="mt-1 text-sm leading-relaxed text-ink-2">{d as string}</p></div>;
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="bg-surface py-20 sm:py-28">
      <div className={`${wrap} max-w-3xl`}>
        <Reveal><SectionHead eyebrow="FAQ" title="Questions, answered" /></Reveal>
        <div className="mt-12 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-line bg-white open:shadow-card">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-display font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="size-5 shrink-0 text-brand transition-transform duration-300 group-open:rotate-180" aria-hidden />
              </summary>
              <div className="space-y-2 px-5 pb-5 leading-relaxed text-ink-2">{f.a.map((p) => <p key={p}>{p}</p>)}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-navy py-20 text-center text-white sm:py-24">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(50%_80%_at_50%_0%,rgb(200_16_46/.4),transparent),radial-gradient(40%_60%_at_50%_100%,rgb(31_122_77/.35),transparent)]" />
      <Reveal><div className={`${wrap} max-w-2xl`}>
        <TreePine aria-hidden className="mx-auto mb-4 size-10 text-pine" /><h2 className="text-3xl font-extrabold sm:text-5xl">What are you buying this Christmas?</h2>
        <p className="mt-5 text-lg text-white/75">Tell us. Then tell us where you'd like to pick it up. We'll take it from there.</p>
        <div className="mt-8"><CtaLink href="#apply">Apply for the Christmas Shopping Fund</CtaLink></div>
        <p className="mt-4 text-sm text-white/60">Applications open November 1.</p>
      </div></Reveal>
    </section>
  );
}

export function Footer() {
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info@locoomo.com";
  return (
    <footer className="bg-[#000a22] pb-10 text-sm text-white/65"><div className="candy mb-10" aria-hidden />
      <div className={`${wrap} flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center`}>
        <div><Logo light /><p className="mt-3 max-w-sm">Limited slots. Eligibility and campaign terms apply. Locoomo decides all approvals.</p></div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          <li><a className="hover:text-white" href="/privacy">Privacy notice</a></li>
          <li><a className="hover:text-white" href={`mailto:${support}`}>{support}</a></li>
          <li><a className="hover:text-white" href="https://locoomo.com">locoomo.com</a></li>
        </ul>
      </div>
    </footer>
  );
}
