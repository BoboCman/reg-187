const ITEMS = [
  ["Facts with page references", "Every figure on the companion is matched to the illustration page it came from. Figures that cannot be matched stay off the client page and are listed for you."],
  ["Checks on every sentence", "Recommendation, suitability and tax language, guarantees without their conditions, and typed numbers are flagged before you approve, including in your own edits."],
  ["A record of what was shared", "Each approval locks that exact version with a reference number. A later change to the illustration, facts or objective starts a new revision and keeps the old one in the history."],
  ["Your letterhead", "Your name, firm, colors and disclosures appear on every companion."],
];

export function ProducerBenefit() {
  return (
    <section className="border-t border-slate-100 bg-slate-50 py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Less explanation to assemble. More attention on judgment and the client.</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {ITEMS.map(([t, b]) => (
              <div key={t} className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="mb-2 font-semibold text-slate-900">{t}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
