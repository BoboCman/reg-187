const rows = [
  {
    aspect: "Suitability data capture",
    before: "Paper form, scanned PDF, or advisor memory — inconsistent field coverage",
    after: "7 structured steps with Zod validation — every required field or the form won't submit",
  },
  {
    aspect: "Design priorities",
    before: "Advisor asks client to rank products or features the client cannot meaningfully evaluate",
    after: "inferDesignEmphasis() derives four signals algorithmically from the risk-preference answers already collected",
  },
  {
    aspect: "Reg 187 documentation",
    before: "Narrative written post-meeting from memory — difficult to prove the profile was gathered first",
    after: "Intake must be completed and attested before submission; payload timestamps the session",
  },
  {
    aspect: "Downstream data quality",
    before: "Back-office re-keys data from PDFs into illustration platforms and CRM — error-prone",
    after: "PolicyPlanIntake v2.0.0 routes as JSON directly to Supabase, n8n, and ATLAS — no re-entry",
  },
  {
    aspect: "Recommendation basis",
    before: "Basis is implicit — reconstructed from advisor notes if ever questioned in a review",
    after: "Driver arrays for all four design signals stored with the payload — auditable at field level",
  },
  {
    aspect: "Schema version control",
    before: "No versioning — a form change produces silent incompatibilities in downstream systems",
    after: "Every payload carries schema_version: \"2.0.0\" — server can version-gate signal scoring accordingly",
  },
];

export function ComparisonTable() {
  return (
    <section id="comparison" className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-700 mb-4">
              Before &amp; after
            </h2>
            <p className="text-slate-600 text-xl max-w-3xl mx-auto leading-relaxed">
              What changes when you replace a paper suitability form with a structured digital intake.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-lg">
            <table className="w-full text-left bg-white">
              <thead>
                <tr className="bg-gradient-to-r from-blue-700 to-blue-800 text-white">
                  <th className="py-5 px-6 text-base font-bold w-1/5">Aspect</th>
                  <th className="py-5 px-6 text-base font-bold w-2/5">Without PolicyPlan</th>
                  <th className="py-5 px-6 text-base font-bold w-2/5">With PolicyPlan</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={`hover:bg-blue-50/30 transition-colors${i < rows.length - 1 ? " border-b border-slate-100" : ""}`}
                  >
                    <td className="py-5 px-6 font-bold text-blue-700 align-top">{row.aspect}</td>
                    <td className="py-5 px-6 text-slate-500 align-top">{row.before}</td>
                    <td className="py-5 px-6 font-medium text-slate-900 align-top">{row.after}</td>
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
