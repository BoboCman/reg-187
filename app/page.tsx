import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { TrustBand } from "@/components/landing/TrustBand";
import { ValueBand } from "@/components/landing/ValueBand";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Capabilities } from "@/components/landing/Capabilities";
import { Deliverables } from "@/components/landing/Deliverables";
import { WhoItsFor } from "@/components/landing/WhoItsFor";
import { ComparisonTable } from "@/components/landing/ComparisonTable";
import { Standards } from "@/components/landing/Standards";
import { WhyStandard } from "@/components/landing/WhyStandard";
import { LifetimeReview } from "@/components/landing/LifetimeReview";
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
        <Deliverables />
        <ValueBand />
        <WhyStandard />
        <Capabilities />
        <WhoItsFor />
        <ComparisonTable />
        <LifetimeReview />
        <Standards />
        <FAQ />
        <CTABand />
      </main>
      <LandingFooter />
    </div>
  );
}
