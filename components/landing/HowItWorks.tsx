import { ClipboardList, FileCheck, Upload } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload the illustration",
    body: "Drop in the carrier\u2019s proposed sales illustration. PolicyPlan reads every page, removes the client\u2019s identity in the browser, and extracts the policy design, guarantees, charges, riders and ledger values.",
  },
  {
    icon: ClipboardList,
    title: "Answer a short profile",
    body: "Capture the client\u2019s objectives, finances and the Reg 187 suitability answers in a few minutes. No re-keying of policy details that are already in the illustration.",
  },
  {
    icon: FileCheck,
    title: "Review, sign and send",
    body: "PolicyPlan drafts a best-interest letter grounded in the illustration and the profile, with favorable and unfavorable considerations. The producer edits, addresses each flagged point, attests and downloads a branded PDF.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-blue-600 mb-4">
            From illustration to signed 187 letter
          </h2>
          <p className="text-slate-600 text-lg mb-2">
            One guided workflow: the carrier illustration and a short client profile become a producer-approved, client-ready best-interest letter and an approval record.
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
