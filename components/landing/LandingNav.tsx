"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

const CALENDLY_URL = "[PLACEHOLDER: Calendly link]";

export function LandingNav() {
  return (
    <>
      {/* Announcement bar */}
      <div className="bg-blue-700 text-white py-2.5 px-4 text-center">
        <p className="text-sm font-medium tracking-wide">
          Best-interest documentation for life insurance recommendations. Built for New York Reg 187.
        </p>
      </div>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline flex-shrink-0">
            <div className="w-9 h-9 bg-blue-700 rounded-lg grid grid-cols-2 items-center justify-items-center p-[7px] gap-[3px]">
              <span className="w-full h-full bg-white rounded-[2px]" />
              <span className="w-full h-full bg-white/65 rounded-[2px]" />
              <span className="w-full h-full bg-white/50 rounded-[2px]" />
              <span className="w-full h-full bg-white/38 rounded-[2px]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-medium text-slate-400 tracking-widest uppercase">Built by Financial Planner AI</span>
              <span className="text-xl text-slate-900">
                <span className="font-light tracking-wide">Policy</span><span className="font-bold">Plan</span>
              </span>
            </div>
          </Link>

          {/* Center links */}
          <div className="hidden lg:flex items-center gap-7 text-sm text-slate-600">
            <a href="#capabilities" className="hover:text-blue-700 transition-colors">Capabilities</a>
            <a href="#how-it-works" className="hover:text-blue-700 transition-colors">How It Works</a>
            <a href="#who-its-for" className="hover:text-blue-700 transition-colors">Who It&apos;s For</a>
            <a href="#comparison" className="hover:text-blue-700 transition-colors">Before &amp; After</a>
            <a href="#standards" className="hover:text-blue-700 transition-colors">Standards</a>
          </div>

          {/* Right CTAs */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex text-slate-600 hover:text-slate-900">
              <Link href="/app">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="bg-blue-700 hover:bg-blue-800 text-white">
              <a href={CALENDLY_URL} className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Book a Walkthrough
              </a>
            </Button>
          </div>

        </div>
      </nav>
    </>
  );
}
