import {
  UserCheck,
  BrainCircuit,
  AlertTriangle,
  UserCog,
  FileOutput,
  FolderOpen,
} from "lucide-react";

const capabilities = [
  {
    icon: UserCheck,
    label: "Client context",
    title: "Intake",
    bullets: [
      "Plain-language advisor workflow",
      "Captures goals, ownership, funding, and financial profile",
      "Identifies the consumer, insured, owner, trust, or business context",
    ],
  },
  {
    icon: BrainCircuit,
    label: "Recommendation basis",
    title: "AI-assisted rationale",
    bullets: [
      "Drafts the \u201cwhy\u201d behind the recommendation",
      "Summarizes favorable and unfavorable considerations",
      "Connects product design to the client\u2019s stated objectives",
    ],
  },
  {
    icon: AlertTriangle,
    label: "Case design fit",
    title: "Review flags",
    bullets: [
      "Premium fit against funding source",
      "Death benefit duration against the stated need horizon",
      "Guarantees, riders, and non-guaranteed elements",
      "Existing policy and replacement considerations",
    ],
  },
  {
    icon: UserCog,
    label: "Advisor approval",
    title: "Human controlled",
    bullets: [
      "The advisor reviews and edits every rationale",
      "Attestation before final output",
      "No black-box recommendation and no automatic sign-off",
    ],
  },
  {
    icon: FileOutput,
    label: "Carrier output",
    title: "Submission ready",
    bullets: [
      "Configurable, carrier-ready documentation",
      "Best-interest summary and support packet",
      "Built to reduce back-and-forth and incomplete files",
    ],
  },
  {
    icon: FolderOpen,
    label: "Audit trail",
    title: "Versioned record",
    bullets: [
      "Intake history",
      "Recommendation versions",
      "Advisor approvals",
      "Client disclosure timing",
      "Underwriting change notes",
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
              Built around the actual life insurance sales process
            </h2>
            <p className="text-slate-500 text-xl max-w-3xl mx-auto leading-relaxed">
              Every case moves through a structured best-interest workflow that supports recommendation quality, documentation consistency, and supervisory review.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
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
