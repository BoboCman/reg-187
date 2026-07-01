"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";

export function LandingNav() {
  return (
    <>
      {/* Top bar */}
      <div className="bg-blue-50 text-blue-600 py-2.5 px-4 text-center border-b border-blue-100">
        <p className="text-sm font-medium">
          Best-interest life insurance intake — built for Reg 187, NAIC Model 275, and CFP Board compliance
        </p>
      </div>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 text-xl text-slate-900 no-underline">
            <div className="w-9 h-9 bg-blue-700 rounded-lg grid grid-cols-2 items-center justify-items-center p-[7px] gap-[3px] flex-shrink-0">
              <span className="w-full h-full bg-white rounded-[2px]" />
              <span className="w-full h-full bg-white/65 rounded-[2px]" />
              <span className="w-full h-full bg-white/50 rounded-[2px]" />
              <span className="w-full h-full bg-white/38 rounded-[2px]" />
            </div>
            <span>
              <span className="font-light tracking-wide">Policy</span><span className="font-bold">Plan</span>
            </span>
          </Link>

          {/* Center links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#how-it-works" className="hover:text-blue-700 transition-colors">How It Works</a>
            <a href="#capabilities" className="hover:text-blue-700 transition-colors">Capabilities</a>
            <a href="#who-its-for" className="hover:text-blue-700 transition-colors">Who It&apos;s For</a>
            <a href="#comparison" className="hover:text-blue-700 transition-colors">Before &amp; After</a>
          </div>

          {/* Right CTA */}
          <Button variant="outline" size="sm" asChild>
            <Link href="/app" className="flex items-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5" />
              Open App
            </Link>
          </Button>
        </div>
      </nav>
    </>
  );
}
