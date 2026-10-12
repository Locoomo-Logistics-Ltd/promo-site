"use client";

import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import {
  AtSign, Crosshair, CircleCheck, Gift, LoaderCircle, Lock, Mail, MapPin, Phone, ShieldCheck, Store, Tag, TriangleAlert, User, Info, Send,
} from "lucide-react";
import Link from "next/link";

import { registrationSchema, fieldErrors, type ApiResult, type FieldErrors } from "@/lib/validation";

type Values = Record<"fullName" | "email" | "phone" | "item" | "price" | "vendorName" | "vendorPhone" | "vendorSocial" | "nomination" | "nominationPin" | "website", string>;
const EMPTY: Values = { fullName: "", email: "", phone: "", item: "", price: "", vendorName: "", vendorPhone: "", vendorSocial: "", nomination: "", nominationPin: "", website: "" };
const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info@locoomo.com";

function Field({
  id, label, icon: Icon, error, hint, optional, children,
}: { id: string; label: string; icon: typeof User; error?: string; hint?: string; optional?: boolean; children: (p: Record<string, unknown>) => ReactNode }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ink">
        <span className="flex items-center gap-1.5"><Icon className="size-4 text-brand" aria-hidden />{label}</span>
        {optional && <span className="text-xs font-medium text-ink-3">Optional</span>}
      </label>
      {children({
        id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy,
        className: `w-full rounded-xl border bg-white px-4 py-3 text-base text-ink placeholder:text-ink-3/60 transition-shadow focus:border-brand focus:shadow-[0_0_0_4px_rgb(0_108_223/.12)] focus:outline-none ${error ? "border-berry" : "border-line"}`,
      })}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-3">{hint}</p>}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p id={`${id}-err`} role="alert" initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-berry">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ApplyForm() {
  const [v, setV] = useState<Values>(EMPTY);
  const [locating, setLocating] = useState(false);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const controls = useAnimationControls();
  const shake = () => void controls.start({ x: [0, -7, 7, -4, 4, 0], transition: { duration: 0.4 } });
  const inFlight = useRef(false);
  const panel = useRef<HTMLDivElement>(null);

  const validate = (values: Values, c: boolean) => {
    const r = registrationSchema.safeParse({ ...values, consent: c || undefined });
    const errs = r.success ? ({} as FieldErrors) : fieldErrors(r.error);
    // Cross-field rule: zod only runs it once every other field is valid, so mirror it here for live feedback.
    if (values.nomination.trim() && !values.nominationPin.trim() && !errs.nominationPin) errs.nominationPin = "Paste the shop's location pin so we can find it.";
    return errs;
  };
  const set = (k: keyof Values) => (e: { target: { value: string } }) => {
    const next = { ...v, [k]: e.target.value };
    setV(next);
    if (touched.has(k)) setErrors(validate(next, consent));
  };
  const blur = (k: string) => () => {
    setTouched((t) => new Set(t).add(k));
    setErrors(validate(v, consent));
  };
  const shown = (k: keyof FieldErrors) => (touched.has(k) ? errors[k] : undefined);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { ...v, nominationPin: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}` };
        setV(next);
        setTouched((t) => new Set(t).add("nominationPin"));
        setErrors(validate(next, consent));
        setLocating(false);
      },
      () => { setLocating(false); setErrors((e) => ({ ...e, nominationPin: "We couldn't get your location. Paste the pin link instead." })); setTouched((t) => new Set(t).add("nominationPin")); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return; // blocks double-clicks / Enter-mashing before React re-renders
    const errs = validate(v, consent);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setTouched(new Set(Object.keys(EMPTY).concat("consent")));
      shake();
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }
    inFlight.current = true;
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, consent }),
      });
      const data = (await res.json()) as ApiResult;
      if (data.status === "invalid") {
        setErrors(data.errors);
        setTouched(new Set(Object.keys(data.errors)));
        shake();
      }
      setResult(data);
    } catch {
      setResult({ status: "error", message: "We couldn't reach the server. Check your connection and try again. If you already pressed submit, resubmitting is safe: you won't be entered twice." });
    } finally {
      inFlight.current = false;
      setPending(false);
      requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }
  }

  const done = result && (result.status === "success" || result.status === "resent" || result.status === "ip_flagged");

  return (
    <div ref={panel} className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-line bg-white p-5 pt-8 shadow-card sm:p-9 sm:pt-11"><div aria-hidden className="candy absolute inset-x-0 top-0" />
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <Outcome key="done" result={result} />
        ) : (
          <motion.form
            key="form"
            animate={controls}
            onSubmit={submit}
            noValidate
            exit={{ opacity: 0 }}
            className="space-y-5"
            aria-busy={pending}
          >
            <div className="mb-2">
              <h3 className="text-2xl font-bold">Apply for the Christmas Fund</h3>
              <p className="mt-1 text-ink-2">Takes about two minutes. Don't buy anything until we approve your slot.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="fullName" label="Full name" icon={User} error={shown("fullName")}>
                {(p) => <input {...p} autoComplete="name" value={v.fullName} onChange={set("fullName")} onBlur={blur("fullName")} placeholder="Ada Obi" />}
              </Field>
              <Field id="email" label="Email address" icon={Mail} error={shown("email")}>
                {(p) => <input {...p} type="email" inputMode="email" autoComplete="email" value={v.email} onChange={set("email")} onBlur={blur("email")} placeholder="ada@example.com" />}
              </Field>
            </div>
            <Field id="phone" label="Your phone number" icon={Phone} error={shown("phone")} hint="We'll use this to reach you if you're approved.">
              {(p) => <input {...p} type="tel" inputMode="tel" autoComplete="tel" value={v.phone} onChange={set("phone")} onBlur={blur("phone")} placeholder="0803 123 4567" />}
            </Field>

            <fieldset className="space-y-5 rounded-2xl bg-surface p-4 sm:p-5">
              <legend className="px-2 font-display text-sm font-bold text-brand-dark">What you want</legend>
              <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
                <Field id="item" label="Requested item" icon={Gift} error={shown("item")}>
                  {(p) => <input {...p} value={v.item} onChange={set("item")} onBlur={blur("item")} placeholder="e.g. Ankara dress, sneakers" />}
                </Field>
                <Field id="price" label="Item price" icon={Tag} error={shown("price")} hint="Up to ₦50,000">
                  {(p) => (
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden>₦</span>
                      <input {...p} className={`${p.className as string} pl-9`} inputMode="decimal" value={v.price} onChange={set("price")} onBlur={blur("price")} placeholder="12,500" />
                    </div>
                  )}
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="vendorName" label="Vendor name" icon={Store} error={shown("vendorName")}>
                  {(p) => <input {...p} value={v.vendorName} onChange={set("vendorName")} onBlur={blur("vendorName")} placeholder="Ada's Styles" />}
                </Field>
                <Field id="vendorPhone" label="Vendor phone" icon={Phone} optional error={shown("vendorPhone")}>
                  {(p) => <input {...p} type="tel" inputMode="tel" value={v.vendorPhone} onChange={set("vendorPhone")} onBlur={blur("vendorPhone")} placeholder="0901 234 5678" />}
                </Field>
              </div>
              <Field id="vendorSocial" label="Vendor Instagram or social account" icon={AtSign} error={shown("vendorSocial")} hint="A handle like @vendorname, or a link to their page.">
                {(p) => <input {...p} autoCapitalize="none" value={v.vendorSocial} onChange={set("vendorSocial")} onBlur={blur("vendorSocial")} placeholder="@vendorname" />}
              </Field>
            </fieldset>

            <fieldset className="space-y-4 rounded-2xl border border-berry/20 bg-[#fff7f8] p-4 sm:p-5">
              <legend className="flex items-center gap-1.5 px-2 font-display text-sm font-bold text-berry"><MapPin className="size-4" aria-hidden />Nominate a Pickup Station</legend>
              <p className="text-sm text-ink-2">Pick a shop, pharmacy or mini-mart near you and send us its <strong className="text-ink">location pin</strong>. That pin is what we'll work with. Optional, but nominations are how slots get unlocked.</p>
              <Field id="nomination" label="Shop name" icon={Store} optional error={shown("nomination")}>
                {(p) => <input {...p} value={v.nomination} onChange={set("nomination")} onBlur={blur("nomination")} placeholder="e.g. Greenfield Pharmacy" />}
              </Field>
              <Field id="nominationPin" label="Shop location pin" icon={MapPin} optional error={shown("nominationPin")}
                hint="In Google Maps: open the shop, tap Share, copy the link, paste it here. A pin link or coordinates only.">
                {(p) => <input {...p} inputMode="url" autoCapitalize="none" autoComplete="off" value={v.nominationPin} onChange={set("nominationPin")} onBlur={blur("nominationPin")} placeholder="https://maps.app.goo.gl/…" />}
              </Field>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline underline-offset-2">Open Google Maps</a>
                <button type="button" disabled={locating} onClick={useMyLocation} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-berry/30 bg-white px-4 font-semibold text-berry transition hover:bg-berry/5 disabled:opacity-60">
                  {locating ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Crosshair className="size-4" aria-hidden />}I'm at the shop: use my location
                </button>
              </div>
              <p className="flex items-start gap-2 rounded-xl bg-white p-3 text-sm text-ink-2"><Gift className="mt-0.5 size-4 shrink-0 text-pine" aria-hidden /><span><strong className="text-ink">Tip:</strong> pop in and put in a good word for us. No negotiating, no paperwork. Just get them curious. We'll handle the rest.</span></p>
            </fieldset>

            {/* Honeypot: hidden from people and assistive tech */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>Website<input tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} /></label>
            </div>

            <div>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-2">
                <input
                  id="consent" type="checkbox" checked={consent} className="mt-1 size-5 shrink-0 accent-[#006cdf]"
                  aria-invalid={shown("consent") ? true : undefined} aria-describedby={shown("consent") ? "consent-err" : undefined}
                  onChange={(e) => { setConsent(e.target.checked); setTouched((t) => new Set(t).add("consent")); setErrors(validate(v, e.target.checked)); }}
                />
                <span>
                  I've read the <Link href="/privacy" target="_blank" className="font-semibold text-brand underline underline-offset-2">privacy notice</Link> and understand
                  my details, including a protected record of my network address, are used to verify entries and prevent duplicates.
                </span>
              </label>
              {shown("consent") && <p id="consent-err" role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-berry"><TriangleAlert className="size-4" aria-hidden />{shown("consent")}</p>}
            </div>

            <AnimatePresence>{result && !done && <Banner result={result} />}</AnimatePresence>

            <button
              type="submit"
              disabled={pending}
              className="group flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full bg-brand px-8 py-4 font-display text-sm font-bold uppercase tracking-wide text-white shadow-[0_14px_30px_-12px_rgb(0_108_223/.7)] transition-all hover:-translate-y-0.5 hover:bg-brand-dark active:scale-[.98] disabled:translate-y-0 disabled:cursor-wait disabled:opacity-80"
            >
              {pending ? (<><LoaderCircle className="size-5 animate-spin" aria-hidden />Checking your entry…</>) : (<><Send className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />Submit my application</>)}
            </button>
            <p role="status" className="sr-only">{pending ? "Submitting your application" : ""}</p>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink-3"><Lock className="size-3.5" aria-hidden />Your details are kept private and never shared with other applicants.</p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Banner({ result }: { result: ApiResult }) {
  const warn = result.status === "duplicate_email" || result.status === "ip_blocked";
  const Icon = warn ? Info : TriangleAlert;
  return (
    <motion.div
      role="alert" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      className={`rounded-2xl border p-4 text-sm leading-relaxed ${warn ? "border-gold/60 bg-[#fff8e6] text-[#5a4300]" : "border-berry/30 bg-[#fff1f3] text-[#7a0b1e]"}`}
    >
      <p className="flex items-start gap-2.5"><Icon className="mt-0.5 size-5 shrink-0" aria-hidden /><span>{result.message}</span></p>
      {result.status === "error" && result.detail && (
        <p className="mt-2 rounded-lg bg-white/60 p-2 pl-3 font-mono text-xs break-words">Dev details: {result.detail}</p>
      )}
      {result.status === "ip_blocked" && <Help />}
      {result.status === "duplicate_email" && (
        <p className="mt-2 pl-7">Can't find our email? Check spam, or contact <a className="font-semibold underline" href={`mailto:${SUPPORT}`}>{SUPPORT}</a>.</p>
      )}
    </motion.div>
  );
}

function Help() {
  return (
    <p className="mt-2 pl-7">
      Think this is a mistake? Email <a className="font-semibold underline" href={`mailto:${SUPPORT}?subject=Registration%20review%20request`}>{SUPPORT}</a> from
      the address you applied with and tell us who else shares your network. A person will review it.
    </p>
  );
}

function Outcome({ result }: { result: ApiResult }) {
  const flagged = result.status === "ip_flagged";
  const emailFailed = result.status === "success" && !result.emailSent;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-6 text-center" role="status">
      <div className="relative mx-auto grid size-24 place-items-center">
        {!flagged && [0, 1, 2].map((i) => (
          <motion.span key={i} aria-hidden className="absolute inset-0 rounded-full border-2 border-pine/40"
            initial={{ scale: 0.6, opacity: 0.8 }} animate={{ scale: 1.7, opacity: 0 }} transition={{ duration: 1.6, delay: 0.3 + i * 0.35, repeat: 1 }} />
        ))}
        <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}
          className={`grid size-20 place-items-center rounded-full text-white ${flagged ? "bg-gold" : "bg-pine"}`}>
          {flagged ? <ShieldCheck className="size-10 text-navy" aria-hidden /> : <CircleCheck className="size-10" aria-hidden />}
        </motion.div>
      </div>
      <h3 className="mt-6 text-2xl font-bold sm:text-3xl">
        {flagged ? "Saved, and held for a quick review" : result.status === "resent" ? "Confirmation re-sent" : "You're on the list!"}
      </h3>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-2">{result.message}</p>
      {flagged && <div className="mx-auto mt-3 max-w-md text-left text-sm text-ink-2"><Help /></div>}
      {!flagged && (
        <ul className="mx-auto mt-7 max-w-md space-y-3 text-left text-sm text-ink-2">
          {[
            [Mail, emailFailed ? "Resubmit this form with the same email to get your confirmation email. You won't be entered twice." : "Check your inbox (and spam) for your confirmation email."],
            [MapPin, "We'll review your Pickup Station nomination and speak with the business."],
            [ShieldCheck, "Please don't buy anything until we email you: “You're approved. Go shopping.”"],
          ].map(([I, t], i) => {
            const Icon = I as typeof Mail;
            return (
              <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.15 }} className="flex gap-3 rounded-xl bg-surface p-3.5">
                <Icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />{t as string}
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
