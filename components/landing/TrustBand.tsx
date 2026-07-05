import { CheckCircle2 } from "lucide-react";

const pillars = [
  "Structured intake",
  "Producer approval",
  "Versioned records",
  "No automatic recommendation",
  "No client data used to train public AI models",
];

export function TrustBand() {
  return (
    <div className="bg-slate-50 border-t border-b border-slate-200 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.18em]">
            Built for professional case documentation
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {pillars.map((p) => (
              <span key={p} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
