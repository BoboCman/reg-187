import { ClipboardList, BrainCircuit, FileCheck } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    title: "Collect the full suitability profile",
    body: "Seven structured steps gather insured identity, ownership, objectives, financial profile, existing coverage, risk preferences, and policy specifications — in the needs-first order required by Reg 187 and NAIC Model 275.",
  },
  {
    icon: BrainCircuit,
    title: "Design emphasis is inferred, not guessed",
    body: "A transparent rule-based algorithm derives four design signals — guarantee protection, growth orientation, cash access, and cost sensitivity — directly from the answers already collected. No extra questions, no advisor intuition required.",
  },
  {
    icon: FileCheck,
    title: "A fully structured payload, ready to route",
    body: "The completed intake validates against a versioned Zod schema and produces a typed PolicyPlanIntake object. Phase 2 routes it to Supabase, n8n, and the signal library to generate the best-interest recommendation narrative automatically.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-blue-700 mb-4">
            How PolicyPlan works
          </h2>
          <p className="text-slate-600 text-lg mb-4">
            Three stages — collect, infer, deliver — mapped to the regulatory requirement chain.
          </p>
          <p className="text-slate-500 text-base">
            Every field in the intake traces to a published regulatory requirement. Nothing is collected for its own sake.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10 mb-14 max-w-5xl mx-auto">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="bg-blue-50 text-blue-700 rounded-full p-4 mb-5 ring-4 ring-blue-50">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2 text-lg">{step.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{step.body}</p>
              </div>
            );
          })}
        </div>

        <p className="text-slate-500 text-base leading-relaxed max-w-2xl mx-auto text-center border-t border-slate-100 pt-10">
          The intake is Phase 1 of a three-phase pipeline. Phase 2 adds server-side signal scoring and narrative generation. Phase 3 adds carrier illustration sync via ATLAS.
        </p>
      </div>
    </section>
  );
}
