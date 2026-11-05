import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata = {
  title: "Sample Policy Story — PolicyPlan",
  description: "A fictional Apartment Complex story for an indexed universal life proposal, rendered by PolicyPlan from a fictional carrier illustration.",
};

export default function SampleStoryPage() {
  return (
    <div className="w-full bg-white">
      <LandingNav />
      <main className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Sample story</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">The Apartment Complex</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            A pre-sale story for an indexed universal life proposal: what the design is built to do, shown as an apartment complex that is built, leased up and then works for its owner. Rendered by the same pipeline advisors use, from a fictional carrier illustration with fictional people. Fictional demonstration, not a live insurance proposal.
          </p>
          <div className="mt-3 text-sm">
            <a href="/sample-story/html" target="_blank" rel="noopener" className="font-medium text-blue-700 hover:underline">
              Open full page
            </a>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
            <iframe title="Sample Apartment story" src="/sample-story/html" className="h-[80vh] min-h-[640px] w-full bg-white" />
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
