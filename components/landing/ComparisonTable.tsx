const rows = [
  {
    aspect: "Intake",
    before: "Static PDFs, notes, and incomplete fact-finding",
    after: "Structured web-based intake aligned to the case type",
  },
  {
    aspect: "Recommendation rationale",
    before: "Manually written, inconsistent, often delayed",
    after: "AI-assisted draft reviewed and approved by the advisor",
  },
  {
    aspect: "Sales timing",
    before: "Documentation completed after the case is already moving",
    after: "Recommendation summary prepared before application",
  },
  {
    aspect: "Case design review",
    before: "Product fit and tradeoffs live in the advisor\u2019s head",
    after: "Key assumptions, risks, and considerations are organized",
  },
  {
    aspect: "Carrier submission",
    before: "Different packets and attachments per case",
    after: "Configurable carrier-ready output from one case record",
  },
  {
    aspect: "Supervision",
    before: "Hard to reconstruct who said what and when",
    after: "Versioned record with approvals and timestamps",
  },
  {
    aspect: "Underwriting changes",
    before: "Original rationale often not updated",
    after: "Revised recommendation versions can be documented",
  },
  {
    aspect: "Advisor experience",
    before: "Compliance burden",
    after: "Case design and documentation support",
  },
];

export function ComparisonTable() {
  return (
    <section id="comparison" className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-700 mb-4">
              PolicyPlan: before and after
            </h2>
            <p className="text-slate-600 text-xl max-w-3xl mx-auto leading-relaxed">
              Replace static forms and manual narratives with a structured recommendation process.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-lg">
            <table className="w-full text-left bg-white">
              <thead>
                <tr className="bg-gradient-to-r from-blue-700 to-blue-800 text-white">
                  <th className="py-5 px-6 text-sm font-bold w-1/5">Aspect</th>
                  <th className="py-5 px-6 text-sm font-bold w-2/5">Without PolicyPlan</th>
                  <th className="py-5 px-6 text-sm font-bold w-2/5">With PolicyPlan</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={`hover:bg-blue-50/30 transition-colors${i < rows.length - 1 ? " border-b border-slate-100" : ""}`}
                  >
                    <td className="py-4 px-6 font-bold text-blue-700 align-top">{row.aspect}</td>
                    <td className="py-4 px-6 text-slate-500 align-top">{row.before}</td>
                    <td className="py-4 px-6 font-medium text-slate-900 align-top">{row.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
