"use client";
import React, { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SuitabilityFlag } from "@/lib/policyplan/rules";
import type { FlagResolution } from "@/components/policyplan/CaseWorkspace";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  intakeId: string;
  flags: SuitabilityFlag[];
  existingResolutions: FlagResolution[] | null;
  onResolved: (resolutions: FlagResolution[]) => void;
}

// ── Zero-flag acknowledgment ──────────────────────────────────────────────────

function ZeroFlagAck({
  intakeId,
  onResolved,
}: {
  intakeId: string;
  onResolved: (resolutions: FlagResolution[]) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");

      const resolutions: FlagResolution[] = [
        {
          code: "_no_flags_acknowledged",
          resolution_text: "No automated flags were raised. Advisor confirmed review.",
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        },
      ];

      const { error: updateError } = await supabase
        .from("policyplan_intakes")
        .update({
          flag_resolutions: resolutions,
          status: "resolved",
        })
        .eq("id", intakeId)
        .eq("advisor_id", user.id);

      if (updateError) throw new Error(updateError.message);
      onResolved(resolutions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Stage 2 — Review &amp; respond
        </h2>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-readonly-bg)] px-5 py-4 mb-5">
        <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
          No automated flags were raised
        </p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Confirm that you have reviewed this case before generating the
          best-interest document.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer mb-5">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-5 w-5 rounded border-[var(--color-border-strong)] accent-[var(--color-accent)] cursor-pointer shrink-0"
        />
        <span className="text-sm text-[var(--color-text-primary)] leading-relaxed">
          I have reviewed this case and confirm that no additional flags require
          a written response.
        </span>
      </label>

      {error && (
        <p className="text-sm text-[var(--color-error)] mb-4">{error}</p>
      )}

      <button
        type="button"
        disabled={!confirmed || saving}
        onClick={handleConfirm}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Generate draft"
        )}
      </button>
    </div>
  );
}

// ── Main PPResolve ────────────────────────────────────────────────────────────

export function PPResolve({ intakeId, flags, existingResolutions, onResolved }: Props) {
  const [responses, setResponses] = useState<Record<string, string>>(() => {
    if (!existingResolutions) return {};
    return Object.fromEntries(
      existingResolutions.map((r) => [r.code, r.resolution_text])
    );
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Zero-flag path
  if (flags.length === 0) {
    return <ZeroFlagAck intakeId={intakeId} onResolved={onResolved} />;
  }

  const respondedCount = useMemo(
    () => flags.filter((f) => (responses[f.code] ?? "").trim().length >= 3).length,
    [flags, responses]
  );
  const allAnswered = respondedCount === flags.length;

  async function handleGenerateDraft() {
    if (!allAnswered) return;
    setSaving(true);
    setSaveError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");

      const now = new Date().toISOString();
      const resolutions: FlagResolution[] = flags.map((f) => ({
        code: f.code,
        resolution_text: (responses[f.code] ?? "").trim(),
        resolved_by: user.id,
        resolved_at: now,
      }));

      const { error } = await supabase
        .from("policyplan_intakes")
        .update({
          flag_resolutions: resolutions,
          status: "resolved",
        })
        .eq("id", intakeId)
        .eq("advisor_id", user.id);

      if (error) throw new Error(error.message);
      onResolved(resolutions);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Stage 2 — Review &amp; respond
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Review each suitability flag and provide a written response before generating the document.
          </p>
        </div>

        {/* Sticky progress indicator */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="text-sm font-semibold text-[var(--color-text-primary)] tabular-nums">
            {respondedCount} / {flags.length}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">responded</span>
          {/* Progress bar */}
          <div className="w-24 h-1.5 bg-[var(--color-readonly-bg)] rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-300"
              style={{ width: `${(respondedCount / flags.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Resolution blocks */}
      {flags.map((flag) => {
        const value = responses[flag.code] ?? "";
        const answered = value.trim().length >= 3;

        return (
          <div
            key={flag.code}
            className={cn(
              "bg-[var(--color-surface)] rounded-lg border p-6 transition-colors",
              answered
                ? "border-[var(--color-accent)]"
                : "border-[var(--color-border)]"
            )}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-[var(--color-text-muted)] bg-[var(--color-readonly-bg)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                  {flag.code}
                </span>
                {/* Severity shown as a neutral label — no color, no emphasis */}
                <span className="text-xs text-[var(--color-text-muted)] border border-[var(--color-border)] px-2 py-0.5 rounded">
                  {flag.severity}
                </span>
              </div>
              {answered && (
                <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
              )}
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] mb-2">
              {flag.description}
            </p>

            {flag.requirement && (
              <p className="text-xs text-[var(--color-text-muted)] font-mono mb-4">
                §{flag.requirement}
              </p>
            )}

            <div>
              <label
                htmlFor={`resolve-${flag.code}`}
                className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2"
              >
                How did you address this?
              </label>
              <textarea
                id={`resolve-${flag.code}`}
                rows={3}
                value={value}
                onChange={(e) =>
                  setResponses((prev) => ({
                    ...prev,
                    [flag.code]: e.target.value,
                  }))
                }
                placeholder="Provide your written response…"
                className="w-full px-3.5 py-2.5 text-sm rounded-md border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-[var(--color-accent)] transition resize-none leading-relaxed"
              />
            </div>
          </div>
        );
      })}

      {/* Primary action */}
      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] px-6 py-4">
        {saveError && (
          <p className="text-sm text-[var(--color-error)] mb-3">{saveError}</p>
        )}
        <button
          type="button"
          disabled={!allAnswered || saving}
          onClick={handleGenerateDraft}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Recording responses…
            </>
          ) : (
            "Generate draft"
          )}
        </button>
        {!allAnswered && (
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            {flags.length - respondedCount} {flags.length - respondedCount === 1 ? "flag" : "flags"} still need a response.
          </p>
        )}
      </div>
    </div>
  );
}
