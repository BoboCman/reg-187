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
      "Plain-language producer workflow",
      "Captures goals, ownership, funding, and financial profile",
      "Identifies the consumer, insured, owner, trust, or business context",
    ],
  },
  {
    icon: BrainCircuit,
    label: "Recommendation basis",
    title: "Producer-authored rationale, AI-assisted",
    bullets: [
      "Drafts a starting rationale from the producer\u2019s own intake answers",
      "Summarizes favorable and unfavorable considerations",
      "Connects the documented basis to the client\u2019s stated objectives",
      "Converts case facts into producer-reviewable client summary language",
    ],
  },
  {
    icon: AlertTriangle,
    label: "Case design fit",
    title: "Review flags",
    bullets: [
      "Desired premium against the client\u2019s liquid net worth",
      "Stated guarantee preference against reliance on non-guaranteed values",
      "Preference for simplicity against interest in non-guaranteed upside",
    ],
  },
  {
    icon: UserCog,
    label: "Producer approval",
    title: "Human controlled",
    bullets: [
      "The producer resolves every flagged tension in their own words before approval",
      "The producer reviews and edits every rationale",
      "Attestation before final output",
      "No black-box recommendation and no automatic sign-off",
    ],
  },
  {
    icon: FileOutput,
    label: "Carrier output",
    title: "Documentation output",
    bullets: [
      "Configurable client summary and case-support output",
      "Client summary and carrier support packet",
      "Built to reduce back-and-forth, missing rationale, and incomplete files",
      "Carrier and firm requirements still control",
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
      "Client summary versions and delivery status",
      "Client disclosure timing",
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
