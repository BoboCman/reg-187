import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="bg-white border-t border-slate-200 py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-blue-700 rounded-lg grid grid-cols-2 items-center justify-items-center p-[6px] gap-[2px] flex-shrink-0">
                  <span className="w-full h-full bg-white rounded-[2px]" />
                  <span className="w-full h-full bg-white/65 rounded-[2px]" />
                  <span className="w-full h-full bg-white/50 rounded-[2px]" />
                  <span className="w-full h-full bg-white/38 rounded-[2px]" />
                </div>
                <span className="text-lg text-slate-900">
                  <span className="font-light tracking-wide">Policy</span><span className="font-bold">Plan</span>
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Best-interest life insurance intake. Reg 187 &middot; NAIC Model 275 &middot; CFP Board.
              </p>
              <a
                href="https://fpai.llc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-800 font-medium transition-colors"
              >
                fpai.llc
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Quick Links */}
            <div>
              <p className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Quick Links</p>
              <ul className="space-y-2.5 text-sm text-slate-600">
                {[
                  { label: "Home", href: "/" },
                  { label: "Capabilities", href: "#capabilities" },
                  { label: "How It Works", href: "#how-it-works" },
                  { label: "Who It's For", href: "#who-its-for" },
                  { label: "Before & After", href: "#comparison" },
                  { label: "Open App", href: "/app" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-blue-700 transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Company</p>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li>
                  <Link href="/privacy" className="hover:text-blue-700 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-blue-700 transition-colors">
                    Terms of Use
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8 text-center">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} FPAI LLC. All rights reserved. PolicyPlan is not a licensed insurance product or regulated service.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
