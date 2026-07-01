import { Card, CardContent } from "@/components/ui/card";

const standards = [
  {
    label: "NY Reg 187 (11 NYCRR 224)",
    value:
      "Full suitability profile gathered before recommendation. deriveFundingCapacity() targets the §224.4(g) ability-to-fund gate using liquid net worth. Replacement disclosure captured per policy at Step 4. Attestation and delivery confirmation required at Step 7 before submission.",
  },
  {
    label: "NAIC Suitability Model Regulation #275",
    value:
      "Consumer profile obtained before recommendation. Reasonable basis for recommendation documented via inferred design emphasis drivers. Care, disclosure, conflict, and documentation requirements mapped to intake steps and payload fields.",
  },
  {
    label: "SEC Reg BI / FINRA Rule 2111",
    value:
      "Liquidity needs captured as a distinct factor (cash_value_access_need). Liquid net worth separated from net worth in financial profile. Risk tolerance gathered across seven categorical dimensions — not as a single score.",
  },
  {
    label: "CFP Board 7-Step Process",
    value:
      "Intake steps follow the needs-first order: profile → objectives → financial data → existing coverage → risk → policy specification → attestation. The recommendation output is a separate Phase 2 artifact, never pre-populated before the profile is complete.",
  },
  {
    label: "Clean-room authorship",
    value:
      "The policyplan-schema.ts contract was authored from published regulatory requirements only — not derived from any carrier's or distributor's proprietary form. The schema is the single source of truth for the intake form, the server, and the n8n signal library.",
  },
];

export function Standards() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-700 mb-4">
              Regulatory foundation
            </h2>
            <p className="text-slate-600 text-xl max-w-3xl mx-auto leading-relaxed">
              Every field in the intake traces to a specific published requirement. Nothing is collected for its own sake.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Card className="border-2 border-slate-100 shadow-lg">
              <CardContent className="p-0">
                <table className="w-full text-base">
                  <tbody>
                    {standards.map((s, i) => (
                      <tr
                        key={i}
                        className={i < standards.length - 1 ? "border-b border-slate-100" : ""}
                      >
                        <td className="py-5 px-6 font-bold text-blue-700 w-1/3 align-top text-sm">
                          {s.label}
                        </td>
                        <td className="py-5 px-6 text-slate-600 text-sm leading-relaxed">
                          {s.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
