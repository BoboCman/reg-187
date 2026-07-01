import { Building2, UserCheck, TrendingUp } from "lucide-react";

const pillars = [
  {
    icon: Building2,
    label: "What You Offer",
    body: "A structured best-interest recommendation workspace that helps advisors capture client context, develop a documented rationale, and prepare cleaner carrier-ready output. Delivered as your firm's service.",
  },
  {
    icon: UserCheck,
    label: "What They Receive",
    body: "A guided process, AI-assisted drafting, editable recommendation language, an approval workflow, and a professional documentation package — written in the language your distribution partners expect.",
  },
  {
    icon: TrendingUp,
    label: "What You Build",
    body: "More consistent case support, stronger documentation habits, a better advisor experience, and a scalable infrastructure layer for complex life insurance recommendations. First in line when policy changes come up — earned, not pitched.",
  },
];

function FirmDiagramSVG() {
  return (
    <svg
      viewBox="0 0 920 300"
      className="w-full max-w-[860px] mx-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Your Firm node */}
      <rect x="40" y="110" width="180" height="80" rx="12" fill="#1d4ed8" />
      <text x="130" y="144" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">Your Firm</text>
      <text x="130" y="162" textAnchor="middle" fill="white" fontSize="11" opacity="0.8">BGA · Carrier · RIA</text>
      <text x="130" y="178" textAnchor="middle" fill="white" fontSize="11" opacity="0.8">Advisor · B/D</text>

      {/* Arrow Firm → PolicyPlan */}
      <path d="M222 150 L340 150" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrowGray)" />
      <text x="281" y="143" textAnchor="middle" fill="#94a3b8" fontSize="11">Offers</text>

      {/* PolicyPlan node */}
      <rect x="342" y="100" width="200" height="100" rx="12" fill="white" stroke="#1d4ed8" strokeWidth="2" />
      <text x="442" y="143" textAnchor="middle" fill="#1d4ed8" fontSize="16" fontWeight="700">PolicyPlan</text>
      <text x="442" y="163" textAnchor="middle" fill="#64748b" fontSize="11">Best-Interest</text>
      <text x="442" y="179" textAnchor="middle" fill="#64748b" fontSize="11">Documentation</text>

      {/* Arrow PolicyPlan → partners cluster */}
      <path d="M544 130 L650 90" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrowGray)" />
      <path d="M544 150 L650 150" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrowGray)" />
      <path d="M544 170 L650 210" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrowGray)" />

      {/* Partner label */}
      <rect x="640" y="36" width="220" height="36" rx="6" fill="#f1f5f9" />
      <text x="750" y="59" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="700" letterSpacing="1">PROFESSIONAL PARTNERS</text>

      {/* CPAs */}
      <rect x="652" y="72" width="200" height="46" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      <text x="752" y="101" textAnchor="middle" fill="#1e293b" fontSize="13" fontWeight="600">CPAs</text>

      {/* Advisors */}
      <rect x="652" y="127" width="200" height="46" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      <text x="752" y="156" textAnchor="middle" fill="#1e293b" fontSize="13" fontWeight="600">Advisors &amp; Producers</text>

      {/* Compliance */}
      <rect x="652" y="182" width="200" height="46" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      <text x="752" y="211" textAnchor="middle" fill="#1e293b" fontSize="13" fontWeight="600">Compliance Teams</text>

      {/* Dashed return arc */}
      <path d="M752 72 C752 30 442 30 442 99" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="6 4" markerEnd="url(#arrowBlue)" />
      <text x="597" y="22" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="600">Recommendation output</text>

      <defs>
        <marker id="arrowGray" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="#94a3b8" />
        </marker>
        <marker id="arrowBlue" markerWidth="6" markerHeight="6" refX="5" refY="2.5" orient="auto">
          <path d="M0,0 L0,5 L6,2.5 z" fill="#93c5fd" />
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
            <h2 className="text-3xl md:text-5xl font-bold text-blue-600 mb-4">
              For Firms Serving Advisors at Scale
            </h2>
            <p className="text-slate-500 text-xl max-w-3xl mx-auto leading-relaxed">
              PolicyPlan can be offered by BGAs, IMOs, carriers, RIAs, broker-dealers, and enterprise insurance teams as a branded workflow for advisor-supported life insurance sales.
            </p>
          </div>

          {/* SVG diagram */}
          <div className="py-12 px-4">
            <FirmDiagramSVG />
          </div>

          {/* 3-pillar cards — TOLI "What You Offer / Receive / Build" pattern */}
          <div className="grid md:grid-cols-3 gap-5">
            {pillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-50 text-blue-600 rounded-lg p-2.5 flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">{p.label}</h3>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{p.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
