import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "What is a Companion?",
    a: "A one-page, plain-language explanation of a proposed life insurance policy that a producer gives the client alongside the carrier\u2019s illustration. It covers the proposal at a glance, why it is being considered, how it works, what is guaranteed and what is illustrated, and up to three points to discuss.",
  },
  {
    q: "Does this replace the carrier illustration?",
    a: "No. The carrier illustration stays the authoritative document, and every companion says so. Each figure on the companion points to the illustration page it came from.",
  },
  {
    q: "Who reviews the output?",
    a: "The producer. You check the facts against the illustration, answer the client objective questions, edit the wording, tick the case-specific items to verify, and approve. Nothing is client-ready without that approval.",
  },
  {
    q: "How does it treat non-guaranteed values?",
    a: "They are labelled as illustrated and kept apart from what the contract guarantees. A guarantee is only described together with its conditions, and the checks flag wording that presents illustrated values as certain.",
  },
  {
    q: "Which life policies are supported?",
    a: "Proposed sales illustrations for permanent life insurance (universal, guaranteed universal, indexed universal, whole and variable universal life), single life or survivorship, as a text-based PDF. In-force illustrations, term insurance and scanned PDFs are not supported in this version.",
  },
  {
    q: "What if information is missing?",
    a: "A figure that cannot be matched to the page stays off the client page and is listed for you to check or correct. If a core fact such as the planned premium or the death benefit cannot be verified, the companion cannot be approved until you correct it from the illustration.",
  },
  {
    q: "Is it a replacement analysis?",
    a: "No. If the proposal replaces, reduces or is funded from an existing policy, the companion says the existing coverage needs its own review, and you must confirm that review before approving. It does not compare the two policies, and replacement forms still apply.",
  },
  {
    q: "Does this fulfill Reg 187?",
    a: "No. PolicyPlan does not determine whether a sale meets New York Regulation 187 or any other law or firm rule. It helps you explain a proposal clearly; your own process, your firm and the carrier decide what is required.",
  },
  {
    q: "How is private illustration data handled?",
    a: "The PDF is read in your browser and the file itself is not uploaded. The names you enter are removed in the browser, and the server screens the text again for phone numbers, email addresses, Social Security numbers, dates of birth and account numbers; if a name is still found, nothing is sent. The screened text is stored with the case and processed by our extraction and writing service, which uses OpenAI models. See the privacy policy for details.",
  },
  {
    q: "Can a firm control client-release permissions?",
    a: "Yes. Client export stays closed until the firm\u2019s approval of client use is recorded for the account, optionally limited to certain states and product types. Until then producers can only download a watermarked draft.",
  },
  {
    q: "Can it use our branding?",
    a: "Yes. Each producer sets their name, firm, logo, colors and firm disclosures once, and every companion uses them.",
  },
  {
    q: "What happens if the illustration changes?",
    a: "Uploading a new illustration, correcting a fact or changing the client\u2019s answers starts a new revision. Any earlier approval is superseded, kept in the case history and can no longer be exported as current.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
              Answers describe what the product does today.
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
