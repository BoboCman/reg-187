import Link from "next/link";
import { Download } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { SAMPLE_CASES } from "@/lib/companion/samples";

export const metadata = {
  title: "Sample Illustration Companions — PolicyPlan",
  description: "Three fictional Illustration Companions rendered by PolicyPlan from fictional carrier illustrations.",
};

const NOTES: Record<string, string> = {
  "guaranteed-ul": "Single life, protection focus, guarantee to the end of the ledger.",
  "indexed-ul": "Single life, cash value focus, a short no-lapse guarantee and uncertain funding.",
  survivorship: "Two insureds, trust-owned, estate liquidity, limited-pay premium.",
};

export default async function SampleCompanionPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const current = SAMPLE_CASES.find((x) => x.key === s) ?? SAMPLE_CASES[0];
  return (
    <div className="w-full bg-white">
      <LandingNav />
      <main className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Sample companions</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">What a client receives</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Each sample is rendered by the same pipeline producers use, from a fictional carrier illustration with fictional people. Every figure was checked against its fictional illustration page. Fictional demonstration — not a live insurance proposal.
          </p>
          <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Samples">
            {SAMPLE_CASES.map((x) => (
              <Link
                key={x.key}
                href={`/sample-companion?s=${x.key}`}
                role="tab"
                aria-selected={x.key === current.key}
                className={
                  x.key === current.key
                    ? "rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                }
              >
                {x.title}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>{NOTES[current.key]}</p>
            <div className="flex gap-4">
              <a href={`/sample-companion/${current.key}`} target="_blank" rel="noopener" className="font-medium text-blue-700 hover:underline">
                Open full page
              </a>
              <a href={`/samples/${current.key}.pdf`} className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline">
                <Download className="h-4 w-4" /> PDF
              </a>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
            <iframe title={`Sample companion: ${current.title}`} src={`/sample-companion/${current.key}`} className="h-[80vh] min-h-[640px] w-full bg-white" />
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
