"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { OBJECTIVE_LABELS } from "@/lib/policyplan/schema";
import type { SuitabilityFlag } from "@/lib/policyplan/rules";
import { AppNav } from "@/components/AppNav";
import { cn } from "@/lib/utils";
import {
  Search,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  FilePlus,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type CaseRow = {
  id: string;
  created_at: string;
  primary_objective: string;
  ownership_type: string;
  insured_display: string;
  flags: SuitabilityFlag[];
  status: string;
};

type SortKey = "attention" | "recent" | "oldest" | "name_asc" | "name_desc";
type StatusFilter = "all" | "submitted" | "in_review" | "resolved" | "adopted";
type TensionFilter = "all" | "review_needed" | "no_tensions";
type OwnershipFilter = "all" | "individual" | "trust" | "business";
type ObjectiveFilter = "all" | string;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  in_review: "In review",
  resolved: "Resolved",
  adopted: "Adopted",
};

// Needs-attention sort score: lower = more urgent
function attentionScore(c: CaseRow): number {
  const hasTensions = c.flags.length > 0;
  if (hasTensions && c.status === "in_review") return 0;
  if (hasTensions && c.status === "submitted") return 1;
  if (hasTensions) return 2;
  if (c.status === "in_review") return 3;
  if (c.status === "submitted") return 4;
  if (c.status === "resolved") return 5;
  if (c.status === "adopted") return 6;
  return 7;
}

// All objective values in display order from spec
const OBJECTIVE_FILTER_ORDER = [
  "wealth_transfer",
  "final_expenses",
  "cash_accumulation",
  "supplemental_retirement_income",
  "estate_equalization",
  "charitable_giving",
  "key_person_protection",
  "business_succession_buy_sell",
  "income_replacement",
  "mortgage_debt_payoff",
  "education_funding",
  "estate_tax_liquidity",
  "executive_benefit",
  "long_term_care_funding",
] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap",
        status === "adopted"
          ? "bg-[var(--color-success-light)] text-[var(--color-success)]"
          : status === "resolved"
          ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
          : status === "in_review"
          ? "bg-blue-50 text-blue-600"
          : "bg-[var(--color-readonly-bg)] text-[var(--color-text-muted)]"
      )}
    >
      {label}
    </span>
  );
}

function TensionBadge({ flags }: { flags: SuitabilityFlag[] }) {
  if (flags.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-success-light)] text-[var(--color-success)] text-[11px] font-semibold whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        No tensions
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold whitespace-nowrap">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      Review needed
      {flags.length > 1 && (
        <span className="ml-0.5 bg-amber-200 text-amber-800 rounded-full px-1.5 py-0 text-[10px] font-bold leading-5">
          {flags.length}
        </span>
      )}
    </span>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}
function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 pl-3 pr-8 text-sm rounded-lg border bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-[var(--color-accent)] transition appearance-none cursor-pointer",
        value !== options[0].value
          ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-light)]"
          : "border-[var(--color-border)]"
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// DashboardClient
// ---------------------------------------------------------------------------
export function DashboardClient({ cases }: { cases: CaseRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tensionFilter, setTensionFilter] = useState<TensionFilter>("all");
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>("all");
  const [objectiveFilter, setObjectiveFilter] = useState<ObjectiveFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("attention");

  // Only show objective options that appear in actual data
  const objectivesInData = useMemo(() => {
    const seen = new Set(cases.map((c) => c.primary_objective).filter(Boolean));
    return OBJECTIVE_FILTER_ORDER.filter((k) => seen.has(k));
  }, [cases]);

  // Summary card counts
  const counts = useMemo(() => ({
    needs_review: cases.filter((c) => c.flags.length > 0).length,
    in_review: cases.filter((c) => c.status === "in_review").length,
    submitted: cases.filter((c) => c.status === "submitted").length,
    adopted: cases.filter((c) => c.status === "adopted").length,
    no_tensions: cases.filter((c) => c.flags.length === 0).length,
    total: cases.length,
  }), [cases]);

  const hasActiveFilters =
    query !== "" ||
    statusFilter !== "all" ||
    tensionFilter !== "all" ||
    ownershipFilter !== "all" ||
    objectiveFilter !== "all" ||
    sortKey !== "attention";

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setTensionFilter("all");
    setOwnershipFilter("all");
    setObjectiveFilter("all");
    setSortKey("attention");
  }

  // Summary card click handlers
  function applySummaryFilter(card: "needs_review" | "in_review" | "submitted" | "adopted" | "no_tensions" | "total") {
    resetFilters();
    if (card === "needs_review") setTensionFilter("review_needed");
    else if (card === "in_review") setStatusFilter("in_review");
    else if (card === "submitted") setStatusFilter("submitted");
    else if (card === "adopted") setStatusFilter("adopted");
    else if (card === "no_tensions") setTensionFilter("no_tensions");
    // total: reset all (already done)
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let result = [...cases];

    if (q) {
      result = result.filter(
        (c) =>
          c.insured_display.toLowerCase().includes(q) ||
          (OBJECTIVE_LABELS[c.primary_objective as keyof typeof OBJECTIVE_LABELS] ?? c.primary_objective)
            .toLowerCase()
            .includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (tensionFilter === "review_needed") {
      result = result.filter((c) => c.flags.length > 0);
    } else if (tensionFilter === "no_tensions") {
      result = result.filter((c) => c.flags.length === 0);
    }
    if (ownershipFilter !== "all") {
      result = result.filter(
        (c) => c.ownership_type.toLowerCase() === ownershipFilter
      );
    }
    if (objectiveFilter !== "all") {
      result = result.filter((c) => c.primary_objective === objectiveFilter);
    }

    result.sort((a, b) => {
      if (sortKey === "attention") {
        const diff = attentionScore(a) - attentionScore(b);
        if (diff !== 0) return diff;
        return b.created_at.localeCompare(a.created_at);
      }
      if (sortKey === "recent") return b.created_at.localeCompare(a.created_at);
      if (sortKey === "oldest") return a.created_at.localeCompare(b.created_at);
      if (sortKey === "name_asc") return a.insured_display.localeCompare(b.insured_display);
      if (sortKey === "name_desc") return b.insured_display.localeCompare(a.insured_display);
      return 0;
    });

    return result;
  }, [cases, query, statusFilter, tensionFilter, ownershipFilter, objectiveFilter, sortKey]);

  // ---------------------------------------------------------------------------
  // Summary cards data
  // ---------------------------------------------------------------------------
  const summaryCards = [
    {
      key: "needs_review" as const,
      label: "Needs review",
      subtext: "Cases with unresolved tensions",
      count: counts.needs_review,
      activeClass: "border-amber-300 bg-amber-50",
      countClass: "text-amber-700",
      isActive: tensionFilter === "review_needed" && statusFilter === "all",
    },
    {
      key: "in_review" as const,
      label: "In review",
      subtext: "Currently being reviewed",
      count: counts.in_review,
      activeClass: "border-blue-200 bg-blue-50",
      countClass: "text-blue-700",
      isActive: statusFilter === "in_review",
    },
    {
      key: "submitted" as const,
      label: "Submitted",
      subtext: "Ready for analysis workflow",
      count: counts.submitted,
      activeClass: "border-[var(--color-border)] bg-[var(--color-readonly-bg)]",
      countClass: "text-[var(--color-text-primary)]",
      isActive: statusFilter === "submitted",
    },
    {
      key: "adopted" as const,
      label: "Adopted",
      subtext: "Recommendation adopted",
      count: counts.adopted,
      activeClass: "border-[var(--color-success)] bg-[var(--color-success-light)]",
      countClass: "text-[var(--color-success)]",
      isActive: statusFilter === "adopted",
    },
    {
      key: "no_tensions" as const,
      label: "No tensions",
      subtext: "Cases with no flagged issues",
      count: counts.no_tensions,
      activeClass: "border-[var(--color-success)] bg-[var(--color-success-light)]",
      countClass: "text-[var(--color-success)]",
      isActive: tensionFilter === "no_tensions",
    },
    {
      key: "total" as const,
      label: "Total cases",
      subtext: "All intakes on file",
      count: counts.total,
      activeClass: "border-[var(--color-accent)] bg-[var(--color-accent-light)]",
      countClass: "text-[var(--color-accent)]",
      isActive: false,
    },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AppNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Cases</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              {cases.length} {cases.length === 1 ? "intake" : "intakes"} on file
            </p>
          </div>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold transition-colors shrink-0"
          >
            <FilePlus className="w-4 h-4" />
            New intake
          </Link>
        </div>

        {/* ── Summary strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {summaryCards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => applySummaryFilter(card.key)}
              className={cn(
                "text-left rounded-lg border px-4 py-3.5 transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)]",
                card.isActive
                  ? card.activeClass + " ring-2 ring-[var(--color-accent-ring)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover,var(--color-accent))]"
              )}
            >
              <p className={cn("text-2xl font-bold tabular-nums leading-none mb-1", card.isActive ? card.countClass : "text-[var(--color-text-primary)]")}>
                {card.count}
              </p>
              <p className="text-xs font-semibold text-[var(--color-text-primary)] leading-tight">
                {card.label}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-tight">
                {card.subtext}
              </p>
            </button>
          ))}
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
            <input
              type="search"
              placeholder="Search by client or objective"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-[var(--color-accent)] transition"
            />
          </div>

          {/* Status */}
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "submitted", label: "Submitted" },
              { value: "in_review", label: "In review" },
              { value: "resolved", label: "Resolved" },
              { value: "adopted", label: "Adopted" },
            ]}
          />

          {/* Tensions */}
          <FilterSelect
            label="Tensions"
            value={tensionFilter}
            onChange={(v) => setTensionFilter(v as TensionFilter)}
            options={[
              { value: "all", label: "All tensions" },
              { value: "review_needed", label: "Review needed" },
              { value: "no_tensions", label: "No tensions" },
            ]}
          />

          {/* Ownership */}
          <FilterSelect
            label="Ownership"
            value={ownershipFilter}
            onChange={(v) => setOwnershipFilter(v as OwnershipFilter)}
            options={[
              { value: "all", label: "All ownership" },
              { value: "individual", label: "Individual" },
              { value: "trust", label: "Trust" },
              { value: "business", label: "Business" },
            ]}
          />

          {/* Primary objective */}
          <FilterSelect
            label="Primary objective"
            value={objectiveFilter}
            onChange={(v) => setObjectiveFilter(v)}
            options={[
              { value: "all", label: "All objectives" },
              ...objectivesInData.map((k) => ({
                value: k,
                label: OBJECTIVE_LABELS[k as keyof typeof OBJECTIVE_LABELS] ?? k,
              })),
            ]}
          />

          {/* Sort */}
          <FilterSelect
            label="Sort"
            value={sortKey}
            onChange={(v) => setSortKey(v as SortKey)}
            options={[
              { value: "attention", label: "Needs attention" },
              { value: "recent", label: "Most recent" },
              { value: "oldest", label: "Oldest" },
              { value: "name_asc", label: "Client name A–Z" },
              { value: "name_desc", label: "Client name Z–A" },
            ]}
          />

          {/* Reset */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Reset filters
            </button>
          )}
        </div>

        {/* ── Empty: no cases at all ── */}
        {cases.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center mb-5">
              <FilePlus className="w-6 h-6 text-[var(--color-accent)]" />
            </div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">No cases yet</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-sm">
              Start a new intake to begin your first case.
            </p>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              New intake
            </Link>
          </div>
        )}

        {/* ── Empty: filters return nothing ── */}
        {cases.length > 0 && filtered.length === 0 && (
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] py-16 text-center">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">No matching cases</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              No cases match the current filters.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm text-[var(--color-accent)] hover:underline font-medium"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* ── Case table ── */}
        {filtered.length > 0 && (
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">

            {/* Table header — col order: Client | Primary objective | Status | Tensions | Ownership | Updated */}
            <div className="grid grid-cols-[minmax(200px,1fr)_minmax(160px,1fr)_120px_140px_110px_100px_32px] gap-4 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-readonly-bg)]">
              {(
                [
                  { label: "Client", sort: "name_asc" as SortKey, desc: "name_desc" as SortKey },
                ] as const
              ).map(({ label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    setSortKey((prev) =>
                      prev === "name_asc" ? "name_desc" : prev === "name_desc" ? "name_asc" : "name_asc"
                    )
                  }
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-left"
                >
                  {label}
                  {sortKey === "name_asc" ? (
                    <ArrowUp className="w-3.5 h-3.5" />
                  ) : sortKey === "name_desc" ? (
                    <ArrowDown className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                  )}
                </button>
              ))}
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Primary objective
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Status
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Tensions
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Ownership
              </span>
              <button
                type="button"
                onClick={() =>
                  setSortKey((prev) => (prev === "recent" ? "oldest" : "recent"))
                }
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-left"
              >
                Updated
                {sortKey === "recent" ? (
                  <ArrowDown className="w-3.5 h-3.5" />
                ) : sortKey === "oldest" ? (
                  <ArrowUp className="w-3.5 h-3.5" />
                ) : (
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                )}
              </button>
              {/* chevron spacer */}
              <span />
            </div>

            {/* Rows */}
            <div className="divide-y divide-[var(--color-border)]">
              {filtered.map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="grid grid-cols-[minmax(200px,1fr)_minmax(160px,1fr)_120px_140px_110px_100px_32px] gap-4 px-5 py-4 hover:bg-[var(--color-readonly-bg)] transition-colors items-center group cursor-pointer"
                >
                  {/* Client */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-accent)] transition-colors">
                      {c.insured_display || "—"}
                    </p>
                    <p className="text-[11px] font-mono text-[var(--color-text-disabled)] mt-0.5 truncate">
                      {c.id.slice(0, 8)}&hellip;
                    </p>
                  </div>

                  {/* Primary objective */}
                  <span className="text-sm text-[var(--color-text-secondary)] truncate">
                    {(OBJECTIVE_LABELS[c.primary_objective as keyof typeof OBJECTIVE_LABELS] ?? c.primary_objective) || "—"}
                  </span>

                  {/* Status */}
                  <div>
                    <StatusBadge status={c.status} />
                  </div>

                  {/* Tensions */}
                  <div>
                    <TensionBadge flags={c.flags} />
                  </div>

                  {/* Ownership */}
                  <span className="text-sm text-[var(--color-text-secondary)] capitalize">
                    {c.ownership_type || "—"}
                  </span>

                  {/* Updated */}
                  <span className="text-sm text-[var(--color-text-muted)] whitespace-nowrap">
                    {formatDate(c.created_at)}
                  </span>

                  {/* Row affordance */}
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-disabled)] group-hover:text-[var(--color-accent)] transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
