import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, Briefcase } from "lucide-react";

const audiences = [
  {
    icon: Users,
    title: "Independent life advisors",
    body: "Replace the paper suitability form with a structured digital intake that automatically documents every Reg 187 field — and produces an audit-ready payload for your file.",
  },
  {
    icon: Building2,
    title: "BD & RIA compliance teams",
    body: "Standardize how every advisor on your platform captures suitability data. The typed schema version-stamps every payload so your compliance library can detect schema drift automatically.",
  },
  {
    icon: Briefcase,
    title: "IMO / FMO back-office",
    body: "Receive a fully structured PolicyPlanIntake from every submitted case. Feed it directly into your n8n workflow, signal library, and carrier illustration platform — no re-entry, no transcription errors.",
  },
];

export function WhoItsFor() {
  return (
    <section id="who-its-for" className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-700 mb-4">
              Who it&apos;s for
            </h2>
            <p className="text-slate-600 text-xl max-w-3xl mx-auto leading-relaxed">
              PolicyPlan is built for every stakeholder in the life insurance distribution chain — from the advisor in the meeting room to the compliance officer reviewing the file.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {audiences.map((a, i) => {
              const Icon = a.icon;
              return (
                <Card
                  key={i}
                  className="border-2 border-slate-100 hover:border-blue-200 bg-white hover:shadow-lg transition-all group"
                >
                  <CardContent className="p-6 text-center">
                    <div className="bg-blue-50 text-blue-700 rounded-full p-4 w-fit mx-auto mb-4 group-hover:bg-blue-700 group-hover:text-white transition-all">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">{a.title}</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">{a.body}</p>
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
