import { Card, CardContent } from "@/components/ui/card";
import { FileJson, Sparkles } from "lucide-react";

const deliverables = [
  {
    icon: FileJson,
    title: "A typed, versioned intake payload",
    body: "Every completed intake validates against policyPlanIntakeSchema (Zod v3) and produces a typed PolicyPlanIntake object carrying schema_version: \"2.0.0\". The payload is fully self-describing — field codes, not labels — so the downstream signal library can version-gate its scoring logic.",
  },
  {
    icon: Sparkles,
    title: "Four inferred design emphasis signals",
    body: "inferDesignEmphasis() derives Guarantee Protection, Growth Orientation, Cash Access, and Cost Sensitivity signals from the risk-preference answers already collected. Each signal resolves to High, Moderate, or Low and records the driver array that produced it — fully auditable, no black box.",
  },
];

export function Deliverables() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-700 mb-4">
              What the intake produces
            </h2>
            <p className="text-slate-600 text-xl max-w-3xl mx-auto leading-relaxed">
              PolicyPlan outputs two artifacts that feed directly into the Phase 2 recommendation pipeline.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {deliverables.map((d, i) => {
              const Icon = d.icon;
              return (
                <Card
                  key={i}
                  className="border-2 border-slate-100 hover:border-blue-200 bg-white hover:shadow-lg transition-all group"
                >
                  <CardContent className="p-8 text-center">
                    <div className="bg-blue-50 text-blue-700 rounded-full p-5 w-fit mx-auto mb-5 group-hover:bg-blue-700 group-hover:text-white transition-all">
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{d.title}</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">{d.body}</p>
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
