import Link from "next/link";
import { ExternalLink } from "lucide-react";

const FPAI_URL = "https://financialplanner-ai.com";

export function LandingFooter() {
  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">

          {/* 2-column grid */}
          <div className="grid md:grid-cols-2 gap-12 mb-12">

            {/* Brand column */}
            <div>
              <p className="text-xl font-normal tracking-tight text-slate-900 mb-1">
                <span className="font-light">Policy</span><span className="font-bold">Plan</span>
              </p>
              <p className="text-xs text-slate-400 mb-4">Built by Financial Planner AI</p>
              <a
                href={FPAI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Explore Our AI Solutions
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Company column */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-5">
                Company
              </p>
              <ul className="space-y-3">
                <li>
                  <Link href="/privacy" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                    Terms of Use
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="border-t border-slate-200 pt-8 text-center">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} Financial Planner AI, LLC. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}
