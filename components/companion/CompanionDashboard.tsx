"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, FileText, Loader2, PenLine, Search, Upload } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { cn } from "@/lib/utils";

export type CompanionRow = {
  id: string;
  updated_at: string;
  phase: string;
  revision: number;
  label: string | null;
  jurisdiction: string | null;
  insurer: string | null;
  product: string | null;
  product_class: string | null;
  death_benefit: number | null;
  planned_outlay: number | null;
};
export type LegacyRow = { id: string; created_at: string; client: string; status: string; output_id: string | null };

type Stage = "attention" | "review" | "working" | "intake" | "approved";
const stageOf = (phase: string): Stage => {
  if (phase.startsWith("blocked_") || phase === "failed_retryable") return "attention";
  if (phase === "draft_ready" || phase === "producer_review") return "review";
  if (phase === "extraction_pending" || phase === "analysis_pending" || phase === "document_received") return "working";
  if (phase === "approved" || phase === "exported") return "approved";
  return "intake";
};
const STAGE: Record<Stage, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  attention: { label: "Needs attention", cls: "bg-red-50 text-red-700 ring-red-200", icon: AlertCircle },
  review: { label: "Ready for review", cls: "bg-amber-50 text-amber-800 ring-amber-200", icon: PenLine },
  working: { label: "Working", cls: "bg-blue-50 text-blue-700 ring-blue-200", icon: Loader2 },
  intake: { label: "Goals and branding", cls: "bg-slate-100 text-slate-600 ring-slate-200", icon: FileText },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle2 },
};
const ORDER: Record<Stage, number> = { attention: 0, review: 1, working: 2, intake: 3, approved: 4 };
const usd = (v: number | null) => (v == null ? null : "$" + Math.round(v).toLocaleString("en-US"));

function relative(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function CompanionDashboard({ companions, letters, firstName, hasLetterhead, legacyEnabled }: { companions: CompanionRow[]; letters: LegacyRow[]; firstName: string | null; hasLetterhead: boolean; legacyEnabled: boolean }) {
  const [hello, setHello] = useState("Welcome back");
  const [q, setQ] = useState("");
  useEffect(() => {
    const h = new Date().getHours();
    setHello(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);
  const list = useMemo(() => {
    const s = q.toLowerCase().trim();
    return companions
      .filter((c) => !s || [c.label, c.insurer, c.product, c.jurisdiction].some((v) => v?.toLowerCase().includes(s)))
      .sort((a, b) => ORDER[stageOf(a.phase)] - ORDER[stageOf(b.phase)] || b.updated_at.localeCompare(a.updated_at));
  }, [companions, q]);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AppNav hideNewIntake />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {hello}
              {firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-[var(--color-text-secondary)] sm:text-base">
              Pick a story, upload the carrier's sales illustration and get a short visual report that explains the proposed design. You review and approve it before sharing.
            </p>
          </div>
          <Link href="/companion/new" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-accent-hover)]">
            <Upload className="h-4 w-4" /> New story
          </Link>
        </div>

        {!hasLetterhead && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-900">
              <span className="font-semibold">Add your letterhead.</span> Your name, firm, logo and disclosures appear on every report.
            </p>
            <Link href="/settings/branding" className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100">
              Set up letterhead
            </Link>
          </div>
        )}

        {companions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-14 text-center">
            <FileText className="mx-auto h-8 w-8 text-[var(--color-accent)]" />
            <h2 className="mt-4 text-base font-semibold">Your stories will appear here</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-text-muted)]">
              Choose a story and upload a carrier&apos;s proposed illustration to start. To see the finished format first, open the{" "}
              <Link href="/sample-story" className="text-[var(--color-accent)] underline">
                sample Apartment story
              </Link>
              .
            </p>
          </div>
        ) : (
          <section className="space-y-3">
            <div className="relative md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input type="search" placeholder="Search label, carrier or product" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-3 text-sm" />
            </div>
            <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
              {list.map((c) => {
                const st = STAGE[stageOf(c.phase)];
                const Icon = st.icon;
                const money = [usd(c.death_benefit), c.planned_outlay != null ? `${usd(c.planned_outlay)}/yr` : null].filter(Boolean).join(" · ");
                return (
                  <li key={c.id}>
                    <Link href={`/companion/${c.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-[var(--color-readonly-bg)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_180px_110px_24px]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{c.label ?? "Untitled case"}</p>
                        <p className="truncate text-xs text-[var(--color-text-muted)]">{[c.jurisdiction, c.revision > 1 ? `Revision ${c.revision}` : null].filter(Boolean).join(" · ") || " "}</p>
                      </div>
                      <span className={cn("inline-flex items-center gap-1.5 justify-self-end rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset md:order-3 md:justify-self-start", st.cls)}>
                        <Icon className={cn("h-3.5 w-3.5", stageOf(c.phase) === "working" && "animate-spin")} /> {st.label}
                      </span>
                      <div className="col-span-2 min-w-0 md:col-span-1 md:order-2">
                        <p className="truncate text-sm">{c.product ?? (c.phase === "created" ? "No illustration yet" : "Reading illustration")}</p>
                        <p className="truncate text-xs tabular-nums text-[var(--color-text-muted)]">{[c.insurer, c.product_class, money].filter(Boolean).join(" · ")}</p>
                      </div>
                      <span className="hidden text-sm text-[var(--color-text-muted)] md:order-4 md:block">{relative(c.updated_at)}</span>
                      <ArrowRight className="hidden h-4 w-4 text-[var(--color-text-muted)] md:order-5 md:block" />
                    </Link>
                  </li>
                );
              })}
              {list.length === 0 && <li className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">Nothing matches your search.</li>}
            </ul>
          </section>
        )}

        {letters.length > 0 && (
          <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
              Earlier Reg 187 letters ({letters.length}){legacyEnabled ? "" : " · kept read-only"}
            </summary>
            <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
              {letters.map((l) => (
                <li key={l.id}>
                  <Link href={`/cases/${l.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-[var(--color-readonly-bg)]">
                    <span className="truncate">{l.client}</span>
                    <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                      {l.status} · {relative(l.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {legacyEnabled && (
              <div className="border-t border-[var(--color-border)] px-5 py-3">
                <Link href="/app" className="text-sm text-[var(--color-accent)] hover:underline">
                  Start a Reg 187 letter
                </Link>
              </div>
            )}
          </details>
        )}
      </main>
    </div>
  );
}
