import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";

export const CALENDLY_URL = "https://calendly.com/financialplanner-ai-support/30min";

export function LandingHero() {
  return (
    <section className="bg-white pt-20 pb-16 sm:pt-28 sm:pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="mb-8 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">PolicyPlan · Illustration Companion</p>
          <h1 className="mb-6 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
            A clearer way to explain a life insurance proposal.
          </h1>
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Upload the carrier&apos;s sales illustration, capture the client&apos;s main objective, and prepare a concise, evidence-backed companion that helps explain the design, the assumptions, and what matters before a decision.
          </p>
          <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
            <Link href="/sample-companion" className="group inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-blue-800 sm:w-auto">
              <FileText className="mr-2 h-4 w-4" />
              See a Sample Companion
            </Link>
            <a href={CALENDLY_URL} className="group inline-flex w-full items-center justify-center rounded-lg border-2 border-blue-700 px-8 py-4 text-base font-semibold text-blue-700 transition-all hover:bg-blue-50 sm:w-auto">
              Request a Pilot
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
          <p className="mt-10 text-sm text-slate-500">
            Carrier illustration stays authoritative <span aria-hidden="true">·</span> Producer reviews before sharing <span aria-hidden="true">·</span> No automated policy recommendation
          </p>
        </div>
      </div>
    </section>
  );
}
