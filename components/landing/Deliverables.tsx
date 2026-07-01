import Link from "next/link";
import { LayoutDashboard, FileText, ArrowRight } from "lucide-react";

const deliverables = [
  {
    icon: LayoutDashboard,
    title: "Interactive case workspace",
    body: "Review the client profile, recommendation rationale, product design considerations, case flags, and documentation status in one web-based workspace. Built for advisor preparation, BGA case support, and supervisory review.",
    cta: "Explore Capabilities",
    href: "#capabilities",
  },
  {
    icon: FileText,
    title: "Professional recommendation packet",
    body: "Generate a polished PDF package for the client file, carrier submission, supervisory review, and internal documentation, written in clear professional language with advisor approval and disclosed scope.",
    cta: "View Sample Report",
    href: "/app",
  },
];

export function Deliverables() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-600 mb-4">
              Built for the advisor conversation and the compliance file
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
                  <p className="text-slate-500 leading-relaxed text-sm mb-6">{d.body}</p>
                  <Link
                    href={d.href}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors mt-auto"
                  >
                    {d.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
