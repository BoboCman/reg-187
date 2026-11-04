import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "What is PolicyPlan?",
    a: "A web app that turns a carrier\u2019s sales illustration and a short client profile into a client-ready best-interest letter. The producer reviews, edits, addresses each flagged point, attests and downloads it as a branded PDF.",
  },
  {
    q: "Does it work outside New York?",
    a: "Yes. The letter is built to New York\u2019s Reg 187 standard, and you can use it for any case in any state. Outside New York, most states hold life sales to a suitability standard; using the stricter standard everywhere gives you one process and a stronger record. It does not change what your state, carrier or firm requires.",
  },
  {
    q: "Does PolicyPlan make the recommendation?",
    a: "No. The producer chooses the policy. PolicyPlan reads the illustration, drafts the letter explaining the producer\u2019s recommendation, and flags points to weigh. The producer edits, approves and owns every word.",
  },
  {
    q: "Which illustrations work?",
    a: "Sales illustrations from any carrier, as a PDF. PolicyPlan reads every page, including the ledger, the guarantee language, riders and surrender charges.",
  },
  {
    q: "What happens to client data?",
    a: "The PDF is read in your browser, and the client\u2019s names are removed before any text is sent. Client data is not used to train public AI models.",
  },
  {
    q: "How long does a letter take?",
    a: "About three minutes to upload and answer the profile, a few minutes for the draft, then as long as the producer wants to spend editing.",
  },
  {
    q: "Does it handle replacements?",
    a: "The letter covers replacement considerations when the client is replacing or funding from existing coverage. Regulation 60 and carrier replacement forms still apply. A side-by-side comparison with the in-force illustration is planned.",
  },
  {
    q: "Can the letter carry our firm\u2019s branding and disclosures?",
    a: "Yes. Each producer sets their letterhead, logo, colors, license number and firm disclosures once, and every letter uses them.",
  },
  {
    q: "Does PolicyPlan replace carrier forms?",
    a: "No. Carrier, broker-dealer, BGA and firm requirements still apply.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-24 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-600 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-slate-500 text-xl max-w-2xl mx-auto leading-relaxed">
              Common questions about PolicyPlan and the 187 standard.
            </p>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group border border-slate-200 rounded-xl bg-white"
              >
                <summary className="flex items-center justify-between cursor-pointer p-5 text-left list-none select-none">
                  <span className="font-semibold text-slate-800 pr-4 text-sm">{faq.q}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-5 pb-5 pt-0 border-t border-slate-100">
                  <p className="text-slate-500 leading-relaxed text-sm pt-4">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
