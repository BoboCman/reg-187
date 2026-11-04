import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";

const CALENDLY_URL = "https://calendly.com/financialplanner-ai-support/30min";
const CONTACT_EMAIL = "rpc@financialplanner-ai.com";

export function CTABand() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">

          <h2 className="text-3xl md:text-4xl font-bold text-blue-600 mb-4">
            See a letter built from your own case
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            A 30-minute walkthrough: we upload one of your illustrations and you see the signed letter at the end.
          </p>

          {/* Pilot block — Edit 3a */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-8 py-7 mb-10 text-left max-w-xl mx-auto">
            <h3 className="text-base font-bold text-slate-800 mb-2">Test it in a 90-day pilot</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              A signed best-interest letter on every case for 90 days, with a defined group of producers, your own cases, a shared scorecard and a clear go or no-go at the end.
            </p>
          </div>

          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <a
              href={CALENDLY_URL}
              className="group inline-flex items-center justify-center px-8 py-4 rounded-lg font-semibold text-base bg-blue-700 hover:bg-blue-800 text-white transition-all"
            >
              Schedule Demo
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a
              href={CALENDLY_URL}
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg font-semibold text-base border-2 border-blue-700 text-blue-700 hover:bg-blue-50 transition-all"
            >
              Ask About a 90-Day Pilot
            </a>
          </div>

          {/* Sign-in and contact lines */}
          <div className="flex flex-col items-center gap-3 text-sm text-slate-400">
            <span className="flex items-center gap-2">
              <LogIn className="w-4 h-4" />
              Already have access?{" "}
              <Link href="/app" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors ml-1">
                Sign In
              </Link>
            </span>
            <span>
              Questions?{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                {CONTACT_EMAIL}
              </a>
            </span>
          </div>

        </div>
      </div>
    </section>
  );
}
