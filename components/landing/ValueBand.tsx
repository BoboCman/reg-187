import { FileSignature, Table2, ShieldCheck } from "lucide-react";

const outputs = [
  {
    icon: FileSignature,
    title: "The best-interest letter",
    body: "A client-ready letter in the producer's voice: the goals, the recommendation, how the policy works, what to weigh, and what is and isn't guaranteed. Branded with the producer's letterhead and signed by the producer.",
  },
  {
    icon: Table2,
    title: "The policy at a glance",
    body: "Key facts and a guaranteed-versus-illustrated values table, taken straight from the carrier illustration, so the client sees the same numbers the letter discusses.",
  },
  {
    icon: ShieldCheck,
    title: "The approval record",
    body: "Every flagged point and how the producer addressed it, the producer's attestation, the approval date, and a fingerprint of the exact letter the client received.",
  },
];

export function ValueBand() {
  return (
    <section className="py-20 bg-slate-50 border-t border-slate-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
              One illustration. One letter. One record.
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
