"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SuitabilityFlag } from "@/lib/policyplan/rules";
import { FileText, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────

type OutputStatus = "pending" | "complete" | "error";

interface OutputRow {
  id: string;
  status: OutputStatus;
  advisor_letter: string | null;
  client_summary: string | null;
  suitability_flags: SuitabilityFlag[] | null;
  completed_at: string | null;
  meta: Record<string, unknown> | null;
}

interface Props {
  intakeId: string;
  /** Most recent output row fetched server-side, if any. */
  initialOutput: OutputRow | null;
}

// ── Constants ─────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000;
const POLL_MAX_MS = 120_000; // 2 minutes

// ── Component ─────────────────────────────────────────────────────────────

export function GenerateDocuments({ intakeId, initialOutput }: Props) {
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
      setOutput(data as OutputRow);

      if (data.status === "complete" || data.status === "error") {
        stopPolling();
      }
    },
    [stopPolling]
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
      // Cleanup on unmount
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
        throw new Error(
          json?.error === "generation_trigger_failed"
            ? "The generation service could not be reached. Please try again."
            : "Something went wrong. Please try again."
        );
      }

      // Set optimistic pending row so polling starts immediately.
      setOutput({
        id: json.output_id,
        status: "pending",
        advisor_letter: null,
        client_summary: null,
        suitability_flags: null,
        completed_at: null,
        meta: null,
      });
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
            Generate the best-interest support document and client summary for
            this case using the PolicyPlan AI pipeline.
          </p>
          {triggerError && (
            <ErrorBanner message={triggerError} />
          )}
          <TriggerButton loading={triggering} onClick={handleGenerate} />
        </div>
      </GenerateSection>
    );
  }

  // Pending — generating indicator + polling.
  if (output.status === "pending") {
    return (
      <GenerateSection>
        {pollTimedOut ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Generation is taking longer than expected. The documents may still
              be processing — refresh the page to check, or try again.
            </p>
            <TriggerButton loading={false} onClick={handleGenerate} label="Try again" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-[var(--color-accent)] animate-spin shrink-0" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              Generating documents — this takes about 30–60 seconds.
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
          <ErrorBanner message="Document generation failed. You can try again below." />
          {triggerError && <ErrorBanner message={triggerError} />}
          <TriggerButton loading={triggering} onClick={handleGenerate} label="Try again" />
        </div>
      </GenerateSection>
    );
  }

  // Complete — render results.
  return (
    <div className="space-y-5">
      {/* Suitability flags from n8n output (may differ from real-time inferred flags) */}
      {Array.isArray(output.suitability_flags) &&
        output.suitability_flags.length > 0 && (
          <div className="space-y-3">
            {output.suitability_flags.map((flag, i) => (
              <div
                key={flag.code ?? i}
                className="rounded-lg border border-amber-300 bg-[var(--color-warning-light)] px-5 py-4"
              >
                <p className="text-sm font-semibold text-[var(--color-warning)] mb-1">
                  Design tension — advisor review required
                </p>
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

      {/* Advisor Best-Interest Support Document */}
      {output.advisor_letter && (
        <DocumentCard
          title="Advisor Best-Interest Support Document"
          body={output.advisor_letter}
        />
      )}

      {/* Client Summary */}
      {output.client_summary && (
        <DocumentCard title="Client Summary" body={output.client_summary} />
      )}

      {/* PDF export placeholder */}
      <div className="flex items-center justify-between px-5 py-3 rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-readonly-bg)]">
        <p className="text-xs text-[var(--color-text-muted)]">
          PDF export — available in a future release
        </p>
        {/* PDF export button will go here */}
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
        Best-interest documents
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

function DocumentCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-readonly-bg)]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {title}
        </h2>
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
