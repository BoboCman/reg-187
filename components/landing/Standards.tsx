import { Card, CardContent } from "@/components/ui/card";

const standards = [
  {
    label: "New York Reg 187",
    value:
      "Supports structured documentation for recommendations involving life insurance policies issued in New York, including suitability information, recommendation basis, advisor approval, and disclosure timing.",
  },
  {
    label: "Recommendation rationale",
    value:
      "Each case documents the \u201cwhy\u201d behind the recommendation, including relevant client facts, product features, favorable considerations, unfavorable considerations, and assumptions used.",
  },
  {
    label: "Advisor attestation",
    value:
      "The advisor remains responsible for the recommendation. PolicyPlan drafts and organizes the rationale, but the advisor reviews, edits, approves, and attests before final output.",
  },
  {
    label: "Carrier and firm procedures",
    value:
      "Carrier requirements still control. PolicyPlan helps organize and export the recommendation record in formats that can be configured to support carrier-specific workflows. It does not replace carrier, broker-dealer, BGA, or firm-specific procedures.",
  },
  {
    label: "Scope and limitations",
    value:
      "PolicyPlan is not a carrier illustration, a legal or tax opinion, an underwriting decision, or a replacement analysis. It is a documentation and workflow platform that supports professional review. PolicyPlan supports the best-interest process; it does not by itself satisfy any regulatory obligation.",
  },
];

export function Standards() {
  return (
    <section id="standards" className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-700 mb-4">
              Built to support the New York Reg 187 best-interest process
            </h2>
            <p className="text-slate-600 text-xl max-w-3xl mx-auto leading-relaxed">
              PolicyPlan helps firms organize the facts, analysis, rationale, disclosures, and approvals that support a life insurance best-interest recommendation in New York.
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
