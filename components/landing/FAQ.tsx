import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "What happens to the data after I submit an intake?",
    a: "In Phase 1 (current), the validated PolicyPlanIntake payload is held in browser memory and displayed on the confirmation screen. No data is sent to a server. Phase 2 will route the payload to Supabase (case storage) and n8n (signal scoring and narrative generation).",
  },
  {
    q: "Why does PolicyPlan infer design emphasis instead of asking the client to rank?",
    a: "Clients cannot meaningfully rank products or design attributes they have not evaluated. Asking them to do so produces noise, not signal. inferDesignEmphasis() derives four design signals directly from the behavioral and financial data already collected in Steps 3 and 5 — the same data Reg 187 already requires you to gather.",
  },
  {
    q: "How does the schema versioning work?",
    a: "Every PolicyPlanIntake payload carries schema_version: \"2.0.0\" as a Zod z.literal field. When Phase 2 receives a payload, the server reads the version stamp and applies the matching signal-library version. Payloads from older schema versions can be detected and handled without silent errors.",
  },
  {
    q: "Can PolicyPlan handle joint life / survivorship cases?",
    a: "Yes. Step 1 supports 1–2 insureds. Step 3 renders per-client financial columns (Client 1, Client 2, and Joint). The ownership structure supports individual, business entity, or trust — including irrevocable, grantor, and GST-exempt trust configurations for ILIT cases.",
  },
  {
    q: "What is the Reg 187 replacement flag in Step 4?",
    a: "Each existing policy in the repeater carries an under_replacement_consideration Yes/No field. This maps directly to the Reg 187 §224.4 replacement disclosure requirement. If any policy is flagged, the downstream recommendation narrative must address the replacement suitability analysis.",
  },
  {
    q: "When is Phase 2 available?",
    a: "Phase 2 (Supabase storage + n8n signal scoring + recommendation narrative generation) is in active development. Phase 3 (ATLAS illustration sync) follows Phase 2. The Phase 1 intake is production-ready today.",
  },
];

export function FAQ() {
  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-700 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-slate-600 text-xl max-w-2xl mx-auto leading-relaxed">
              Technical and regulatory questions about how PolicyPlan works.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group border border-slate-200 rounded-xl bg-white hover:border-blue-200 transition-colors"
              >
                <summary className="flex items-center justify-between cursor-pointer p-6 text-left list-none">
                  <span className="font-semibold text-slate-900 pr-4">{faq.q}</span>
                  <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-6 pb-6 pt-0">
                  <p className="text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
