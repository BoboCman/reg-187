import { ClipboardList, BrainCircuit, FileCheck } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    title: "Intake",
    body: "Capture the client's insurance need, financial profile, ownership structure, existing coverage, funding source, risk tolerance, product objectives, and case context in a structured web experience designed around the New York Reg 187 best-interest process.",
  },
  {
    icon: BrainCircuit,
    title: "Recommend",
    body: "PolicyPlan drafts a starting rationale from the producer\u2019s own intake answers and case details, including favorable considerations, tradeoffs, assumptions, and items to review. The producer edits the rationale and resolves each flagged tension in their own words, so the documented basis is authored by the producer and tied to the client\u2019s facts, objectives, and tradeoffs.",
  },
  {
    icon: FileCheck,
    title: "Document",
    body: "The producer reviews, edits, approves, and exports a client-ready recommendation summary, a carrier support packet, and a versioned case record.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-blue-600 mb-4">
            From intake to recommendation file
          </h2>
          <p className="text-slate-600 text-lg mb-2">
            One guided workflow for the life insurance recommendation process, from client context to producer-approved rationale, client-ready summary, carrier output, and case record.
          </p>
          <p className="text-slate-400 text-sm">
            Three stages. Web-based. Producer-controlled.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex flex-col items-center text-center">
                {/* Round icon container like TOLI */}
                <div className="bg-blue-50 text-blue-600 rounded-full p-6 mb-6">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-800 mb-3 text-xl">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-16 max-w-3xl mx-auto border-t border-slate-100 pt-8 text-center">
          <p className="text-sm text-slate-400 leading-relaxed">
            Built for the professionals managing life insurance recommendations — and the firms that work with them.
          </p>
        </div>
      </div>
    </section>
  );
}
