"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { stepOf } from "@/lib/companion/state";
import { cn } from "@/lib/utils";
import { api, errorMessage, type CaseView } from "./api";
import { UploadStep } from "./UploadStep";
import { FactsStep } from "./FactsStep";
import { BriefStep } from "./BriefStep";
import { CompanionStep, ReviewStep } from "./ReviewStep";

const STEPS = ["Illustration", "Client objective", "Review", "Companion"] as const;
const POLL = new Set(["extraction_pending", "analysis_pending", "document_received"]);

/** A failed extraction belongs to the Illustration step; a failed draft to Review. */
const stepFor = (v: CaseView) => (v.phase === "failed_retryable" && !v.evidence ? 1 : stepOf(v.phase));

const BLOCKED: Record<string, string> = {
  blocked_privacy: "Nothing was sent: personal details were still present after redaction. Check the names and upload again.",
  blocked_unsupported: "This document is not supported (in-force, term, scanned or unreadable). Upload the carrier's proposed sales illustration.",
  blocked_evidence: "The figures could not be matched to the pages. Try again or upload the original PDF.",
};

export function CompanionWorkspace({ initial }: { initial: CaseView | null }) {
  const [view, setView] = useState<CaseView | null>(initial);
  const [caseId, setCaseId] = useState<string | null>(initial?.id ?? null);
  const [step, setStep] = useState<number>(initial ? stepFor(initial) : 1);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);

  const refresh = useCallback(
    async (id = caseId, follow = true): Promise<CaseView | null> => {
      if (!id) return null;
      try {
        const v = await api<CaseView>(`/api/companion/cases/${id}`);
        setView((prev) => {
          if (follow && (!prev || prev.phase !== v.phase)) setStep(stepFor(v));
          return v;
        });
        setLoadErr(null);
        return v;
      } catch (e) {
        setLoadErr(errorMessage(e));
        return null;
      }
    },
    [caseId],
  );

  const pending = !!view && (POLL.has(view.phase) || view.output?.status === "pending");
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => refresh(), 4000);
    return () => clearInterval(t);
  }, [pending, refresh]);

  const current = view ? stepFor(view) : 1;
  const done = (i: number) => {
    if (!view) return false;
    if (i === 1) return !!view.facts_confirmed;
    if (i === 2) return view.brief_missing.length === 0 && !!view.facts_confirmed;
    if (i === 3) return view.output?.status === "final";
    return view.phase === "exported";
  };
  const reachable = (i: number) => i === 1 || (view && (i <= current || done(i - 1)));
  const meta = (view?.case_meta ?? {}) as { case_label?: string; sales_jurisdiction?: string };
  const ill = (view?.illustration ?? null) as { page_count?: number } | null;
  const showUpload = !view || replacing || (!view.evidence && !POLL.has(view.phase) && view.phase !== "failed_retryable") || view.phase.startsWith("blocked_");

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AppNav hideNewIntake />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              <ArrowLeft className="h-4 w-4" /> Companions
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{view ? meta.case_label || "Illustration Companion" : "New Illustration Companion"}</h1>
            {view && (
              <p className="text-sm text-[var(--color-text-muted)]">
                {[meta.sales_jurisdiction, ill?.page_count ? `${ill.page_count}-page illustration` : null, `Revision ${view.revision}`].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          {pending && (
            <span className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Working…
            </span>
          )}
        </div>

        <ol className="grid grid-cols-4 gap-1 sm:gap-2" aria-label="Steps">
          {STEPS.map((label, idx) => {
            const i = idx + 1;
            const active = step === i;
            const ok = done(i);
            return (
              <li key={label}>
                <button
                  type="button"
                  disabled={!reachable(i)}
                  onClick={() => setStep(i)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 rounded-lg border px-2 py-2 text-left transition-colors sm:flex-row sm:items-center sm:gap-2 sm:px-3",
                    active ? "border-[var(--color-accent)] bg-[var(--color-surface)] shadow-sm" : "border-transparent hover:bg-[var(--color-surface)]",
                    !reachable(i) && "opacity-50",
                  )}
                >
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold", ok ? "bg-emerald-600 text-white" : active ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-readonly-bg)] text-[var(--color-text-muted)]")}>
                    {ok ? <Check className="h-3.5 w-3.5" /> : i}
                  </span>
                  <span className={cn("text-xs sm:text-sm", active ? "font-semibold text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]")}>{label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {loadErr && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadErr}</p>}
        {view && BLOCKED[view.phase] && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{BLOCKED[view.phase]}</p>}

        {step === 1 && (
          <div className="space-y-4">
            {showUpload ? (
              <UploadStep
                caseId={caseId}
                defaultJurisdiction={meta.sales_jurisdiction}
                onCreated={(id) => {
                  setCaseId(id);
                  window.history.replaceState(null, "", `/companion/${id}`);
                }}
                onSubmitted={() => {
                  setReplacing(false);
                  // The case id may have been set moments ago in this same call.
                  const id = window.location.pathname.split("/").pop();
                  if (id && id !== "new") refresh(id);
                }}
              />
            ) : (
              view && <FactsStep view={view} onChange={() => refresh()} />
            )}
            {view && !showUpload && (
              <button type="button" onClick={() => setReplacing(true)} className="text-sm text-[var(--color-text-muted)] underline-offset-2 hover:underline">
                Replace the illustration (starts a new revision)
              </button>
            )}
            {!!view?.facts_confirmed && !showUpload && (
              <div className="flex justify-end">
                <button type="button" onClick={() => setStep(2)} className="h-10 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white">
                  Continue to client objective
                </button>
              </div>
            )}
          </div>
        )}
        {step === 2 && view && (
          <BriefStep
            key={`${view.id}:${view.revision}`}
            view={view}
            onChange={async () => {
              const v = await refresh(view.id, false);
              if (v && v.brief_missing.length === 0 && v.facts_confirmed) setStep(3);
            }}
          />
        )}
        {step === 3 && view && <ReviewStep view={view} onChange={() => refresh()} />}
        {step === 4 && view && <CompanionStep view={view} />}
      </main>
    </div>
  );
}
