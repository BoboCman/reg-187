"use client";
import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OutputRow, FlagResolution } from "@/components/policyplan/CaseWorkspace";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentRenderer } from "@/components/policyplan/document/DocumentRenderer";

interface Props {
  intakeId: string;
  outputRow: OutputRow;
  onAdopted: (updatedOutput: OutputRow) => void;
}

const ADOPTION_STATEMENT =
  "I have reviewed this document in full and adopt it as my professional recommendation for this client. I attest that it accurately reflects my analysis and the best-interest basis for this recommendation.";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


export function PPAdopt({ intakeId, outputRow, onAdopted }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [adopting, setAdopting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track which documents the producer has opened (expanded).
  // Attestation checkbox is locked until both have been opened.
  const hasAdvisorLetter = Boolean(outputRow.advisor_letter);
  const hasClientSummary = Boolean(outputRow.client_summary);
  const [advisorOpened, setAdvisorOpened] = useState(false);
  const [clientOpened, setClientOpened] = useState(false);

  const requiredDocs = (hasAdvisorLetter ? 1 : 0) + (hasClientSummary ? 1 : 0);
  const openedDocs = (hasAdvisorLetter && advisorOpened ? 1 : 0) + (hasClientSummary && clientOpened ? 1 : 0);
  const allDocsOpened = requiredDocs === 0 || openedDocs >= requiredDocs;

  const generatedAt = outputRow.completed_at ?? outputRow.meta?.completed_at as string | null;

  async function handleAdopt() {
    if (!confirmed) return;
    setAdopting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");

      const adoptedAt = new Date().toISOString();
      const adoptionConfirmation = `${ADOPTION_STATEMENT} — ${user.email ?? user.id}`;

      const { error: outputError } = await supabase
        .from("policyplan_outputs")
        .update({
          status: "final",
          adopted_by: user.id,
          adopted_at: adoptedAt,
          adoption_confirmation: adoptionConfirmation,
        })
        .eq("id", outputRow.id)
        .eq("advisor_id", user.id);

      if (outputError) throw new Error(outputError.message);

      const { error: intakeError } = await supabase
        .from("policyplan_intakes")
        .update({ status: "adopted" })
        .eq("id", intakeId)
        .eq("advisor_id", user.id);

      if (intakeError) throw new Error(intakeError.message);

      onAdopted({
        ...outputRow,
        status: "final",
        adopted_by: user.id,
        adopted_at: adoptedAt,
        adoption_confirmation: adoptionConfirmation,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAdopting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stage header */}
      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Stage 4 — Adopt
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              Review the generated draft and adopt it as your recommendation.
            </p>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded border border-amber-300 text-amber-700 bg-amber-50">
            Draft — not yet adopted
          </span>
        </div>
        {generatedAt && (
          <p className="text-[11px] text-[var(--color-text-muted)] font-mono mt-2">
            Generated {formatDate(generatedAt as string)}
          </p>
        )}
      </div>

      {/* Document previews — full markdown rendering */}
      {outputRow.advisor_letter && (
        <DocumentRenderer
          title="Advisor Best-Interest Support Document"
          body={outputRow.advisor_letter}
          variant="advisor"
          status="draft"
          generatedAt={generatedAt as string | null}
          collapsible
          onExpand={() => setAdvisorOpened(true)}
        />
      )}
      {outputRow.client_summary && (
        <DocumentRenderer
          title="Client Summary"
          body={outputRow.client_summary}
          variant="client"
          status="draft"
          collapsible
          onExpand={() => setClientOpened(true)}
        />
      )}

      {/* Adoption confirmation block */}
      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] px-6 py-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
          Producer attestation
        </h3>

        {/* Attestation statement */}
        <div className="rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] px-5 py-4 mb-5">
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {ADOPTION_STATEMENT}
          </p>
        </div>

        {/* Soft gate — show helper text until both docs are opened */}
        {!allDocsOpened && (
          <p className="text-xs text-[var(--color-text-muted)] mb-4 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            Open both documents above to unlock attestation.
          </p>
        )}

        {/* Confirmation checkbox */}
        <label className={cn("flex items-start gap-3 mb-5", allDocsOpened ? "cursor-pointer" : "opacity-40 cursor-not-allowed select-none")}>
          <input
            type="checkbox"
            checked={confirmed}
            disabled={!allDocsOpened}
            onChange={(e) => allDocsOpened && setConfirmed(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-[var(--color-border-strong)] accent-[var(--color-accent)] cursor-pointer shrink-0 disabled:cursor-not-allowed"
          />
          <span className="text-sm text-[var(--color-text-primary)] leading-relaxed">
            I confirm the above statement and adopt this document as my
            recommendation.
          </span>
        </label>

        {error && (
          <p className="text-sm text-[var(--color-error)] mb-4">{error}</p>
        )}

        {/* Primary action */}
        <button
          type="button"
          disabled={!confirmed || adopting}
          onClick={handleAdopt}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {adopting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Adopting…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Adopt recommendation
            </>
          )}
        </button>
      </div>
    </div>
  );
}
