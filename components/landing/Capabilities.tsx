import { Card, CardContent } from "@/components/ui/card";
import {
  UserCheck,
  Target,
  BarChart3,
  Shield,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

const capabilities = [
  {
    icon: UserCheck,
    title: "Insured & ownership capture",
    bullets: [
      "1–2 insureds with DOB, gender, nicotine status",
      "Individual, business entity, or trust ownership",
      "Conditional trust fields: irrevocable / revocable, grantor, GST exempt",
      "Business entity type for key-person and buy-sell cases",
    ],
  },
  {
    icon: Target,
    title: "Needs-first objective ranking",
    bullets: [
      "14 objectives across 4 groups: protection, accumulation, estate, business",
      "Star-tap primary selection from selected objectives only",
      "Zod validates: primary must be in selected set",
      "Drives narrative framing in Phase 2 recommendation",
    ],
  },
  {
    icon: BarChart3,
    title: "Full financial profile",
    bullets: [
      "Per-client columns: liquid assets, other assets, liabilities",
      "Live derived totals: net worth and liquid net worth",
      "Liquid net worth isolated as the Reg 187 funding-capacity metric",
      "Premium source field for documentation",
    ],
  },
  {
    icon: Shield,
    title: "Existing coverage with Reg 187 flags",
    bullets: [
      "Repeater for up to 3 in-force policies",
      "Per-policy replacement consideration flag (Reg 187 §224.4)",
      "Policy type, face amount, CSV, loan balance, annual premium",
      "Gated behind has-existing-coverage toggle",
    ],
  },
  {
    icon: SlidersHorizontal,
    title: "Risk & preferences — 7 questions",
    bullets: [
      "Investment experience, variability tolerance",
      "Guarantee vs. upside preference",
      "Willingness to accept non-guaranteed elements (Reg 187 §224.3(g))",
      "Premium funding commitment, cash access horizon, complexity comfort",
    ],
  },
  {
    icon: Sparkles,
    title: "Inferred design emphasis",
    bullets: [
      "Four signals: guarantee protection, growth orientation, cash access, cost sensitivity",
      "Derived algorithmically — clients never rank what they cannot evaluate",
      "Each signal records its driver array for the audit trail",
      "Drives favorable / unfavorable consideration generation in Phase 2",
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
              Every suitability signal, captured
            </h2>
            <p className="text-slate-600 text-xl max-w-3xl mx-auto leading-relaxed">
              PolicyPlan covers every dimension of the Reg 187 suitability profile — financial, behavioral, and product-specific — in one structured intake session.
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
                      <h3 className="text-base font-bold text-slate-900 leading-tight">{cap.title}</h3>
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
