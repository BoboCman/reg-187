import { LayoutDashboard, MessageSquare, FileText } from "lucide-react";

const outputs = [
  {
    icon: LayoutDashboard,
    title: "Advisor Workspace",
    body: "A guided web-based case flow for capturing client context, reviewing design considerations, drafting rationale, and approving final documentation.",
  },
  {
    icon: MessageSquare,
    title: "Client Recommendation Summary",
    body: "A plain-English summary the advisor can use with the client to explain the objective, recommendation basis, favorable considerations, tradeoffs, and assumptions.",
  },
  {
    icon: FileText,
    title: "Carrier & Firm Case Packet",
    body: "A structured documentation package you can include in a carrier submission, and use for supervisory review, internal records, and audit support.",
  },
];

export function ValueBand() {
  return (
    <section className="py-20 bg-slate-50 border-t border-slate-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
              One intake. Two documents. One case record.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {outputs.map((o, i) => {
              const Icon = o.icon;
              return (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-2xl p-8 text-center hover:shadow-sm transition-shadow flex flex-col items-center"
                >
                  <div className="bg-blue-50 text-blue-600 rounded-full p-5 mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-3">{o.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{o.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
