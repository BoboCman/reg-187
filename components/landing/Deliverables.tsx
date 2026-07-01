import Link from "next/link";
import { LayoutDashboard, FileText } from "lucide-react";

const deliverables = [
  {
    icon: LayoutDashboard,
    title: "Interactive Case Workspace",
    body: "Review the client profile, recommendation rationale, product design considerations, case flags, and documentation status in one web-based workspace. Built for advisor preparation, BGA case support, and supervisory review.",
  },
  {
    icon: FileText,
    title: "Professional Recommendation Packet",
    body: "Generate a polished PDF package for the client file, carrier submission, supervisory review, and internal documentation, written in clear professional language with advisor approval and disclosed scope.",
  },
];

export function Deliverables() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-600 mb-4">
              Two Deliverables. Every Case.
            </h2>
            <p className="text-slate-500 text-xl max-w-3xl mx-auto leading-relaxed">
              Every PolicyPlan case produces both an interactive workspace and a professional documentation packet.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {deliverables.map((d, i) => {
              const Icon = d.icon;
              return (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-2xl p-10 text-center hover:shadow-sm transition-shadow flex flex-col items-center"
                >
                  <div className="bg-blue-50 text-blue-600 rounded-full p-6 mb-5">
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">{d.title}</h3>
                  <p className="text-slate-500 leading-relaxed text-sm">{d.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
