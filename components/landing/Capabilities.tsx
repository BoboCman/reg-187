import { ScanSearch, Sigma, Scale, UserCog } from "lucide-react";

const capabilities = [
  {
    icon: ScanSearch,
    label: "Reads the illustration",
    title: "Every page, every number",
    bullets: [
      "Extracts the design, premiums, guarantees, charges, riders and ledger values",
      "Works with any carrier\u2019s sales illustration",
      "Client names are removed in the browser before anything is sent",
    ],
  },
  {
    icon: Sigma,
    label: "Grounded",
    title: "No invented facts",
    bullets: [
      "The letter may only use the profile and the illustration",
      "Quotes the carrier\u2019s own wording, checked word for word",
      "Every dollar figure, age and rate is checked against the source",
    ],
  },
  {
    icon: Scale,
    label: "Balanced",
    title: "Flags what to weigh",
    bullets: [
      "Premium against income and liquid net worth",
      "Guarantee preference against reliance on non-guaranteed values",
      "Total premium against the death benefit, and coverage on guaranteed assumptions",
      "Replacement considerations when existing coverage is involved",
    ],
  },
  {
    icon: UserCog,
    label: "Producer-controlled",
    title: "The producer signs",
    bullets: [
      "Edit any sentence before approval",
      "Address every flagged point in your own words",
      "Attest, approve and download a branded PDF",
      "No automatic recommendation and no automatic sign-off",
    ],
  },
];

export function Capabilities() {
  return (
    <section id="capabilities" className="py-24 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-600 mb-4">
              What makes the letter defensible
            </h2>
            <p className="text-slate-500 text-xl max-w-3xl mx-auto leading-relaxed">
              A best-interest letter is only as good as its facts. PolicyPlan reads the carrier illustration, keeps the writing tied to it, and leaves the judgment to the producer.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {capabilities.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="bg-blue-50 text-blue-600 rounded-lg p-2.5 flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-0.5">{cap.label}</p>
                      <h3 className="text-base font-bold text-slate-800 leading-tight">{cap.title}</h3>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {cap.bullets.map((b, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-slate-500 leading-relaxed">
                        <span className="text-blue-500 mt-1 flex-shrink-0 text-[8px]">&#x25CF;</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
