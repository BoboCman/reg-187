"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SuitabilityFlag } from "@/lib/policyplan/rules";
import { FileText, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────

// Normalized status vocabulary: pending → draft → final, plus error.
// Legacy 'complete' rows are normalized to 'draft' by the migration.
type OutputStatus = "pending" | "draft" | "final" | "error" | string;

interface OutputRow {
  id: string;
  status: OutputStatus;
  advisor_letter: string | null;
  client_summary: string | null;
  suitability_flags: SuitabilityFlag[] | null;
  completed_at: string | null;
  meta: Record<string, unknown> | null;
  [key: string]: unknown;
}

interface Props {
  intakeId: string;
  /** Most recent output row fetched server-side, if any. */
  initialOutput: OutputRow | null;
  /**
   * Called whenever the output row updates (e.g. on poll result).
   * Used by the workspace shell to advance to the Adopt panel on draft.
   */
  onOutputUpdate?: (output: OutputRow | null) => void;
  /**
   * When false, the generated documents are not rendered inline —
   * the workspace shell will render them in the Adopt/Deliver panels.
   * Defaults to true for backwards-compatible standalone usage.
   */
  showDocumentsInline?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000;
const POLL_MAX_MS = 120_000; // 2 minutes

// ── Component ─────────────────────────────────────────────────────────────

export function GenerateDocuments({
  intakeId,
  initialOutput,
  onOutputUpdate,
  showDocumentsInline = true,
}: Props) {
  const [output, setOutput] = useState<OutputRow | null>(initialOutput);
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  // Polling state
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollOutput = useCallback(
    async (outputId: string) => {
      if (
        pollStartRef.current != null &&
        Date.now() - pollStartRef.current > POLL_MAX_MS
      ) {
        stopPolling();
        setPollTimedOut(true);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from("policyplan_outputs")
        .select(
          "id, status, advisor_letter, client_summary, suitability_flags, completed_at, meta"
        )
        .eq("id", outputId)
        .maybeSingle();

      if (!data) return;
      const updated = data as OutputRow;
      setOutput(updated);
      onOutputUpdate?.(updated);

      // Stop on draft (generation done, awaiting adoption) or error.
      // 'complete' is a legacy alias — treat it as draft.
      if (
        updated.status === "draft" ||
        updated.status === "final" ||
        updated.status === "complete" ||
        updated.status === "error"
      ) {
        stopPolling();
      }
    },
    [stopPolling, onOutputUpdate]
  );

  // Start polling whenever output is pending.
  useEffect(() => {
    if (output?.status === "pending" && !pollingRef.current) {
      pollStartRef.current = Date.now();
      setPollTimedOut(false);
      pollingRef.current = setInterval(
        () => pollOutput(output.id),
        POLL_INTERVAL_MS
      );
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [output?.id, output?.status, pollOutput]);

  // ── Trigger handler ────────────────────────────────────────────────────

  async function handleGenerate() {
    setTriggering(true);
    setTriggerError(null);
    setPollTimedOut(false);

    try {
      const res = await fetch("/api/policyplan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake_id: intakeId }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(
            "This case must be resolved before generating. Complete the Resolve step first."
          );
        }
        throw new Error(
          json?.error === "generation_trigger_failed"
            ? "The generation service could not be reached. Please try again."
            : "Something went wrong. Please try again."
        );
      }

      // Set optimistic pending row so polling starts immediately.
      const optimistic: OutputRow = {
        id: json.output_id,
        status: "pending",
        advisor_letter: null,
        client_summary: null,
        suitability_flags: null,
        completed_at: null,
        meta: null,
      };
      setOutput(optimistic);
      onOutputUpdate?.(optimistic);
    } catch (err) {
      setTriggerError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setTriggering(false);
    }
  }

  // ── Render states ──────────────────────────────────────────────────────

  // No output yet — show the trigger button.
  if (!output) {
    return (
      <GenerateSection>
        <div className="flex flex-col items-start gap-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            The case has been resolved. Generate the best-interest support
            document and client summary using the PolicyPlan AI pipeline.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Generation builds the draft from the frozen snapshot and your
            recorded responses. This can take up to two minutes.
          </p>
          {triggerError && <ErrorBanner message={triggerError} />}
          <TriggerButton loading={triggering} onClick={handleGenerate} />
        </div>
      </GenerateSection>
    );
  }

  // Pending — patient wait state.
  if (output.status === "pending") {
    return (
      <GenerateSection>
        {pollTimedOut ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Still building
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Generation is taking longer than usual. The pipeline may still be
              running — refresh the page to check, or trigger a new attempt
              below.
            </p>
            <TriggerButton loading={false} onClick={handleGenerate} label="Try again" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-[var(--color-accent)] animate-spin shrink-0" />
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Building your draft
              </p>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] ml-7">
              The pipeline is constructing the best-interest document from the
              frozen snapshot and your recorded responses. This typically takes
              30–90 seconds and can run up to two minutes.
            </p>
          </div>
        )}
      </GenerateSection>
    );
  }

  // Error — friendly message + retry.
  if (output.status === "error") {
    return (
      <GenerateSection>
        <div className="flex flex-col gap-3">
          <ErrorBanner message="Document generation encountered an error. You can try again below." />
          {triggerError && <ErrorBanner message={triggerError} />}
          <TriggerButton loading={triggering} onClick={handleGenerate} label="Try again" />
        </div>
      </GenerateSection>
    );
  }

  // Draft / final — show status + optionally inline documents.
  const isDraft = output.status === "draft" || output.status === "complete";
  const isFinal = output.status === "final";

  if (!showDocumentsInline) {
    // Workspace shell renders documents in Adopt/Deliver panels.
    // Just show a compact status line here.
    return (
      <GenerateSection>
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isDraft
              ? "Draft ready — proceed to Adopt."
              : "Document adopted and finalized."}
          </p>
          <div className="flex items-center gap-2">
            <TriggerButton
              loading={triggering}
              onClick={handleGenerate}
              label="Regenerate"
              variant="ghost"
            />
            {triggerError && <ErrorBanner message={triggerError} />}
          </div>
        </div>
      </GenerateSection>
    );
  }

  // Standalone / backwards-compatible: render documents inline.
  return (
    <div className="space-y-5">
      {/* Advisor letter */}
      {output.advisor_letter && (
        <DocumentCard
          title="Advisor Best-Interest Support Document"
          body={output.advisor_letter}
          badge={isDraft ? "Draft" : isFinal ? "Final" : undefined}
        />
      )}

      {/* Client summary */}
      {output.client_summary && (
        <DocumentCard
          title="Client Summary"
          body={output.client_summary}
          badge={isDraft ? "Draft" : isFinal ? "Final" : undefined}
        />
      )}

      {/* PDF placeholder */}
      <div className="flex items-center justify-between px-5 py-3 rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-readonly-bg)]">
        <p className="text-xs text-[var(--color-text-muted)]">
          PDF export — available in a future release
        </p>
      </div>

      {/* Re-generate */}
      <div className="flex items-center gap-3 pt-1">
        <TriggerButton
          loading={triggering}
          onClick={handleGenerate}
          label="Regenerate documents"
          variant="ghost"
        />
        {triggerError && <ErrorBanner message={triggerError} />}
      </div>
    </div>
  );
}

// ── Internal sub-components ────────────────────────────────────────────────

function GenerateSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
        Stage 4 — Generate
      </h2>
      {children}
    </div>
  );
}

function TriggerButton({
  loading,
  onClick,
  label = "Generate best-interest documents",
  variant = "primary",
}: {
  loading: boolean;
  onClick: () => void;
  label?: string;
  variant?: "primary" | "ghost";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50",
        variant === "primary"
          ? "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white"
          : "text-[var(--color-accent)] hover:underline bg-transparent px-0"
      )}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : variant === "ghost" ? (
        <RefreshCw className="w-3.5 h-3.5" />
      ) : (
        <FileText className="w-4 h-4" />
      )}
      {label}
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-[var(--color-error)] bg-[var(--color-error-light)] px-4 py-3">
      <AlertTriangle className="w-4 h-4 text-[var(--color-error)] shrink-0 mt-0.5" />
      <p className="text-sm text-[var(--color-error)]">{message}</p>
    </div>
  );
}

function DocumentCard({
  title,
  body,
  badge,
}: {
  title: string;
  body: string;
  badge?: string;
}) {
  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-readonly-bg)] flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {title}
        </h2>
        {badge && (
          <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-muted)]">
            {badge}
          </span>
        )}
      </div>
      <div className="px-6 py-5">
        {body.split(/\n{2,}/).map((paragraph, i) => (
          <p
            key={i}
            className={cn(
              "text-sm text-[var(--color-text-secondary)] leading-relaxed",
              i > 0 && "mt-4"
            )}
          >
            {paragraph.trim()}
          </p>
        ))}
      </div>
    </div>
  );
}
