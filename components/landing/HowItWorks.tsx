import { ClipboardList, BrainCircuit, FileCheck } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: ClipboardList,
    title: "Intake",
    body: "Capture the client's insurance need, financial profile, ownership structure, existing coverage, funding source, risk tolerance, and product objectives in a structured web experience designed around the New York Reg 187 best-interest process.",
  },
  {
    number: "02",
    icon: BrainCircuit,
    title: "Recommend",
    body: "PolicyPlan turns the advisor's answers and case details into a draft recommendation rationale, with favorable considerations, tradeoffs, assumptions, and items to review. It also derives the client's design emphasis from the profile, so you never ask clients to rank what they cannot meaningfully evaluate.",
  },
  {
    number: "03",
    icon: FileCheck,
    title: "Document",
    body: "The advisor reviews, edits, approves, and exports a client-ready recommendation summary, a carrier-ready packet, and a versioned case record.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-blue-700 mb-4">
            From intake to recommendation file
          </h2>
          <p className="text-slate-600 text-lg mb-2">
            One guided workflow for the life insurance recommendation process, from client context to advisor-approved documentation.
          </p>
          <p className="text-slate-500 text-base">
            Three stages. Web-based. Advisor-controlled.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="bg-blue-50 text-blue-700 rounded-full p-5 ring-4 ring-blue-50">
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-700 text-white text-[11px] font-bold flex items-center justify-center">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mb-3 text-xl">{step.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{step.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
