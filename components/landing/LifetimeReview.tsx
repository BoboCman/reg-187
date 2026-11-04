import { RefreshCw } from "lucide-react";

export function LifetimeReview() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-blue-50 p-8 md:p-12 flex flex-col md:flex-row gap-8 md:items-center">
          <div className="bg-white text-blue-600 rounded-2xl p-5 shadow-sm ring-1 ring-slate-200 w-fit shrink-0">
            <RefreshCw className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 mb-2">Coming next</p>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">From the letter to a lifetime of reviews</h2>
            <p className="text-slate-500 leading-relaxed max-w-3xl">
              The letter records the design, the guarantees and the illustrated values at the moment of sale. That becomes the baseline for each annual policy review, so the producer can show the client whether the policy is still on the plan they agreed to, and act early when it is not.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
