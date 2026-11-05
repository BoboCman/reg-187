import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";

const CALENDLY_URL = "https://calendly.com/financialplanner-ai-support/30min";
const CONTACT_EMAIL = "rpc@financialplanner-ai.com";

export function CTABand() {
  return (
    <section className="py-20 sm:py-24 bg-slate-50 border-t border-slate-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">

          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4">
            Try it on your own cases
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            A 30-minute walkthrough with one of your own illustrations, from upload to the reviewed companion.
          </p>

          {/* Pilot block */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-8 py-7 mb-10 text-left max-w-xl mx-auto">
            <h3 className="text-base font-bold text-slate-800 mb-2">Pilot with a small group</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              A defined group of producers uses the Companion on real cases, internally first. Client use starts only after your firm approves the format.
            </p>
          </div>

          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <a
              href={CALENDLY_URL}
              className="group inline-flex items-center justify-center px-8 py-4 rounded-lg font-semibold text-base bg-blue-700 hover:bg-blue-800 text-white transition-all"
            >
              Request a Pilot
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a
              href="/sample-companion"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg font-semibold text-base border-2 border-blue-700 text-blue-700 hover:bg-blue-50 transition-all"
            >
              See a Sample Companion
            </a>
          </div>

          {/* Sign-in and contact lines */}
          <div className="flex flex-col items-center gap-3 text-sm text-slate-400">
            <span className="flex items-center gap-2">
              <LogIn className="w-4 h-4" />
              Already have access?{" "}
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors ml-1">
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
