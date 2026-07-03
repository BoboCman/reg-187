"use client";
import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import {
  OBJECTIVE_LABELS,
  OBJECTIVE_GROUPS,
  objectivesSchema,
  type Objectives,
  type Objective,
} from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { cn } from "@/lib/utils";
import { PPStepFooter, PPSectionCard } from "@/components/policyplan/PPStepWrapper";

export function PPStep2Objectives() {
  const { formData, patch, markComplete, goNext, goBack } = usePPWizard();

  const [selected, setSelected] = useState<Set<Objective>>(
    () => new Set(formData.objectives?.selected ?? [])
  );
  const [primary, setPrimary] = useState<Objective | null>(
    formData.objectives?.primary ?? null
  );
  const [error, setError] = useState<string | null>(null);

  // Re-sync when sample case is loaded
  useEffect(() => {
    if (formData.objectives) {
      setSelected(new Set(formData.objectives.selected ?? []));
      setPrimary(formData.objectives.primary ?? null);
    }
  }, [formData.objectives]);

  const toggle = (obj: Objective) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(obj)) {
        // Deselecting — reassign primary if needed
        next.delete(obj);
        if (primary === obj) {
          // Pick the first remaining selected objective as the new primary
          const remaining = Array.from(next);
          setPrimary(remaining.length > 0 ? remaining[0] : null);
        }
      } else {
        // Selecting — auto-assign as primary if none exists yet
        next.add(obj);
        if (primary === null) {
          setPrimary(obj);
        }
      }
      return next;
    });
    setError(null);
  };

  const handleContinue = () => {
    const data = { selected: Array.from(selected), primary: primary! };
    const result = objectivesSchema.safeParse(data);
    if (!result.success) {
      const hasSelections = selected.size > 0;
      setError(
        hasSelections
          ? "Choose the primary objective."
          : "Select at least one objective."
      );
      return;
    }
    patch({ objectives: result.data as Objectives });
    markComplete(2);
    goNext();
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded border border-[var(--color-error)] bg-[var(--color-error-light)] px-4 py-3 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      {/* Top helper — teaches the interaction before the user starts selecting */}
      <p className="mb-5 text-sm text-[var(--color-text-muted)]">
        Select all that apply. The first objective becomes primary by default — tap the star to change it.
      </p>

      <div className="space-y-6">
        {Object.entries(OBJECTIVE_GROUPS).map(([groupName, objectives]) => (
          <PPSectionCard key={groupName} title={groupName}>
            <div className="flex flex-wrap gap-3">
              {objectives.map((obj) => {
                const isSelected = selected.has(obj);
                const isPrimary = primary === obj;

                return (
                  <div key={obj} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggle(obj)}
                      className={cn(
                        "px-4 py-2 rounded-full border text-sm font-medium transition-all min-h-[44px]",
                        isSelected && isPrimary
                          ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white ring-2 ring-[var(--color-accent)] ring-offset-1"
                          : isSelected
                          ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                          : "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      )}
                    >
                      {OBJECTIVE_LABELS[obj]}
                      {/* Inline "Primary" pill attached to the chip label */}
                      {isPrimary && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/25 leading-none">
                          Primary
                        </span>
                      )}
                    </button>

                    {isSelected && (
                      <button
                        type="button"
                        onClick={() => {
                          // Star only reassigns — never unsets when selections remain
                          if (!isPrimary) setPrimary(obj);
                        }}
                        aria-label={isPrimary ? "Primary objective" : "Set as primary objective"}
                        className={cn(
                          "p-1.5 rounded-full border transition-all min-h-[44px] min-w-[44px] flex items-center justify-center",
                          isPrimary
                            ? "bg-amber-50 border-amber-400 text-amber-500"
                            : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-amber-400 hover:text-amber-500"
                        )}
                      >
                        <Star
                          size={15}
                          fill={isPrimary ? "currentColor" : "none"}
                        />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </PPSectionCard>
        ))}
      </div>

      {/* Summary bar — confirmation only, not instruction */}
      {selected.size > 0 && (
        <div className="mt-4 px-4 py-3 rounded bg-[var(--color-accent-light)] border border-[var(--color-accent-ring)] text-sm text-[var(--color-text-secondary)]">
          <span className="font-medium text-[var(--color-text-primary)]">
            {selected.size} selected.
          </span>{" "}
          {primary ? (
            <>
              Primary:{" "}
              <span className="font-medium text-[var(--color-text-primary)]">
                {OBJECTIVE_LABELS[primary]}
              </span>
            </>
          ) : (
            "Choose the primary objective."
          )}
        </div>
      )}

      <PPStepFooter onContinue={handleContinue} />
    </div>
  );
}
