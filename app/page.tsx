import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { Steps } from "@/components/landing/Steps";
import { ClientView } from "@/components/landing/ClientView";
import { ProducerBenefit } from "@/components/landing/ProducerBenefit";
import { Scope } from "@/components/landing/Scope";
import { FAQ } from "@/components/landing/FAQ";
import { CTABand } from "@/components/landing/CTABand";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="w-full bg-white">
      <LandingNav />
      <main>
        <LandingHero />
        <Steps />
        <ClientView />
        <ProducerBenefit />
        <Scope />
        <FAQ />
        <CTABand />
      </main>
      <LandingFooter />
    </div>
  );
}
