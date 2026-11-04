const rows = [
  {
    aspect: "Recommendation rationale",
    before: "Written by hand after the application, if at all",
    after: "Drafted from the illustration and profile, edited and signed by the producer",
  },
  {
    aspect: "Client explanation",
    before: "A verbal walkthrough of a 40-page illustration",
    after: "A plain-English letter the client reads before applying",
  },
  {
    aspect: "Policy facts",
    before: "Re-keyed from the illustration, with errors",
    after: "Read from the illustration and checked against it",
  },
  {
    aspect: "Trade-offs",
    before: "Live in the producer\u2019s head",
    after: "Flagged, addressed in writing, and kept with the approval",
  },
  {
    aspect: "Outside New York",
    before: "A lower suitability bar and an inconsistent process",
    after: "The same 187 standard on every case, in every state",
  },
];

export function ComparisonTable() {
  return (
    <section id="comparison" className="py-24 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-600 mb-4">
              PolicyPlan: before and after
            </h2>
            <p className="text-slate-500 text-xl max-w-3xl mx-auto leading-relaxed">
              From hand-written rationale to a signed letter on every case.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="py-5 px-6 text-sm font-semibold w-1/5">Aspect</th>
                  <th className="py-5 px-6 text-sm font-semibold w-2/5">Without PolicyPlan</th>
                  <th className="py-5 px-6 text-sm font-semibold w-2/5">With PolicyPlan</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={`${i < rows.length - 1 ? "border-b border-slate-100" : ""}`}
                  >
                    <td className="py-4 px-6 font-semibold text-blue-600 align-top">{row.aspect}</td>
                    <td className="py-4 px-6 text-slate-400 align-top">{row.before}</td>
                    <td className="py-4 px-6 font-medium text-slate-800 align-top">{row.after}</td>
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
