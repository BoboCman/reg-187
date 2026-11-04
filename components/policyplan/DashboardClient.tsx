"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  PenLine,
  Search,
  Sparkles,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { OBJECTIVE_LABELS } from "@/lib/policyplan/schema";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
/** Where a case is in Upload > Profile > Letter, from the advisor's view. */
export type LetterStage = "not_started" | "writing" | "review" | "approved" | "attention";

export type CaseRow = {
  id: string;
  created_at: string;
  updated_at: string;
  client: string;
  primary_objective: string;
  stage: LetterStage;
  output_id: string | null;
  carrier: string | null;
  product: string | null;
  face_amount: number | null;
  annual_premium: number | null;
  illustration_file: string | null;
};

type Tab = "all" | "review" | "writing" | "approved";

const STAGE: Record<LetterStage, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  review: { label: "Ready for your review", className: "bg-amber-50 text-amber-800 ring-amber-200", icon: PenLine },
  writing: { label: "Writing the letter", className: "bg-blue-50 text-blue-700 ring-blue-200", icon: Loader2 },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle2 },
  attention: { label: "Needs attention", className: "bg-red-50 text-red-700 ring-red-200", icon: AlertCircle },
  not_started: { label: "Letter not started", className: "bg-slate-100 text-slate-600 ring-slate-200", icon: FileText },
};

// Review first, then work in progress, then the record.
const ORDER: Record<LetterStage, number> = { attention: 0, review: 1, writing: 2, not_started: 3, approved: 4 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const usd = (v: number | null) => (v == null ? null : "$" + Math.round(v).toLocaleString("en-US"));

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function initials(name: string) {
  const parts = name.replace(/&/g, " ").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

const objectiveLabel = (o: string) => OBJECTIVE_LABELS[o as keyof typeof OBJECTIVE_LABELS] ?? "";

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
function StagePill({ stage }: { stage: LetterStage }) {
  const s = STAGE[stage];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap", s.className)}>
      <Icon className={cn("h-3.5 w-3.5", stage === "writing" && "animate-spin")} />
      {s.label}
    </span>
  );
}

function RowAction({ c }: { c: CaseRow }) {
  const base = "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap";
  if (c.stage === "approved" && c.output_id) {
    return (
      <a
        href={`/api/policyplan/letter/${c.output_id}/pdf`}
        className={cn(base, "relative z-10 border border-[var(--color-border-strong)] text-[var(--color-text-primary)] hover:bg-[var(--color-readonly-bg)]")}
      >
        <Download className="h-3.5 w-3.5" /> PDF
      </a>
    );
  }
  if (c.stage === "review") {
    return <span className={cn(base, "bg-[var(--color-accent)] text-white group-hover:bg-[var(--color-accent-hover)]")}>Review</span>;
  }
  if (c.stage === "attention") {
    return <span className={cn(base, "border border-red-200 text-red-700 group-hover:bg-red-50")}>Fix</span>;
  }
  return (
    <span className={cn(base, "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]")}>
      Open <ArrowRight className="h-3.5 w-3.5" />
    </span>
  );
}

const STEPS = [
  {
    icon: Upload,
    title: "Upload the illustration",
    body: "Drop in the carrier's sales illustration. Client names are removed in your browser before anything is sent.",
  },
  {
    icon: UserRound,
    title: "Answer a short profile",
    body: "Goals, finances and four quick Reg 187 questions. About three minutes.",
  },
  {
    icon: Sparkles,
    title: "Review and sign the letter",
    body: "PolicyPlan drafts a best-interest letter from the illustration and profile. You edit, approve and download it on your letterhead.",
  },
];

function HowItWorks({ onDismiss, compact }: { onDismiss?: () => void; compact?: boolean }) {
  return (
    <section className="relative rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-white to-[var(--color-accent-light)] p-6 sm:p-8">
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-white hover:text-[var(--color-text-primary)]"
          aria-label="Hide how it works"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">How it works</p>
      <h2 className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
        From sales illustration to a signed Reg 187 letter in three steps
      </h2>
      <ol className={cn("mt-6 grid gap-6", compact ? "sm:grid-cols-3" : "md:grid-cols-3")}>
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-accent)] shadow-sm ring-1 ring-[var(--color-border)]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  <span className="mr-1.5 tabular-nums text-[var(--color-text-muted)]">{i + 1}.</span>
                  {s.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">{s.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------
// DashboardClient
// ---------------------------------------------------------------------------
const HIDE_KEY = "pp.dashboard.hideHowItWorks";

export function DashboardClient({
  cases,
  firstName,
  hasLetterhead,
}: {
  cases: CaseRow[];
  firstName: string | null;
  hasLetterhead: boolean;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [hideHow, setHideHow] = useState(false);
  const [hello, setHello] = useState("Welcome back");

  useEffect(() => {
    setHello(greeting());
    try {
      setHideHow(window.localStorage.getItem(HIDE_KEY) === "1");
    } catch {
      /* storage unavailable: keep showing it */
    }
  }, []);

  function dismissHow() {
    setHideHow(true);
    try {
      window.localStorage.setItem(HIDE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  const counts = useMemo(
    () => ({
      all: cases.length,
      review: cases.filter((c) => c.stage === "review" || c.stage === "attention").length,
      writing: cases.filter((c) => c.stage === "writing" || c.stage === "not_started").length,
      approved: cases.filter((c) => c.stage === "approved").length,
    }),
    [cases]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return cases
      .filter((c) => {
        if (tab === "review") return c.stage === "review" || c.stage === "attention";
        if (tab === "writing") return c.stage === "writing" || c.stage === "not_started";
        if (tab === "approved") return c.stage === "approved";
        return true;
      })
      .filter((c) =>
        !q
          ? true
          : [c.client, c.carrier, c.product, objectiveLabel(c.primary_objective)].some((v) => v?.toLowerCase().includes(q))
      )
      .sort((a, b) => ORDER[a.stage] - ORDER[b.stage] || b.updated_at.localeCompare(a.updated_at));
  }, [cases, query, tab]);

  const showHow = cases.length < 3 || !hideHow;
  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All letters" },
    { key: "review", label: "Needs your review" },
    { key: "writing", label: "In progress" },
    { key: "approved", label: "Approved" },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AppNav hideNewIntake />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
              {hello}
              {firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-[var(--color-text-secondary)] sm:text-base">
              Turn a carrier illustration and a short client profile into a New York Reg 187 best-interest letter, on your letterhead.
            </p>
          </div>
          <Link
            href="/app"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            <Upload className="h-4 w-4" />
            Start a new letter
          </Link>
        </div>

        {/* ── Letterhead nudge ── */}
        {!hasLetterhead && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <PenLine className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Add your letterhead</p>
                <p className="text-sm text-amber-800">Your name, firm, logo and disclosures appear on every letter you send.</p>
              </div>
            </div>
            <Link
              href="/settings/branding"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100"
            >
              Set up letterhead
            </Link>
          </div>
        )}

        {showHow && <HowItWorks onDismiss={cases.length >= 3 ? dismissHow : undefined} />}

        {/* ── Empty state ── */}
        {cases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-light)]">
              <FileText className="h-6 w-6 text-[var(--color-accent)]" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-[var(--color-text-primary)]">Your letters will appear here</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--color-text-muted)]">
              Start with a real illustration. To see how it works first, choose “Try the sample case” on the upload screen.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/app"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)]"
              >
                <Upload className="h-4 w-4" /> Start a new letter
              </Link>
            </div>
          </div>
        ) : (
          <section className="space-y-4">
            {/* ── Tabs + search ── */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="-mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Filter letters">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm transition-colors",
                      tab === t.key
                        ? "bg-[var(--color-surface)] font-semibold text-[var(--color-text-primary)] shadow-sm ring-1 ring-[var(--color-border)]"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    )}
                  >
                    {t.label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-xs tabular-nums",
                        t.key === "review" && counts.review > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-[var(--color-readonly-bg)] text-[var(--color-text-muted)]"
                      )}
                    >
                      {counts[t.key]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="relative md:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="search"
                  placeholder="Search client, carrier or product"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-3 text-sm placeholder:text-[var(--color-text-disabled)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)]"
                />
              </div>
            </div>

            {/* ── List ── */}
            <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
              <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_190px_110px_84px] gap-4 border-b border-[var(--color-border)] bg-[var(--color-readonly-bg)] px-5 py-2.5 text-xs font-medium text-[var(--color-text-muted)] md:grid">
                <span>Client</span>
                <span>Proposed policy</span>
                <span>Status</span>
                <span>Updated</span>
                <span />
              </div>

              {filtered.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Nothing here</p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {query ? "No letters match your search." : "No letters in this view yet."}
                  </p>
                  {(query || tab !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setTab("all");
                      }}
                      className="mt-3 text-sm font-medium text-[var(--color-accent)] hover:underline"
                    >
                      Show all letters
                    </button>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {filtered.map((c) => {
                    const carrier = c.carrier?.replace(/\s+(Life\s+)?(Insurance|Assurance)(\s+Company)?(\s+of\s+.+)?$/i, "").replace(/,?\s+Inc\.?$/i, "") ?? null;
                    const policy = c.product ?? carrier;
                    const money = [c.product ? carrier : null, usd(c.face_amount), c.annual_premium != null ? `${usd(c.annual_premium)}/yr` : null].filter(Boolean).join(" · ");
                    return (
                      <li key={c.id}>
                        <div
                          className="group relative grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-[var(--color-readonly-bg)] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_190px_110px_84px]"
                        >
                          <Link href={`/cases/${c.id}`} className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent-ring)]" aria-label={`Open ${c.client}`} />
                          {/* Client */}
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-xs font-semibold text-[var(--color-accent)]">
                              {initials(c.client)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                                {c.client}
                              </p>
                              <p className="truncate text-xs text-[var(--color-text-muted)]">
                                {objectiveLabel(c.primary_objective) || "Objective not set"}
                              </p>
                            </div>
                          </div>

                          {/* Action (mobile: top right) */}
                          <div className="justify-self-end md:hidden">
                            <RowAction c={c} />
                          </div>

                          {/* Policy */}
                          <div className="col-span-2 min-w-0 md:col-span-1">
                            {policy ? (
                              <>
                                <p className="truncate text-sm text-[var(--color-text-primary)]">{policy}</p>
                                {money && <p className="truncate text-xs tabular-nums text-[var(--color-text-muted)]">{money}</p>}
                              </>
                            ) : (
                              <p className="truncate text-sm text-[var(--color-text-muted)]">
                                {c.illustration_file ?? "No illustration uploaded"}
                              </p>
                            )}
                          </div>

                          {/* Status + updated (mobile: one line) */}
                          <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:block">
                            <StagePill stage={c.stage} />
                            <span className="text-xs text-[var(--color-text-muted)] md:hidden">{relative(c.updated_at)}</span>
                          </div>
                          <span className="hidden text-sm text-[var(--color-text-muted)] md:block">{relative(c.updated_at)}</span>

                          <div className="hidden justify-self-end md:block">
                            <RowAction c={c} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
