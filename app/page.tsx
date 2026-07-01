import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { TrustBand } from "@/components/landing/TrustBand";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Capabilities } from "@/components/landing/Capabilities";
import { Deliverables } from "@/components/landing/Deliverables";
import { WhoItsFor } from "@/components/landing/WhoItsFor";
import { ForFirms } from "@/components/landing/ForFirms";
import { ComparisonTable } from "@/components/landing/ComparisonTable";
import { Standards } from "@/components/landing/Standards";
import { PositioningBand } from "@/components/landing/PositioningBand";
import { FAQ } from "@/components/landing/FAQ";
import { CTABand } from "@/components/landing/CTABand";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="w-full bg-white">
      <LandingNav />
      <main>
        <LandingHero />
        <TrustBand />
        <HowItWorks />
        <Capabilities />
        <Deliverables />
        <WhoItsFor />
        <ForFirms />
        <ComparisonTable />
        <Standards />
        <PositioningBand />
        <FAQ />
        <CTABand />
      </main>
      <LandingFooter />
    </div>
  );
}
