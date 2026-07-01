import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowRight, LogIn } from "lucide-react";

const CALENDLY_URL = "[PLACEHOLDER: Calendly link]";
const CONTACT_EMAIL = "[PLACEHOLDER: contact email]";

export function CTABand() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 bg-[#5468ff] shadow-2xl overflow-hidden rounded-3xl">
            <CardHeader className="text-center p-12 pb-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                See the life insurance recommendation workflow in action
              </h2>
              <p className="text-lg text-white/90 leading-relaxed max-w-2xl mx-auto">
                A short walkthrough with real case flow, sample recommendation summaries, and carrier-ready output.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center p-12 pt-4 gap-5">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <a
                  href={CALENDLY_URL}
                  className="group inline-flex items-center justify-center bg-white text-[#5468ff] hover:bg-blue-50 text-base px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all"
                >
                  Book a Walkthrough
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                </a>
                <Link
                  href="/app"
                  className="inline-flex items-center justify-center border-2 border-white/40 hover:border-white text-white text-base px-8 py-4 rounded-full font-semibold transition-all"
                >
                  View Sample Report
                </Link>
              </div>
              <div className="flex items-center gap-3 text-white/80 text-sm">
                <LogIn className="w-4 h-4" />
                <span>
                  Already have access?{" "}
                  <Link href="/app" className="font-bold text-white underline hover:text-white/80 transition-colors">
                    Sign In
                  </Link>
                </span>
              </div>
              <p className="text-white/70 text-sm">
                Questions?{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-semibold text-white/90 hover:text-white transition-colors"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
