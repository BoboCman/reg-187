import { Users, Briefcase, Building2 } from "lucide-react";

const audiences = [
  {
    icon: Briefcase,
    title: "BGAs & IMOs",
    lead: "Offer the 187 standard on every case you place.",
    body: "Give your producers a signed best-interest letter for each case, carrier-agnostic and on their own letterhead. It sets your agency apart when recruiting producers, and it documents the facts and trade-offs behind the designs your case team helps shape.",
  },
  {
    icon: Users,
    title: "Producers & advisors",
    lead: "Explain the recommendation once, in writing, in minutes.",
    body: "Stop writing rationale by hand after the application. Upload the illustration, answer a short profile, edit the draft and sign it. Your client gets a clear letter before they apply, and you keep the record.",
  },
  {
    icon: Building2,
    title: "Broker-dealers & firms",
    lead: "One process for every state.",
    body: "Run every life recommendation to the strictest standard in the country, instead of one process for New York and another everywhere else. Each letter carries the producer's attestation and approval date for supervisory review.",
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
              Start with the agencies that design and place cases, and the producers they support.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
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
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{a.title}</h3>
                  <p className="text-sm font-semibold text-blue-700 mb-3">{a.lead}</p>
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
