import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "What is PolicyPlan?",
    a: "A web-based best-interest documentation workspace for life insurance recommendations. It helps producers and firms capture client context, develop a recommendation rationale, create a client-ready summary, prepare carrier-ready output, and maintain a versioned case record.",
  },
  {
    q: "Does PolicyPlan create a client-facing recommendation summary?",
    a: "Yes. PolicyPlan can generate a client-ready summary that explains the basis for the recommendation in clear professional language. The summary can include the client objective, relevant facts, recommended approach, favorable considerations, tradeoffs, assumptions, and items that may change before placement. The producer reviews, edits, and approves the summary before use.",
  },
  {
    q: "Is PolicyPlan a Reg 187 form?",
    a: "No. It is not a single static form. It is a structured workflow that supports the New York Reg 187 best-interest process, including intake, rationale drafting, advisor approval, client summary generation, carrier documentation, and a case-level audit trail.",
  },
  {
    q: "Does PolicyPlan make recommendations?",
    a: "No. PolicyPlan drafts and organizes recommendation rationale from producer-entered information. The producer reviews, edits, approves, and owns the final recommendation and any client-facing summary.",
  },
  {
    q: "Is the client summary required?",
    a: "PolicyPlan does not determine what any specific firm, carrier, or regulator requires in a particular case. The client summary is designed to help advisors communicate the basis for the recommendation and preserve a clearer record of the recommendation process. Firm and carrier procedures still control.",
  },
  {
    q: "Can the client summary be customized?",
    a: "Yes. Firms can configure summary format, required sections, disclosures, approval steps, and output language to align with internal procedures and carrier submission expectations.",
  },
  {
    q: "Who is PolicyPlan for?",
    a: "Life insurance advisors, BGAs, IMOs, insurance firms, broker-dealers, RIAs, and carrier distribution teams that need a more consistent way to document life insurance recommendations.",
  },
  {
    q: "What cases can it support?",
    a: "Permanent and term life, trust-owned and business-owned policies, executive benefit and key-person cases, estate liquidity, retirement supplement designs, and cases involving existing policy review or possible replacement. PolicyPlan is designed for recommendations that need a clearer rationale record, including new sales, replacements, 1035 exchanges, financed purchases, and other compensated transactions that disturb existing coverage. Routine in-force service is different, but documentation remains a best practice when a recommendation changes the client\u2019s coverage path.",
  },
  {
    q: "Does PolicyPlan replace carrier forms?",
    a: "No. Carrier requirements still apply. PolicyPlan creates a structured case record and configurable output that support carrier-specific submission workflows.",
  },
  {
    q: "Does PolicyPlan replace New York Regulation 60 replacement forms?",
    a: "No. Regulation 60 requirements still apply where a replacement is involved. PolicyPlan supports the best-interest recommendation record, including replacement considerations, but it does not replace carrier, firm, or New York Regulation 60 forms unless a firm or carrier has approved that workflow.",
  },
  {
    q: "Where does it fit in the sales process?",
    a: "It is used before application, when the producer is developing and documenting the recommendation. It also supports revised documentation if underwriting, pricing, product design, or client facts change before placement.",
  },
  {
    q: "Can firms white-label PolicyPlan?",
    a: "Yes. It can be configured for firms that want to offer a branded best-interest workflow to advisors, producer groups, or distribution partners.",
  },
];

export function FAQ() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-600 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-slate-500 text-xl max-w-2xl mx-auto leading-relaxed">
              Common questions about PolicyPlan and the New York Reg 187 best-interest process.
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
