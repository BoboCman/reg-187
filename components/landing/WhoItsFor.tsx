import { Users, Briefcase, Building2, LayoutGrid } from "lucide-react";

const audiences = [
  {
    icon: Users,
    title: "Advisors & producers",
    body: "Move from case notes and illustration commentary to a clear, documented recommendation rationale. Less manual writing, more consistent client conversations, and a better record of why the recommendation was made.",
  },
  {
    icon: Briefcase,
    title: "BGAs & IMOs",
    body: "Support complex permanent life cases with a repeatable best-interest workflow. Under New York Reg 187, when a case designer or specialist is compensated for helping tailor a recommendation, that role can become part of the recommendation process. PolicyPlan records the participation, rationale, and approvals behind every case you support.",
  },
  {
    icon: Building2,
    title: "Insurance firms & broker-dealers",
    body: "Create a consistent framework for recommendation documentation, supervisory review, advisor attestation, and case-level audit trails, without forcing every advisor into a static PDF process.",
  },
  {
    icon: LayoutGrid,
    title: "Carrier distribution teams",
    body: "Receive more complete case documentation from distribution partners. PolicyPlan organizes the facts, rationale, tradeoffs, and approvals that support the recommendation process.",
  },
];

export function WhoItsFor() {
  return (
    <section id="who-its-for" className="py-24 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-600 mb-4">
              Built for life insurance distribution
            </h2>
            <p className="text-slate-500 text-xl max-w-3xl mx-auto leading-relaxed">
              Designed for the professionals who make, support, review, and submit life insurance recommendations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {audiences.map((a, i) => {
              const Icon = a.icon;
              return (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-sm transition-shadow"
                >
                  <div className="bg-blue-50 text-blue-600 rounded-full p-4 w-fit mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3">{a.title}</h3>
                  <p className="text-slate-500 leading-relaxed text-sm">{a.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
