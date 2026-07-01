import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "What is PolicyPlan?",
    a: "A web-based best-interest documentation workspace for life insurance recommendations. It helps advisors and firms capture client context, develop a recommendation rationale, prepare carrier-ready output, and maintain a versioned case record.",
  },
  {
    q: "Is PolicyPlan a Reg 187 form?",
    a: "No. It is not a single static form. It is a structured workflow that supports the New York Reg 187 best-interest process, including intake, rationale drafting, advisor approval, client disclosure, and a case-level audit trail.",
  },
  {
    q: "Does PolicyPlan make recommendations?",
    a: "No. PolicyPlan drafts and organizes the recommendation rationale from advisor-entered information. The advisor reviews, edits, approves, and owns the final recommendation.",
  },
  {
    q: "Who is PolicyPlan for?",
    a: "Life insurance advisors, BGAs, IMOs, insurance firms, broker-dealers, RIAs, and carrier distribution teams that need a more consistent way to document life insurance recommendations.",
  },
  {
    q: "What cases can it support?",
    a: "Permanent and term life, trust-owned and business-owned policies, executive benefit and key-person cases, estate liquidity, retirement supplement designs, and cases involving existing policy review or possible replacement.",
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
    a: "It is used before application, when the advisor is developing and documenting the recommendation. It also supports revised documentation if underwriting, pricing, product design, or client facts change before placement.",
  },
  {
    q: "Does it create a client-facing report?",
    a: "Yes. PolicyPlan produces a professional recommendation summary that explains the basis for the recommendation in clear language, plus a firm-facing or carrier-facing documentation packet.",
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
              Frequently Asked Questions About PolicyPlan
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
