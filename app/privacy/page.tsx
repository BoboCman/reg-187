import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata = { title: "Privacy Policy — PolicyPlan", robots: { index: false } };

/**
 * PLACEHOLDER. No binding legal text has been authored here on purpose.
 * The owner and counsel must supply the approved Privacy Policy before public go-live.
 */
export default function Page() {
  return (
    <div className="w-full bg-white">
      <LandingNav />
      <main className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            This page is being prepared and has not been published yet. For questions in the meantime, write to{" "}
            <a className="font-medium underline" href="mailto:rpc@financialplanner-ai.com">
              rpc@financialplanner-ai.com
            </a>
            .
          </p>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
