import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

export const metadata = {
  title: "Coming Soon — PolicyPlan",
  description: "Sample outputs are coming soon. Return to the PolicyPlan home page to learn more.",
};

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-8">
          <Clock className="w-8 h-8 text-blue-600" />
        </div>

        {/* Wordmark */}
        <p className="text-sm font-medium text-slate-400 mb-6 tracking-wide uppercase">
          <span className="font-light">Policy</span><span className="font-bold">Plan</span>
        </p>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          Sample outputs coming soon
        </h1>

        {/* Body */}
        <p className="text-slate-500 leading-relaxed mb-10">
          We&apos;re preparing sample advisor support documents and client-ready recommendation summaries. Check back shortly, or schedule a walkthrough to see the full workflow live.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <a
            href="https://calendly.com/financialplanner-ai-support/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition-all"
          >
            Schedule a Demo
          </a>
        </div>

      </div>
    </div>
  );
}
