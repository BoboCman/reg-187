import Link from "next/link";
import { ArrowRight, ShieldCheck, Users, Building2, Briefcase, LayoutGrid, ExternalLink } from "lucide-react";

const CALENDLY_URL = "https://calendly.com/financialplanner-ai-support/30min";

export function LandingHero() {
  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">

          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-10 border border-blue-100">
            <ShieldCheck className="w-4 h-4" />
            New York Reg 187 · Best-interest documentation
          </div>

          {/* H1 */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight leading-[1.05] mb-6 text-balance">
            Best-interest documentation for{" "}
            <span className="text-blue-600">life insurance recommendations</span>
          </h1>

          {/* Subhead */}
          <p className="text-xl text-slate-500 max-w-2xl leading-relaxed mb-4">
            A structured workspace for intake, recommendation rationale, advisor approval, client-ready summaries, carrier-support documentation, and versioned case records — built around the New York Reg 187 best-interest process.
          </p>

          {/* Supporting line */}
          <p className="text-base text-slate-400 max-w-2xl leading-relaxed mb-12">
            PolicyPlan moves advisors and firms from scattered notes, static PDFs, carrier-specific forms, and hand-written narratives to a consistent recommendation file. Advisors get more than a record for the file — they get a clear client-facing summary that explains why the recommendation fits.
          </p>

          {/* Audience chips */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500 mb-12">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              For Advisors
            </span>
            <span className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              BGAs &amp; IMOs
            </span>
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Insurance Firms &amp; BDs
            </span>
            <span className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-blue-600" />
              Carrier Workflows
            </span>
          </div>

          {/* Dual CTA — primary: Schedule Demo, secondary: View Sample Client Summary */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/app"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg font-semibold text-base border-2 border-blue-700 text-blue-700 hover:bg-blue-50 transition-all gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View Sample Output
            </Link>
            <a
              href={CALENDLY_URL}
              className="group inline-flex items-center justify-center px-8 py-4 rounded-lg font-semibold text-base bg-blue-700 hover:bg-blue-800 text-white transition-all"
            >
              Schedule Demo
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
