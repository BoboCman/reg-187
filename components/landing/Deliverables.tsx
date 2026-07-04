import Link from "next/link";
import { LayoutDashboard, MessageSquare, FileText, ArrowRight } from "lucide-react";

const deliverables = [
  {
    icon: LayoutDashboard,
    title: "Interactive case workspace",
    body: "Review the client profile, recommendation rationale, product design considerations, case flags, and documentation status in one web-based workspace. Built for advisor preparation, BGA case support, and supervisory review.",
    cta: "Explore Capabilities",
    href: "#capabilities",
  },
  {
    icon: MessageSquare,
    title: "Client-ready recommendation summary",
    body: "Generate a plain-English summary the advisor can review, edit, approve, and use with the client. The summary explains the client objective, relevant facts, recommended approach, favorable considerations, tradeoffs, assumptions, and items that may change before placement.",
    cta: "View Sample Client Summary",
    href: "/coming-soon",
  },
  {
    icon: FileText,
    title: "Professional case packet",
    body: "Generate a polished documentation package you can include in a carrier submission, and use for supervisory review, the client file, and internal records. Written in clear professional language, with advisor approval, disclosed scope, and versioned case history.",
    cta: "View Sample Output",
    href: "/coming-soon",
  },
];

export function Deliverables() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-600 mb-4">
              Documentation for every case.
            </h2>
            <p className="text-slate-500 text-xl max-w-3xl mx-auto leading-relaxed">
              Built for the advisor conversation, the client explanation, and the compliance file.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {deliverables.map((d, i) => {
              const Icon = d.icon;
              return (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-2xl p-8 text-center hover:shadow-sm transition-shadow flex flex-col items-center"
                >
                  <div className="bg-blue-50 text-blue-600 rounded-full p-5 mb-5">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-3">{d.title}</h3>
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
