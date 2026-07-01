"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const CALENDLY_URL = "https://calendly.com/financialplanner-ai-support/30min";

export function LandingNav() {
  return (
    <>
      {/* Announcement bar */}
      <div className="bg-blue-50 border-b border-blue-100 py-2.5 px-4 text-center">
        <p className="text-sm font-medium text-blue-700">
          Best-interest documentation and client-ready recommendation summaries for New York life insurance cases.
        </p>
      </div>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline flex-shrink-0">
            <div className="w-9 h-9 bg-blue-700 rounded-lg grid grid-cols-2 items-center justify-items-center p-[7px] gap-[3px]">
              <span className="w-full h-full bg-white rounded-[2px]" />
              <span className="w-full h-full bg-white/65 rounded-[2px]" />
              <span className="w-full h-full bg-white/50 rounded-[2px]" />
              <span className="w-full h-full bg-white/38 rounded-[2px]" />
            </div>
            <span className="text-xl text-slate-900">
              <span className="font-light tracking-wide">Policy</span><span className="font-bold">Plan</span>
            </span>
          </Link>

          {/* Center links */}
          <div className="hidden lg:flex items-center gap-7 text-sm text-slate-500">
            <a href="#capabilities" className="hover:text-slate-900 transition-colors">Capabilities</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#who-its-for" className="hover:text-slate-900 transition-colors">Who It&apos;s For</a>
            <a href="#comparison" className="hover:text-slate-900 transition-colors">Before &amp; After</a>
            <a href="#standards" className="hover:text-slate-900 transition-colors">Standards</a>
          </div>

          {/* Right CTAs */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex text-slate-600 hover:text-slate-900">
              <Link href="/app">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg px-4">
              <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">Book a Walkthrough</a>
            </Button>
          </div>

        </div>
      </nav>
    </>
  );
}
