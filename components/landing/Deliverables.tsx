import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutDashboard, FileText, ArrowRight } from "lucide-react";

const deliverables = [
  {
    icon: LayoutDashboard,
    title: "Interactive case workspace",
    body: "Review the client profile, recommendation rationale, product design considerations, case flags, and documentation status in one web-based workspace. Built for advisor preparation, BGA case support, and supervisory review.",
    cta: { label: "Explore Capabilities", href: "#capabilities" },
  },
  {
    icon: FileText,
    title: "Professional recommendation packet",
    body: "Generate a polished PDF package for the client file, carrier submission, supervisory review, and internal documentation, written in clear professional language with advisor approval and disclosed scope.",
    cta: { label: "View Sample Report", href: "/app" },
  },
];

export function Deliverables() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-700 mb-4">
              Built for the advisor conversation and the compliance file
            </h2>
            <p className="text-slate-600 text-xl max-w-3xl mx-auto leading-relaxed">
              Every PolicyPlan case produces both an interactive workspace and a professional documentation packet.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {deliverables.map((d, i) => {
              const Icon = d.icon;
              return (
                <Card
                  key={i}
                  className="border-2 border-slate-100 hover:border-blue-200 bg-white hover:shadow-lg transition-all group flex flex-col"
                >
                  <CardContent className="p-8 flex flex-col flex-1">
                    <div className="bg-blue-50 text-blue-700 rounded-full p-5 w-fit mb-5 group-hover:bg-blue-700 group-hover:text-white transition-all">
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{d.title}</h3>
                    <p className="text-slate-600 leading-relaxed text-sm mb-6 flex-1">{d.body}</p>
                    <Link
                      href={d.cta.href}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors"
                    >
                      {d.cta.label}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
