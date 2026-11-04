const stats = [
  {
    value: "1",
    label: "state applies a best-interest standard to life insurance today",
    note: "New York, through Reg 187, since February 2020",
  },
  {
    value: "45+",
    label: "states already apply a best-interest standard to annuities",
    note: "NAIC Model 275; ACLI counts 45, other trackers count all 50",
  },
  {
    value: "65%",
    label: "of recent life buyers believed their agent had to act in their best interest",
    note: "Life Insurance Consumer Advocacy Center survey, 2026",
  },
];

export function WhyStandard() {
  return (
    <section id="why-187" className="py-24 bg-slate-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-3xl mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300 mb-3">Why the 187 standard, everywhere</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
              Your clients already assume it.
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              New York&apos;s Reg 187 is the strictest life insurance sales standard in the country, and the rest of the market is moving toward it. Annuities already carry a best-interest duty in nearly every state, CFP professionals owe one on every life recommendation, and consumer advocates are pressing other states to follow New York. Meeting the New York bar on every case means one process, and the strongest record, wherever the client lives.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {stats.map((s) => (
              <div key={s.value} className="rounded-2xl border border-white/10 bg-white/5 p-7">
                <p className="text-5xl font-bold tracking-tight text-white">{s.value}</p>
                <p className="mt-3 text-base font-medium text-slate-100 leading-snug">{s.label}</p>
                <p className="mt-3 text-xs text-slate-400">{s.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
