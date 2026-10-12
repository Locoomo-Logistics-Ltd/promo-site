import { MotionRoot } from "@/components/Motion";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { ApplyForm } from "@/components/ApplyForm";
import { Apply, Catch, Faq, FairPlay, FinalCta, Footer, HowItWorks, Nominate, Prizes, Rule, Timeline } from "@/components/Sections";

export default function Home() {
  return (
    <MotionRoot>
      <a href="#apply" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:font-bold focus:text-navy">Skip to application form</a>
      <Nav />
      <main>
        <Hero />
        <Prizes />
        <Catch />
        <HowItWorks />
        <Nominate />
        <Rule />
        <Timeline />
        <Apply><ApplyForm /></Apply>
        <FairPlay />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </MotionRoot>
  );
}
