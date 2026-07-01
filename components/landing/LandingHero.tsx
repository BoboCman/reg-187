import Link from "next/link";
import { ArrowRight, ShieldCheck, Users, Building2, Briefcase, LayoutGrid } from "lucide-react";

const CALENDLY_URL = "[PLACEHOLDER: Calendly link]";

export function LandingHero() {
  return (
    <section className="min-h-[90vh] flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50/50 py-28 relative overflow-hidden">
      {/* Dot-grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "radial-gradient(#1d4ed8 0.4px, transparent 0.4px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-8 tracking-wide">
            <ShieldCheck className="w-4 h-4" />
            New York Reg 187 &middot; Best-interest documentation
          </div>

          {/* H1 */}
          <h1 className="text-4xl md:text-6xl lg:text-[4.5rem] font-bold text-slate-900 tracking-tight leading-[1.06] mb-6 text-balance">
            Best-interest documentation for life insurance recommendations
          </h1>

          {/* Subhead */}
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl leading-relaxed mb-5">
            PolicyPlan is a structured workspace for intake, recommendation rationale, advisor approval, carrier-ready documentation, and versioned case records, built around the New York Reg 187 best-interest process.
          </p>

          {/* Supporting line */}
          <p className="text-base text-slate-500 max-w-2xl leading-relaxed mb-10">
            Move from scattered notes, static PDFs, and hand-written narratives to a consistent recommendation file that supports the advisor conversation, supervisory review, and carrier submission. It is not another form. It is the case record for the recommendation.
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

          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href={CALENDLY_URL}
              className="group inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-base bg-blue-700 hover:bg-blue-800 text-white shadow-lg shadow-blue-700/20 hover:shadow-xl hover:shadow-blue-700/25 transition-all"
            >
              Book a Walkthrough
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <Link
              href="/app"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-base border-2 border-slate-300 text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all"
            >
              View Sample Report
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
