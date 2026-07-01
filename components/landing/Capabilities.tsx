import { Card, CardContent } from "@/components/ui/card";
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
    label: "Client context / Intake",
    title: "Structured client intake",
    bullets: [
      "Plain-language advisor workflow",
      "Captures goals, ownership, funding, and financial profile",
      "Identifies the consumer, insured, owner, trust, or business context",
    ],
  },
  {
    icon: BrainCircuit,
    label: "Recommendation basis / AI-assisted rationale",
    title: "AI-assisted recommendation rationale",
    bullets: [
      "Drafts the \u201cwhy\u201d behind the recommendation",
      "Summarizes favorable and unfavorable considerations",
      "Connects product design to the client\u2019s stated objectives",
    ],
  },
  {
    icon: AlertTriangle,
    label: "Case design fit / Review flags",
    title: "Case design fit and review flags",
    bullets: [
      "Premium fit against funding source",
      "Death benefit duration against the stated need horizon",
      "Guarantees, riders, and non-guaranteed elements",
      "Existing policy and replacement considerations",
    ],
  },
  {
    icon: UserCog,
    label: "Advisor approval / Human controlled",
    title: "Advisor approval — human controlled",
    bullets: [
      "The advisor reviews and edits every rationale",
      "Attestation before final output",
      "No black-box recommendation and no automatic sign-off",
    ],
  },
  {
    icon: FileOutput,
    label: "Carrier output / Submission ready",
    title: "Carrier-ready output",
    bullets: [
      "Configurable, carrier-ready documentation",
      "Best-interest summary and support packet",
      "Built to reduce back-and-forth and incomplete files",
    ],
  },
  {
    icon: FolderOpen,
    label: "Audit trail / Versioned record",
    title: "Versioned case record and audit trail",
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
    <section id="capabilities" className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-700 mb-4">
              Built around the actual life insurance sales process
            </h2>
            <p className="text-slate-600 text-xl max-w-3xl mx-auto leading-relaxed">
              Every case moves through a structured best-interest workflow that supports recommendation quality, documentation consistency, and supervisory review.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <Card
                  key={i}
                  className="border border-slate-200 hover:border-blue-200 bg-white hover:shadow-md transition-all group"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="bg-blue-50 text-blue-700 rounded-lg p-2 flex-shrink-0 group-hover:bg-blue-700 group-hover:text-white transition-all">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">{cap.label}</p>
                        <h3 className="text-base font-bold text-slate-900 leading-tight">{cap.title}</h3>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {cap.bullets.map((b, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
                          <span className="text-blue-600 mt-0.5 flex-shrink-0">&bull;</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
