const standards = [
  {
    label: "New York Reg 187",
    value:
      "The letter follows the structure Reg 187 (11 NYCRR 224) expects of a recommendation: the client\u2019s suitability information, the basis for the recommendation, and both favorable and unfavorable considerations.",
  },
  {
    label: "Other states",
    value:
      "Most states hold life insurance sales to a suitability standard. PolicyPlan applies the New York best-interest standard everywhere, so a firm can run one process. It does not change what any state requires.",
  },
  {
    label: "Producer attestation",
    value:
      "The producer remains responsible for the recommendation. PolicyPlan drafts and organizes; the producer edits, addresses each flagged point, attests and approves before anything is final.",
  },
  {
    label: "Carrier and firm procedures",
    value:
      "Carrier, broker-dealer, BGA and firm requirements still control, including New York Regulation 60 replacement forms.",
  },
  {
    label: "Scope and limitations",
    value:
      "PolicyPlan is not a carrier illustration, legal or tax opinion, underwriting decision, replacement analysis, or licensed producer recommendation. It is a documentation and workflow platform that supports professional review. PolicyPlan supports the best-interest documentation process; it does not by itself satisfy any regulatory obligation.",
  },
];

export function Standards() {
  return (
    <section id="standards" className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-600 mb-4">
              Standards and scope
            </h2>
            <p className="text-slate-700 text-base font-medium max-w-2xl mx-auto leading-relaxed mb-3">
              Reg 187 is the bar, not the boundary.
            </p>
            <p className="text-slate-500 text-xl max-w-3xl mx-auto leading-relaxed">
              What the letter is built to, and what it is not.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
              <table className="w-full text-base">
                <tbody>
                  {standards.map((s, i) => (
                    <tr
                      key={i}
                      className={i < standards.length - 1 ? "border-b border-slate-100" : ""}
                    >
                      <td className="py-5 px-6 font-semibold text-blue-600 w-1/3 align-top text-sm">
                        {s.label}
                      </td>
                      <td className="py-5 px-6 text-slate-500 text-sm leading-relaxed">
                        {s.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
