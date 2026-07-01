"use client";
import { useState, useEffect } from "react";
import {
  designPrioritiesSchema,
  DESIGN_ELEMENT_LABELS,
  type DesignElement,
  type DesignPriorities,
} from "@/lib/lidq-schema";
import { useWizard } from "@/lib/wizard-context";
import { StepFooter, SectionCard } from "@/components/StepWrapper";
import { cn } from "@/lib/utils";

const ELEMENTS: DesignElement[] = [
  "safety",
  "flexibility",
  "equity",
  "certainty",
  "premium_level",
];

const ELEMENT_DEFINITIONS: Record<DesignElement, string> = {
  safety: "The financial strength and claims-paying ability of the carrier.",
  flexibility: "The ability to adjust premiums, benefits, and access cash value.",
  equity: "Policy's participation in investment returns or dividend crediting.",
  certainty: "Guaranteed or highly predictable policy outcomes and values.",
  premium_level: "The size and consistency of required premium payments.",
};

export function Step6DesignPriorities() {
  const { formData, patch, goNext, markComplete } = useWizard();

  // ranks: element -> 1-5 rank (undefined if not yet ranked)
  const [ranks, setRanks] = useState<Partial<Record<DesignElement, number>>>(() => {
    const dp = formData.design_priorities;
    if (!dp) return {};
    return {
      safety: dp.safety,
      flexibility: dp.flexibility,
      equity: dp.equity,
      certainty: dp.certainty,
      premium_level: dp.premium_level,
    };
  });

  const [error, setError] = useState<string | null>(null);

  // Sync when sample case loads
  useEffect(() => {
    const dp = formData.design_priorities;
    if (dp) {
      setRanks({
        safety: dp.safety,
        flexibility: dp.flexibility,
        equity: dp.equity,
        certainty: dp.certainty,
        premium_level: dp.premium_level,
      });
    }
  }, [formData.design_priorities]);

  const rankedCount = Object.values(ranks).filter((v) => v !== undefined).length;
  const nextRank = rankedCount + 1;

  const handleTap = (el: DesignElement) => {
    const currentRank = ranks[el];

    if (currentRank !== undefined) {
      // Remove this element's rank and shift everything above it down
      setRanks((prev) => {
        const next: Partial<Record<DesignElement, number>> = {};
        for (const [k, v] of Object.entries(prev) as [DesignElement, number | undefined][]) {
          if (k === el) continue;
          if (v !== undefined && v > currentRank) {
            next[k] = v - 1;
          } else {
            next[k] = v;
          }
        }
        return next;
      });
    } else {
      // Assign next rank
      if (nextRank > 5) return;
      setRanks((prev) => ({ ...prev, [el]: nextRank }));
    }
    setError(null);
  };

  const onContinue = () => {
    if (rankedCount < 5) {
      setError("Please rank all five elements before continuing.");
      return;
    }

    const data = ranks as DesignPriorities;
    const result = designPrioritiesSchema.safeParse(data);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setError(null);
    patch({ design_priorities: result.data });
    markComplete(6);
    goNext();
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Tap each row to assign a rank from 1 (most important) to 5. Tap a ranked row again to remove it and re-rank.
      </p>

      {error && (
        <p className="text-sm text-[var(--color-error)]" role="alert">{error}</p>
      )}

      <SectionCard>
        <div className="space-y-2">
          {ELEMENTS.map((el) => {
            const rank = ranks[el];
            const isRanked = rank !== undefined;
            return (
              <button
                key={el}
                type="button"
                onClick={() => handleTap(el)}
                aria-label={`${DESIGN_ELEMENT_LABELS[el]}, rank ${isRanked ? rank : "not set"}`}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 rounded-lg border text-left transition-all min-h-[64px]",
                  isRanked
                    ? "bg-[var(--color-accent-light)] border-[var(--color-accent-ring)]"
                    : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-accent-ring)] hover:bg-[var(--color-accent-light)]"
                )}
              >
                {/* Rank badge */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all",
                    isRanked
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
                  )}
                  aria-hidden
                >
                  {isRanked ? rank : "–"}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-semibold text-sm",
                    isRanked ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"
                  )}>
                    {DESIGN_ELEMENT_LABELS[el]}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
                    {ELEMENT_DEFINITIONS[el]}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {rankedCount > 0 && rankedCount < 5 && (
        <p className="text-sm text-[var(--color-text-muted)]">
          {rankedCount} of 5 ranked — tap {5 - rankedCount} more
        </p>
      )}
      {rankedCount === 5 && (
        <p className="text-sm text-[var(--color-success)] font-medium">
          All five elements ranked.
        </p>
      )}

      <StepFooter onContinue={onContinue} />
    </div>
  );
}
