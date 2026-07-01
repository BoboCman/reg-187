import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export function CTABand() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 bg-[#5468ff] shadow-2xl overflow-hidden rounded-3xl">
            <CardHeader className="text-center p-12 pb-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Start your first best-interest intake
              </h2>
              <p className="text-lg text-white/90 leading-relaxed max-w-2xl mx-auto">
                PolicyPlan is ready to use today — no login, no setup. Open the intake, load the sample case, and see what the confirmation screen produces in under two minutes.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center p-12 pt-6 gap-5">
              <Link
                href="/app"
                className="group inline-flex items-center justify-center bg-white text-[#5468ff] hover:bg-blue-50 text-lg px-10 py-5 rounded-full font-bold shadow-lg hover:shadow-xl transition-all"
              >
                Open PolicyPlan
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <p className="text-white text-base">
                Questions?{" "}
                <a
                  href="mailto:hello@fpai.llc"
                  className="font-bold underline hover:text-white/80 transition-colors"
                >
                  hello@fpai.llc
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
