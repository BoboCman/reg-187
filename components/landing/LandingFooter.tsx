import Link from "next/link";
import { ExternalLink } from "lucide-react";

const FPAI_URL = "[PLACEHOLDER: link]";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Who It's For", href: "#who-its-for" },
  { label: "Before & After", href: "#comparison" },
  { label: "Standards", href: "#standards" },
  { label: "Sign In", href: "/app" },
];

export function LandingFooter() {
  return (
    <footer className="bg-slate-900 py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-12">

            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 bg-blue-600 rounded-lg grid grid-cols-2 items-center justify-items-center p-[6px] gap-[2px] flex-shrink-0">
                  <span className="w-full h-full bg-white rounded-[2px]" />
                  <span className="w-full h-full bg-white/65 rounded-[2px]" />
                  <span className="w-full h-full bg-white/50 rounded-[2px]" />
                  <span className="w-full h-full bg-white/38 rounded-[2px]" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] font-medium text-slate-400 tracking-widest uppercase">Built by Financial Planner AI</span>
                  <span className="text-lg text-white">
                    <span className="font-light tracking-wide">Policy</span><span className="font-bold">Plan</span>
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-400 mt-4 mb-5 leading-relaxed">
                Best-interest documentation for life insurance recommendations. New York Reg 187.
              </p>
              <a
                href={FPAI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Explore Our AI Solutions
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Quick Links */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Links</p>
              <ul className="space-y-2.5 text-sm text-slate-400">
                {quickLinks.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Company</p>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms of Use
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-xs text-slate-500 leading-relaxed max-w-3xl mx-auto">
              &copy; {new Date().getFullYear()} Financial Planner AI, LLC. All rights reserved. PolicyPlan supports the best-interest documentation process. It is not an insurance product, carrier illustration, legal or tax opinion, underwriting decision, or licensed producer recommendation.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
