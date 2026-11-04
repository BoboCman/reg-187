import { ArrowRight, Check } from "lucide-react";

const points = [
  "Written in the producer\u2019s voice, to the client, before they apply",
  "Favorable and unfavorable considerations given equal weight",
  "How the policy works, in plain English, with the carrier\u2019s own wording",
  "A guaranteed-versus-illustrated table at key ages",
  "Your letterhead, your disclosures, your signature",
];

export function Deliverables() {
  return (
    <section id="sample" className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-12 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 mb-3">The deliverable</p>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-5 tracking-tight">
              A letter your client will actually read.
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              Most best-interest documentation is written for the file. PolicyPlan&apos;s letter is written for the client, and it holds up in the file too.
            </p>
            <ul className="space-y-3 mb-10">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-slate-600">
                  <Check className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <a
              href="/sample-letter"
              target="_blank"
              rel="noopener"
              className="group inline-flex items-center px-6 py-3 rounded-lg font-semibold bg-blue-700 hover:bg-blue-800 text-white transition-all"
            >
              Open the sample letter
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <p className="text-xs text-slate-400 mt-3">A fictional survivorship case for a family trust.</p>
          </div>

          <a
            href="/sample-letter"
            target="_blank"
            rel="noopener"
            aria-label="Open the sample letter"
            className="block relative rounded-2xl border border-slate-200 bg-slate-100 p-4 sm:p-6 shadow-xl shadow-slate-200/60 hover:shadow-2xl transition-shadow"
          >
            <div className="relative h-[520px] overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
              <iframe
                src="/sample-letter"
                title="Sample best-interest letter"
                tabIndex={-1}
                loading="lazy"
                className="pointer-events-none absolute left-0 top-0 h-[1040px] w-[200%] origin-top-left scale-50 border-0"
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
