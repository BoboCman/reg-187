import { Card, CardContent } from "@/components/ui/card";
import { Building2, UserCheck, TrendingUp } from "lucide-react";

const pillars = [
  {
    icon: Building2,
    label: "What your firm offers",
    body: "A structured best-interest recommendation workspace that helps advisors capture client context, develop a documented rationale, and prepare cleaner carrier-ready output.",
  },
  {
    icon: UserCheck,
    label: "What advisors receive",
    body: "A guided process, AI-assisted drafting, editable recommendation language, an approval workflow, and a professional documentation package.",
  },
  {
    icon: TrendingUp,
    label: "What your firm builds",
    body: "More consistent case support, stronger documentation habits, a better advisor experience, and a scalable infrastructure layer for complex life insurance recommendations.",
  },
];

function FirmDiagramSVG() {
  return (
    <svg
      viewBox="0 0 920 360"
      className="w-full max-w-[920px] mx-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="20" y="130" width="180" height="100" rx="16" fill="#1d4ed8" />
      <text x="110" y="172" textAnchor="middle" fill="white" fontSize="15" fontWeight="700">Advisor</text>
      <text x="110" y="192" textAnchor="middle" fill="white" fontSize="12" opacity="0.85">Completes PolicyPlan</text>
      <text x="110" y="210" textAnchor="middle" fill="white" fontSize="12" opacity="0.85">intake in 7 steps</text>

      <path d="M202 180 L348 180" stroke="#1d4ed8" strokeWidth="2.5" markerEnd="url(#arrow)" />

      <rect x="350" y="110" width="220" height="140" rx="16" fill="white" stroke="#1d4ed8" strokeWidth="2.5" />
      <text x="460" y="165" textAnchor="middle" fill="#1d4ed8" fontSize="20" fontWeight="700">PolicyPlan</text>
      <text x="460" y="189" textAnchor="middle" fill="#475569" fontSize="12">Validates &amp; structures</text>
      <text x="460" y="207" textAnchor="middle" fill="#475569" fontSize="12">PolicyPlanIntake v2.0.0</text>
      <text x="460" y="225" textAnchor="middle" fill="#475569" fontSize="12">+ infers design emphasis</text>

      <path d="M572 180 L718 180" stroke="#1d4ed8" strokeWidth="2.5" markerEnd="url(#arrow)" />

      <rect x="720" y="60" width="180" height="70" rx="12" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" opacity="0.9" />
      <text x="810" y="90" textAnchor="middle" fill="#1d4ed8" fontSize="13" fontWeight="600">Supabase</text>
      <text x="810" y="110" textAnchor="middle" fill="#475569" fontSize="11">Case storage &amp; RLS</text>

      <rect x="720" y="145" width="180" height="70" rx="12" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" opacity="0.9" />
      <text x="810" y="175" textAnchor="middle" fill="#1d4ed8" fontSize="13" fontWeight="600">n8n Workflow</text>
      <text x="810" y="195" textAnchor="middle" fill="#475569" fontSize="11">Signal scoring &amp; narrative</text>

      <rect x="720" y="230" width="180" height="70" rx="12" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" opacity="0.9" />
      <text x="810" y="260" textAnchor="middle" fill="#1d4ed8" fontSize="13" fontWeight="600">ATLAS</text>
      <text x="810" y="280" textAnchor="middle" fill="#475569" fontSize="11">Illustration sync (Ph. 3)</text>

      <path d="M810 60 C810 30 460 30 460 108" stroke="#1d4ed8" strokeWidth="1.5" strokeDasharray="8 4" markerEnd="url(#arrow-sm)" />
      <text x="635" y="26" textAnchor="middle" fill="#1d4ed8" fontSize="13" fontWeight="700">Recommendation output</text>

      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#1d4ed8" />
        </marker>
        <marker id="arrow-sm" markerWidth="6" markerHeight="6" refX="5" refY="2.5" orient="auto">
          <path d="M0,0 L0,5 L6,2.5 z" fill="#1d4ed8" />
        </marker>
      </defs>
    </svg>
  );
}

export function ForFirms() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-bold text-blue-700 mb-4">
              Turn best-interest documentation into scalable case support
            </h2>
            <p className="text-slate-600 text-xl max-w-3xl mx-auto leading-relaxed">
              PolicyPlan can be offered by BGAs, IMOs, carriers, RIAs, broker-dealers, and enterprise insurance teams as a branded workflow for advisor-supported life insurance sales.
            </p>
          </div>

          <div className="py-16 px-4">
            <FirmDiagramSVG />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {pillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <Card
                  key={i}
                  className="border border-slate-200 hover:border-blue-200 bg-white hover:shadow-md transition-all group"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-blue-50 text-blue-700 rounded-lg p-2 flex-shrink-0 group-hover:bg-blue-700 group-hover:text-white transition-all">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{p.label}</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{p.body}</p>
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
