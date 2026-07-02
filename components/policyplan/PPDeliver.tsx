"use client";
import React from "react";
import type { OutputRow } from "@/components/policyplan/CaseWorkspace";
import { CheckCircle2, FileText, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  intakeId: string;
  outputRow: OutputRow | null;
  intakeVersion: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FinalDocumentCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  function handleCopy() {
    navigator.clipboard.writeText(body).catch(() => undefined);
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
      <div className="px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-readonly-bg)] flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {title}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded border border-[var(--color-success)] text-[var(--color-success)] bg-[var(--color-success-light)]">
            Final
          </span>
          <button
            type="button"
            onClick={handleCopy}
            title="Copy to clipboard"
            className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </button>
        </div>
      </div>
      <div className="px-6 py-5 max-h-96 overflow-y-auto">
        {body.split(/\n{2,}/).map((paragraph, i) => (
          <p
            key={i}
            className={cn(
              "text-sm text-[var(--color-text-secondary)] leading-relaxed font-serif",
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

export function PPDeliver({ intakeId: _intakeId, outputRow, intakeVersion }: Props) {
  if (!outputRow || outputRow.status !== "final") {
    return (
      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
          Stage 6 — Deliver
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Adopt the generated draft to unlock delivery.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-success)] px-6 py-4">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-success-light)]">
            <CheckCircle2 className="w-5 h-5 text-[var(--color-success)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Stage 6 — Deliver
                </h2>
                <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-0.5">
                  Recommendation adopted and ready to deliver
                </p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded border border-[var(--color-success)] text-[var(--color-success)] bg-[var(--color-success-light)] shrink-0">
                Final · Version {intakeVersion}
              </span>
            </div>

            {outputRow.adopted_at && (
              <p className="text-[11px] text-[var(--color-text-muted)] font-mono mt-2">
                Adopted {formatDate(outputRow.adopted_at)}
              </p>
            )}

            {outputRow.adoption_confirmation && (
              <div className="mt-3 rounded-md bg-[var(--color-background)] border border-[var(--color-border)] px-4 py-3">
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  {outputRow.adoption_confirmation}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Final documents */}
      {outputRow.advisor_letter && (
        <FinalDocumentCard
          title="Advisor Best-Interest Support Document"
          body={outputRow.advisor_letter}
        />
      )}
      {outputRow.client_summary && (
        <FinalDocumentCard
          title="Client Summary"
          body={outputRow.client_summary}
        />
      )}

      {/* PDF placeholder */}
      <div className="flex items-center justify-between px-5 py-4 rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-readonly-bg)]">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-[var(--color-text-muted)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-muted)]">
              PDF export
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              One-click download of both documents — available in a future release.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
