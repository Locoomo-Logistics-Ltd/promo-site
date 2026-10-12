import type { Metadata } from "next";
import { Logo } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy notice | Locoomo Christmas Shopping Fund" };

const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info@locoomo.com";

export default function Privacy() {
  const h = "mt-10 text-xl font-bold";
  return (
    <>
      <header className="bg-navy py-4"><div className="mx-auto max-w-3xl px-4 sm:px-6"><Logo light /></div></header>
      <main className="mx-auto max-w-3xl px-4 py-14 leading-relaxed text-ink-2 sm:px-6">
        <h1 className="text-3xl font-extrabold text-ink sm:text-4xl">Privacy notice</h1>
        <p className="mt-2 text-sm">Locoomo Christmas Shopping Fund · applies to the application form on this site</p>

        <h2 className={h}>What we collect</h2>
        <p className="mt-2">Your full name, email address and phone number; the item you want, its price, and your vendor's name, optional phone number and Instagram or other social account; an optional Pickup Station nomination; and the network (IP) address your application was sent from.</p>

        <h2 className={h}>Why we use it</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>To assess your application and contact you about it, including the confirmation email and any approval decision.</li>
          <li>To verify your vendor and Pickup Station nomination.</li>
          <li>To prevent duplicate and fraudulent entries: each email address may apply once, and we compare network addresses to spot several entries from the same connection.</li>
        </ul>

        <h2 className={h}>How we treat IP addresses</h2>
        <p className="mt-2">We read your IP address on our server from the connection itself, never from anything your browser tells us. We do not store it in readable form: it is converted to a one-way keyed hash, which lets us tell whether two entries came from the same network without being able to see the address. The same IP is a signal for review, not proof of wrongdoing. Households, offices, campuses and mobile networks often share one address, so a match leads to a manual check by a person and never to an automatic accusation.</p>

        <h2 className={h}>Where it is stored and who sees it</h2>
        <p className="mt-2">Applications are stored in a private Google Sheet accessible only to authorised Locoomo campaign staff. Confirmation emails are sent through Resend. We do not sell your information or show it to other applicants. If you are approved, we will share only the details needed to fulfil your order with your vendor.</p>

        <h2 className={h}>How long we keep it</h2>
        <p className="mt-2">We keep application records for the duration of the campaign and a reasonable period afterwards to resolve disputes and prevent repeat abuse, then delete or anonymise them.</p>

        <h2 className={h}>Your rights, and if you were flagged by mistake</h2>
        <p className="mt-2">You can ask to see, correct or delete your information at any time. If you were told another registration from your network already exists and you believe that is wrong, for example because you share a home or office with someone who applied, email <a className="font-semibold text-brand underline" href={`mailto:${support}?subject=Registration%20review%20request`}>{support}</a> from the address you applied with. Tell us who else may share your network. A person will review it and reply.</p>
        <p className="mt-10 text-sm"><a href="/" className="font-semibold text-brand underline">Back to the campaign</a></p>
      </main>
    </>
  );
}
