"use client";
import { useState, useEffect } from "react";
import { objectivesSchema, OBJECTIVE_LABELS, type Objective } from "@/lib/lidq-schema";
import { useWizard } from "@/lib/wizard-context";
import { StepFooter, SectionCard } from "@/components/StepWrapper";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const PERSONAL_OBJECTIVES: Objective[] = [
  "survivor_income",
  "tax_deferred_savings",
  "retirement_supplement",
  "long_term_care_planning",
  "asset_diversification",
  "asset_value_hedge",
  "estate_liquidity",
  "estate_equalization",
];

const BUSINESS_OBJECTIVES: Objective[] = [
  "business_continuity_buy_sell",
  "business_continuity_key_person",
  "executive_benefit",
];

const CHARITABLE_OBJECTIVES: Objective[] = [
  "enhanced_charitable_gifts",
  "asset_replacement",
];

const GROUPS: { label: string; items: Objective[] }[] = [
  { label: "Personal", items: PERSONAL_OBJECTIVES },
  { label: "Business", items: BUSINESS_OBJECTIVES },
  { label: "Charitable", items: CHARITABLE_OBJECTIVES },
];

export function Step4Objectives() {
  const { formData, patch, goNext, markComplete } = useWizard();

  const [selected, setSelected] = useState<Set<Objective>>(
    () => new Set(formData.objectives?.selected ?? [])
  );
  const [primary, setPrimary] = useState<Objective | null>(
    () => formData.objectives?.primary ?? null
  );
  const [errors, setErrors] = useState<string[]>([]);

  // Sync when sample case loads
  useEffect(() => {
    if (formData.objectives) {
      setSelected(new Set(formData.objectives.selected ?? []));
      setPrimary(formData.objectives.primary ?? null);
    }
  }, [formData.objectives]);

  const toggleObjective = (obj: Objective) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(obj)) {
        next.delete(obj);
        // If removing the primary, clear it
        if (primary === obj) setPrimary(null);
      } else {
        next.add(obj);
      }
      return next;
    });
  };

  const setPrimaryObjective = (obj: Objective) => {
    if (!selected.has(obj)) return;
    setPrimary((prev) => (prev === obj ? null : obj));
  };

  const onContinue = () => {
    const data = {
      selected: Array.from(selected),
      primary: primary ?? ("" as Objective),
    };

    const result = objectivesSchema.safeParse(data);
    if (!result.success) {
      setErrors(result.error.issues.map((i) => i.message));
      return;
    }
    setErrors([]);
    patch({ objectives: result.data });
    markComplete(4);
    goNext();
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Select all objectives that apply, then mark the single primary goal with the star.
      </p>

      {errors.map((e) => (
        <p key={e} className="text-sm text-[var(--color-error)]" role="alert">{e}</p>
      ))}

      {GROUPS.map((group) => (
        <SectionCard key={group.label} title={group.label}>
          <div className="flex flex-wrap gap-3">
            {group.items.map((obj) => {
              const isSelected = selected.has(obj);
              const isPrimary = primary === obj;
              return (
                <div key={obj} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleObjective(obj)}
                    aria-pressed={isSelected}
                    className={cn(
                      "px-4 py-2.5 rounded-full border text-sm font-medium transition-all min-h-[44px]",
                      isSelected
                        ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                        : "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)]"
                    )}
                  >
                    {OBJECTIVE_LABELS[obj]}
                  </button>
                  {isSelected && (
                    <button
                      type="button"
                      onClick={() => setPrimaryObjective(obj)}
                      aria-pressed={isPrimary}
                      aria-label={`Mark "${OBJECTIVE_LABELS[obj]}" as primary`}
                      title="Set as primary objective"
                      className={cn(
                        "p-2 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center",
                        isPrimary
                          ? "text-amber-500 bg-amber-50"
                          : "text-[var(--color-text-muted)] hover:text-amber-400"
                      )}
                    >
                      <Star
                        size={16}
                        fill={isPrimary ? "currentColor" : "none"}
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      ))}

      {selected.size > 0 && (
        <div className="p-4 rounded-lg bg-[var(--color-accent-light)] border border-[var(--color-accent-ring)] text-sm">
          <span className="font-medium text-[var(--color-accent)]">
            {selected.size} selected
          </span>
          {primary ? (
            <span className="text-[var(--color-text-secondary)]">
              {" "}— primary: <strong>{OBJECTIVE_LABELS[primary]}</strong>
            </span>
          ) : (
            <span className="text-[var(--color-text-muted)]">
              {" "}— tap a star to set the primary objective
            </span>
          )}
        </div>
      )}

      <StepFooter onContinue={onContinue} />
    </div>
  );
}
