"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OBJECTIVE_LABELS, type PolicyPlanIntake } from "@/lib/policyplan/schema";
import type { SuitabilityFlag } from "@/lib/policyplan/rules";
import {
  Search,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  FilePlus,
  LogOut,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type CaseRow = {
  id: string;
  created_at: string;
  primary_objective: string;
  ownership_type: string;
  // Computed on the server before passing down
  insured_display: string;
  flags: SuitabilityFlag[];
};

type SortField = "created_at" | "insured" | "objective";
type SortDir = "asc" | "desc";

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

function TensionIndicator({ flags }: { flags: SuitabilityFlag[] }) {
  if (flags.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-success-light)] text-[var(--color-success)] text-xs font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5" />
        No tensions
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-warning-light)] border border-amber-300 text-[var(--color-warning)] text-xs font-semibold">
      <AlertTriangle className="w-3.5 h-3.5" />
      Review needed
      {flags.length > 1 && (
        <span className="ml-0.5 bg-amber-200 text-amber-800 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
          {flags.length}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// DashboardClient
// ---------------------------------------------------------------------------
export function DashboardClient({ cases }: { cases: CaseRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5" />
    );
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const result = q
      ? cases.filter(
          (c) =>
            c.insured_display.toLowerCase().includes(q) ||
            (OBJECTIVE_LABELS[c.primary_objective as keyof typeof OBJECTIVE_LABELS] ?? c.primary_objective)
              .toLowerCase()
              .includes(q)
        )
      : [...cases];

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "created_at") {
        cmp = a.created_at.localeCompare(b.created_at);
      } else if (sortField === "insured") {
        cmp = a.insured_display.localeCompare(b.insured_display);
      } else if (sortField === "objective") {
        cmp = a.primary_objective.localeCompare(b.primary_objective);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [cases, query, sortField, sortDir]);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[var(--color-text-muted)]">
              Insurance Planner AI Professional
            </p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">
              PolicyPlan
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              New intake
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors px-2 py-2"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Page title + controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Cases
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              {cases.length} {cases.length === 1 ? "intake" : "intakes"} on
              file
            </p>
          </div>
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
            <input
              type="search"
              placeholder="Search by name or objective…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-[var(--color-accent)] transition"
            />
          </div>
        </div>

        {/* Empty state */}
        {cases.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center mb-5">
              <FilePlus className="w-6 h-6 text-[var(--color-accent)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              No cases yet
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-sm">
              Complete your first intake to begin building your case history.
            </p>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              Start your first intake
            </Link>
          </div>
        )}

        {/* No search results */}
        {cases.length > 0 && filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              No cases match &ldquo;{query}&rdquo;
            </p>
            <button
              onClick={() => setQuery("")}
              className="mt-2 text-sm text-[var(--color-accent)] hover:underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Table */}
        {filtered.length > 0 && (
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-readonly-bg)]">
              <button
                onClick={() => toggleSort("insured")}
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-left"
              >
                Insured <SortIcon field="insured" />
              </button>
              <button
                onClick={() => toggleSort("objective")}
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-left"
              >
                Primary objective <SortIcon field="objective" />
              </button>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Ownership
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Tensions
              </span>
              <button
                onClick={() => toggleSort("created_at")}
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-left"
              >
                Date <SortIcon field="created_at" />
              </button>
            </div>

            {/* Rows */}
            <div className="divide-y divide-[var(--color-border)]">
              {filtered.map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 hover:bg-[var(--color-readonly-bg)] transition-colors items-center group"
                >
                  {/* Insured name + case ID */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-accent)] transition-colors">
                      {c.insured_display || "—"}
                    </p>
                    <p className="text-[11px] font-mono text-[var(--color-text-muted)] mt-0.5 truncate">
                      {c.id}
                    </p>
                  </div>

                  {/* Primary objective */}
                  <span className="text-sm text-[var(--color-text-secondary)] whitespace-nowrap">
                    {OBJECTIVE_LABELS[
                      c.primary_objective as keyof typeof OBJECTIVE_LABELS
                    ] ?? c.primary_objective}
                  </span>

                  {/* Ownership */}
                  <span className="text-sm text-[var(--color-text-secondary)] capitalize whitespace-nowrap">
                    {c.ownership_type}
                  </span>

                  {/* Tension indicator */}
                  <TensionIndicator flags={c.flags} />

                  {/* Date */}
                  <span className="text-sm text-[var(--color-text-muted)] whitespace-nowrap">
                    {formatDate(c.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
