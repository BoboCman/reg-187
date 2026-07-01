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
        next.delete(obj);
        if (primary === obj) setPrimary(null);
      } else {
        next.add(obj);
      }
      return next;
    });
    setError(null);
  };

  const handleContinue = () => {
    const data = { selected: Array.from(selected), primary: primary! };
    const result = objectivesSchema.safeParse(data);
    if (!result.success) {
      const first = result.error.errors[0]?.message;
      setError(
        first ??
          (!primary
            ? "Tap the star on a selected objective to mark it as primary."
            : "Select at least one objective.")
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

      <div className="space-y-6">
        {Object.entries(OBJECTIVE_GROUPS).map(([groupName, objectives]) => (
          <PPSectionCard key={groupName} title={groupName}>
            <div className="flex flex-wrap gap-3">
              {objectives.map((obj) => {
                const isSelected = selected.has(obj);
                const isPrimary = primary === obj;

                return (
                  <div key={obj} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggle(obj)}
                      className={cn(
                        "px-4 py-2 rounded-full border text-sm font-medium transition-all min-h-[44px]",
                        isSelected
                          ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                          : "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      )}
                    >
                      {OBJECTIVE_LABELS[obj]}
                    </button>

                    {isSelected && (
                      <button
                        type="button"
                        onClick={() => setPrimary(isPrimary ? null : obj)}
                        aria-label={isPrimary ? "Remove as primary" : "Set as primary objective"}
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
            "Tap the star icon on a selected objective to set the primary."
          )}
        </div>
      )}

      <PPStepFooter onContinue={handleContinue} />
    </div>
  );
}
