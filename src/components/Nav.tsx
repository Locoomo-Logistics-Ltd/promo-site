"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./ui";

const LINKS = [["The pot", "#prizes"], ["How it works", "#how"], ["Pickup Stations", "#nominate"], ["FAQ", "#faq"]] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${solid || open ? "bg-navy/95 backdrop-blur-md shadow-lg" : "bg-transparent"}`}>
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo light />
        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map(([l, h]) => (
            <li key={h}><a href={h} className="text-sm font-medium text-white/80 transition-colors hover:text-white">{l}</a></li>
          ))}
          <li>
            <a href="#apply" className="rounded-full bg-gold px-5 py-2 font-display text-xs font-semibold uppercase tracking-wide text-navy transition hover:-translate-y-0.5 hover:bg-[#ffc962]">Apply now</a>
          </li>
        </ul>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full text-white md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>
      </nav>
      {open && (
        <ul id="mobile-menu" className="space-y-1 border-t border-white/10 px-4 pb-5 pt-3 md:hidden">
          {[...LINKS, ["Apply now", "#apply"] as const].map(([l, h]) => (
            <li key={h}><a href={h} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-base font-medium text-white/90 hover:bg-white/10">{l}</a></li>
          ))}
        </ul>
      )}
    </header>
  );
}
