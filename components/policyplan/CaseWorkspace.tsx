"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PolicyPlanIntake } from "@/lib/policyplan/schema";
import type { SuitabilityFlag } from "@/lib/policyplan/rules";
import { PPCaseReview } from "@/components/policyplan/PPCaseReview";
import { PPResolve } from "@/components/policyplan/PPResolve";
import { PPAdopt } from "@/components/policyplan/PPAdopt";
import { PPDeliver } from "@/components/policyplan/PPDeliver";
import { GenerateDocuments } from "@/components/policyplan/GenerateDocuments";

// ── Types ────────────────────────────────────────────────────────────────────

type IntakeStatus = "in_review" | "resolved" | "adopted" | string;
type OutputStatus = "pending" | "draft" | "final" | "error" | string;

interface OutputRow {
  id: string;
  status: OutputStatus;
  advisor_letter: string | null;
  client_summary: string | null;
  suitability_flags: SuitabilityFlag[] | null;
  flag_resolutions: FlagResolution[] | null;
  adopted_by: string | null;
  adopted_at: string | null;
  adoption_confirmation: string | null;
  completed_at: string | null;
  meta: Record<string, unknown> | null;
}

export interface FlagResolution {
  code: string;
  resolution_text: string;
  resolved_by: string;
  resolved_at: string;
}

interface Props {
  intakeId: string;
  intake: PolicyPlanIntake;
  intakeStatus: IntakeStatus;
  storedEmphasis: Record<string, "high" | "moderate" | "low"> | null;
  storedFlags: SuitabilityFlag[] | null;
  storedResolutions: FlagResolution[] | null;
  intakeVersion: number;
  createdAt: string;
  outputRow: OutputRow | null;
}

// ── Journey rail data ────────────────────────────────────────────────────────

const CHAPTERS = [
  {
    label: "Prepare",
    stages: [{ num: 1, label: "Intake" }],
  },
  {
    label: "Analyze",
    stages: [
      { num: 2, label: "Review" },
      { num: 3, label: "Resolve" },
    ],
  },
  {
    label: "Finalize",
    stages: [
      { num: 4, label: "Generate" },
      { num: 5, label: "Adopt" },
      { num: 6, label: "Deliver" },
    ],
  },
];

// Map intakeStatus + outputStatus → active stage number
function deriveActiveStage(
  intakeStatus: IntakeStatus,
  outputRow: OutputRow | null
): number {
  if (intakeStatus === "adopted") return 6;
  if (outputRow?.status === "final") return 6;
  if (outputRow?.status === "draft") return 5;
  if (outputRow?.status === "pending") return 4;
  if (intakeStatus === "resolved") return 4;
  if (intakeStatus === "in_review") return 2; // Resolve only after review
  return 2;
}

function stageStatus(
  stageNum: number,
  activeStage: number,
  intakeStatus: IntakeStatus,
  outputRow: OutputRow | null
): "done" | "active" | "locked" {
  if (stageNum < activeStage) return "done";
  if (stageNum === activeStage) return "active";
  return "locked";
}

// ── Journey Rail ─────────────────────────────────────────────────────────────

function JourneyRail({
  activeStage,
  intakeStatus,
  outputRow,
  currentPanel,
  onSelect,
}: {
  activeStage: number;
  intakeStatus: IntakeStatus;
  outputRow: OutputRow | null;
  currentPanel: number;
  onSelect: (num: number) => void;
}) {
  function stageStatusLabel(stageNum: number): string | null {
    if (stageNum !== activeStage) return null;
    if (stageNum === 2) return advisorFacingStatus(intakeStatus);
    if (stageNum === 3) return intakeStatus === "resolved" ? "Responses recorded" : null;
    if (stageNum === 4) return outputRow?.status === "pending" ? "Building draft…" : null;
    if (stageNum === 5) return outputRow?.status === "draft" ? "Draft ready" : null;
    if (stageNum === 6) return outputRow?.status === "final" ? "Delivered" : null;
    return null;
  }

  return (
    <nav
      aria-label="Case journey"
      className="w-56 shrink-0 pt-2 pr-6 border-r border-[var(--color-border)] hidden md:block"
    >
      <div className="space-y-6">
        {CHAPTERS.map((chapter) => (
          <div key={chapter.label}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-3 pl-0.5">
              {chapter.label}
            </p>
            <ol className="space-y-1">
              {chapter.stages.map(({ num, label }) => {
                const status = stageStatus(num, activeStage, intakeStatus, outputRow);
                const isClickable = status === "done" || status === "active";
                const statusNote = stageStatusLabel(num);

                return (
                  <li key={num}>
                    <button
                      type="button"
                      onClick={() => isClickable && onSelect(num)}
                      disabled={!isClickable}
                      aria-current={currentPanel === num ? "step" : undefined}
                      className={cn(
                        "w-full flex items-start gap-3 px-2 py-2 rounded-md transition-colors text-left group",
                        currentPanel === num
                          ? "bg-[var(--color-accent-light)]"
                          : isClickable
                          ? "hover:bg-[var(--color-readonly-bg)]"
                          : "cursor-not-allowed opacity-50"
                      )}
                    >
                      {/* Stage indicator */}
                      <span
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold border transition-colors",
                          status === "done" &&
                            "bg-[var(--color-accent)] border-[var(--color-accent)] text-white",
                          status === "active" &&
                            "bg-[var(--color-accent)] border-[var(--color-accent)] text-white",
                          status === "locked" &&
                            "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-disabled)]"
                        )}
                      >
                        {status === "done" ? <Check size={12} strokeWidth={2.5} /> : status === "locked" ? <Lock size={11} strokeWidth={2} /> : num}
                      </span>

                      <span className="flex flex-col min-w-0">
                        <span
                          className={cn(
                            "text-sm leading-tight",
                            currentPanel === num
                              ? "font-semibold text-[var(--color-accent)]"
                              : status === "done"
                              ? "text-[var(--color-text-secondary)]"
                              : status === "active"
                              ? "font-semibold text-[var(--color-text-primary)]"
                              : "text-[var(--color-text-muted)]"
                          )}
                        >
                          {label}
                        </span>
                        {statusNote && (
                          <span className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-tight">
                            {statusNote}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </nav>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function advisorFacingStatus(status: IntakeStatus): string {
  const MAP: Record<string, string> = {
    submitted: "Submitted",
    in_review: "In review",
    resolved: "Responses recorded",
    adopted: "Adopted",
    superseded: "Superseded",
  };
  return MAP[status] ?? status;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Case Header ───────────────────────────────────────────────────────────────

function CaseHeader({
  intakeId,
  intake,
  intakeStatus,
  intakeVersion,
  createdAt,
}: {
  intakeId: string;
  intake: PolicyPlanIntake;
  intakeStatus: IntakeStatus;
  intakeVersion: number;
  createdAt: string;
}) {
  const insuredNames = intake.insured_owner.insureds
    .map((i) => i.name)
    .filter(Boolean)
    .join(" & ");

  return (
    <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Cases</span>
          </Link>
          <span className="text-[var(--color-border)] select-none hidden sm:inline">|</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
              {insuredNames || "Unnamed case"}
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)] font-mono mt-0.5">
              {intakeId.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Snapshot seal */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              Version {intakeVersion}
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)] font-mono mt-0.5">
              {formatDate(createdAt)}
            </p>
          </div>
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded border",
              intakeStatus === "adopted"
                ? "border-[var(--color-success)] text-[var(--color-success)] bg-[var(--color-success-light)]"
                : intakeStatus === "resolved"
                ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-light)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-readonly-bg)]"
            )}
          >
            {advisorFacingStatus(intakeStatus)}
          </span>
        </div>
      </div>
    </header>
  );
}

// ── Collapsed stage summary card ─────────────────────────────────────────────

function StageSummaryCard({
  stageNum,
  label,
  summary,
  onClick,
}: {
  stageNum: number;
  label: string;
  summary: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-readonly-bg)] transition-colors text-left group"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-white">
        <Check size={12} strokeWidth={2.5} />
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Stage {stageNum} — {label}
        </span>
        <p className="text-sm text-[var(--color-text-secondary)] truncate mt-0.5">
          {summary}
        </p>
      </div>
      <span className="text-xs text-[var(--color-accent)] group-hover:underline shrink-0">
        Expand
      </span>
    </button>
  );
}

// ── Main Workspace ────────────────────────────────────────────────────────────

export function CaseWorkspace({
  intakeId,
  intake,
  intakeStatus,
  storedEmphasis,
  storedFlags,
  storedResolutions,
  intakeVersion,
  createdAt,
  outputRow: initialOutputRow,
}: Props) {
  const activeStage = deriveActiveStage(intakeStatus, initialOutputRow);
  const [currentPanel, setCurrentPanel] = useState<number>(activeStage);
  const [localIntakeStatus, setLocalIntakeStatus] = useState<IntakeStatus>(intakeStatus);
  const [localResolutions, setLocalResolutions] = useState<FlagResolution[] | null>(storedResolutions);
  const [outputRow, setOutputRow] = useState<OutputRow | null>(initialOutputRow);

  // When resolve completes, advance state
  function handleResolved(resolutions: FlagResolution[]) {
    setLocalResolutions(resolutions);
    setLocalIntakeStatus("resolved");
    setCurrentPanel(4); // jump to Generate
  }

  // When adoption completes
  function handleAdopted(updatedOutput: OutputRow) {
    setOutputRow(updatedOutput);
    setLocalIntakeStatus("adopted");
    setCurrentPanel(6);
  }

  const flags = storedFlags ?? [];
  const insuredNames = intake.insured_owner.insureds
    .map((i) => i.name)
    .filter(Boolean)
    .join(" & ");

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <CaseHeader
        intakeId={intakeId}
        intake={intake}
        intakeStatus={localIntakeStatus}
        intakeVersion={intakeVersion}
        createdAt={createdAt}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex gap-8">
        {/* Left: Journey rail */}
        <JourneyRail
          activeStage={deriveActiveStage(localIntakeStatus, outputRow)}
          intakeStatus={localIntakeStatus}
          outputRow={outputRow}
          currentPanel={currentPanel}
          onSelect={setCurrentPanel}
        />

        {/* Right: Working panel */}
        <main className="flex-1 min-w-0 space-y-4">

          {/* Stage 1 — Intake (always done by the time we're on this page) */}
          {currentPanel !== 1 && (
            <StageSummaryCard
              stageNum={1}
              label="Intake"
              summary={`${insuredNames || "Case"} · ${intake.objectives.primary.replace(/_/g, " ")} · ${intake.insured_owner.ownership_type}`}
              onClick={() => setCurrentPanel(1)}
            />
          )}
          {currentPanel === 1 && (
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Stage 1 — Intake
                </h2>
                <span className="text-xs text-[var(--color-text-muted)] px-2.5 py-1 rounded border border-[var(--color-border)] bg-[var(--color-readonly-bg)]">
                  Submitted
                </span>
              </div>
              <PPCaseReview
                intake={intake}
                caseId={intakeId}
                storedEmphasis={storedEmphasis}
                storedFlags={flags}
              />
            </div>
          )}

          {/* Stage 2 — Review */}
          {currentPanel === 2 && (
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Stage 2 — Review
                </h2>
                <span className="text-xs text-[var(--color-text-muted)] px-2.5 py-1 rounded border border-[var(--color-border)] bg-[var(--color-readonly-bg)]">
                  In review
                </span>
              </div>

              {/* Flag briefing */}
              {flags.length === 0 ? (
                <div className="mb-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-readonly-bg)] px-5 py-4">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                    No automated flags
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    The automated checks did not raise any flags for this case.
                    Advisor review is still required before proceeding.
                  </p>
                </div>
              ) : (
                <div className="mb-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                    {flags.length} {flags.length === 1 ? "flag" : "flags"} to address
                  </p>
                  {flags.map((flag) => (
                    <div
                      key={flag.code}
                      className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-4"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono text-[var(--color-text-muted)] bg-[var(--color-readonly-bg)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                          {flag.code}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)] border border-[var(--color-border)] px-2 py-0.5 rounded">
                          {flag.severity}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {flag.description}
                      </p>
                      {flag.requirement && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-2 font-mono">
                          §{flag.requirement}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Primary action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentPanel(3)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold transition-colors"
                >
                  Continue to resolve
                </button>
              </div>
            </div>
          )}

          {/* Stage 3 — Resolve */}
          {currentPanel === 3 && (
            <PPResolve
              intakeId={intakeId}
              flags={flags}
              existingResolutions={localResolutions}
              onResolved={handleResolved}
            />
          )}

          {/* Stage 4 — Generate */}
          {currentPanel === 4 && (
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Stage 4 — Generate
                </h2>
              </div>
              <GenerateDocuments
                intakeId={intakeId}
                initialOutput={outputRow}
                onOutputUpdate={(updated) => {
                  setOutputRow(updated as OutputRow);
                  if (updated?.status === "draft") setCurrentPanel(5);
                }}
                showDocumentsInline={false}
              />
            </div>
          )}

          {/* Stage 5 — Adopt */}
          {currentPanel === 5 && outputRow?.status === "draft" && (
            <PPAdopt
              intakeId={intakeId}
              outputRow={outputRow}
              onAdopted={handleAdopted}
            />
          )}
          {currentPanel === 5 && outputRow?.status !== "draft" && (
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
              <p className="text-sm text-[var(--color-text-muted)]">
                Awaiting a generated draft before adoption is available.
              </p>
            </div>
          )}

          {/* Stage 6 — Deliver */}
          {currentPanel === 6 && (
            <PPDeliver
              intakeId={intakeId}
              outputRow={outputRow}
              intakeVersion={intakeVersion}
            />
          )}
        </main>
      </div>
    </div>
  );
}
