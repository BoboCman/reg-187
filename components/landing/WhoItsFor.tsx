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
    body: "Support complex permanent life cases with a repeatable best-interest workflow. And there\u2019s a reason beyond convenience. Under New York Reg 187, when case designers, specialists, or other producers are compensated for helping tailor a recommendation for a specific consumer, their role can become part of the recommendation process. PolicyPlan documents the facts, rationale, participants, and approvals behind each case you support, so that role is recorded clearly.",
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
    <section id="who-its-for" className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-700 mb-4">
              Built for life insurance distribution
            </h2>
            <p className="text-slate-600 text-xl max-w-3xl mx-auto leading-relaxed">
              Designed for the professionals who make, support, review, and submit life insurance recommendations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {audiences.map((a, i) => {
              const Icon = a.icon;
              return (
                <div
                  key={i}
                  className="bg-white border border-slate-200 hover:border-blue-200 hover:shadow-md rounded-2xl p-8 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-50 text-blue-700 rounded-lg p-2.5 flex-shrink-0 group-hover:bg-blue-700 group-hover:text-white transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{a.title}</h3>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-sm">{a.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
