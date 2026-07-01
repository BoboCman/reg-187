import Link from "next/link";
import { ArrowRight, ExternalLink, ShieldCheck, Users, Building2, Briefcase } from "lucide-react";

export function LandingHero() {
  return (
    <section className="min-h-[85vh] flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50/50 py-24 relative overflow-hidden">
      {/* Decorative dot-grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "radial-gradient(#1d4ed8 0.4px, transparent 0.4px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">

          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <ShieldCheck className="w-4 h-4" />
            Reg 187 &middot; NAIC Model 275 &middot; CFP Board
          </div>

          {/* H1 */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight leading-[1.08] mb-6">
            Best-interest intake that{" "}
            <span className="text-blue-700">infers the right design</span>{" "}
            from the client profile
          </h1>

          {/* Subhead */}
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl leading-relaxed mb-10">
            PolicyPlan is a 7-step advisor intake that collects every suitability signal required by Reg 187, NAIC Model 275, and the CFP Board — then automatically derives design emphasis so you never ask the client to rank what they can&apos;t evaluate.
          </p>

          {/* Audience chips */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500 mb-10">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Independent Advisors
            </span>
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              BD &amp; RIA Compliance Teams
            </span>
            <span className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              IMO / FMO Back-Office
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Fiduciary Planners
            </span>
          </div>

          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/app"
              className="group inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-base bg-blue-700 hover:bg-blue-800 text-white shadow-lg shadow-blue-700/20 hover:shadow-xl hover:shadow-blue-700/25 transition-all"
            >
              Start an intake
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="group inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-base border-2 border-blue-600 text-blue-700 hover:border-blue-700 hover:bg-blue-50 transition-all"
            >
              See how it works
              <ExternalLink className="w-4 h-4 ml-2 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
