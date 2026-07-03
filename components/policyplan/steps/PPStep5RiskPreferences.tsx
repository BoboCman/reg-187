"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useRef, useCallback } from "react";
import { riskPreferencesSchema, type RiskPreferences } from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PPStepFooter } from "@/components/policyplan/PPStepWrapper";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronDown, ChevronUp, Pencil } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type QuestionDef = {
  name: keyof RiskPreferences;
  question: string;
  shortLabel: string; // used in collapsed summary rows
  hint?: string;
  options: { value: string; label: string }[];
};

// ── Questions (unchanged) ────────────────────────────────────────────────────

const QUESTIONS: QuestionDef[] = [
  {
    name: "financial_experience",
    shortLabel: "Experience",
    question: "How would you describe the client's overall experience with financial and insurance products?",
    options: [
      { value: "limited", label: "Limited" },
      { value: "moderate", label: "Moderate" },
      { value: "extensive", label: "Extensive" },
    ],
  },
  {
    name: "complexity_tolerance",
    shortLabel: "Complexity",
    question: "How comfortable is the client with products that have multiple moving parts, crediting strategies, or non-transparent fee structures?",
    options: [
      { value: "prefer_simple", label: "Prefer straightforward products" },
      { value: "comfortable_with_complexity", label: "Comfortable with complexity" },
    ],
  },
  {
    name: "guarantee_vs_upside",
    shortLabel: "Guarantees vs upside",
    question: "When choosing between guaranteed outcomes and higher non-guaranteed potential, where does the client lean?",
    options: [
      { value: "strongly_prefer_guarantees", label: "Strongly prefer guarantees" },
      { value: "lean_guarantees", label: "Lean toward guarantees" },
      { value: "lean_upside", label: "Lean toward upside" },
      { value: "strongly_prefer_upside", label: "Strongly prefer upside" },
    ],
  },
  {
    name: "value_variability_tolerance",
    shortLabel: "Value variability",
    question: "How comfortable is the client if their policy values (cash value, death benefit) fluctuate year to year?",
    options: [
      { value: "prefer_stability", label: "Prefer stability" },
      { value: "balanced", label: "Balanced" },
      { value: "accept_variability", label: "Accept variability" },
    ],
  },
  {
    name: "nonguaranteed_elements",
    shortLabel: "Non-guaranteed elements",
    question: "How willing is the client to accept policy elements that are not guaranteed — such as variable premiums, credited rates, or non-guaranteed fees?",
    hint: "Required disclosure factor under Reg 187 §224.3(g)",
    options: [
      { value: "accept", label: "Accept" },
      { value: "accept_with_limits", label: "Accept with limits" },
      { value: "prefer_to_avoid", label: "Prefer to avoid" },
    ],
  },
  {
    name: "premium_funding_commitment",
    shortLabel: "Funding commitment",
    question: "If the policy requires a higher premium than initially illustrated to remain in force, is the client willing and able to fund it?",
    options: [
      { value: "able_and_willing", label: "Able and willing" },
      { value: "willing_if_necessary", label: "Willing if necessary" },
      { value: "unable_or_unwilling", label: "Unable or unwilling" },
    ],
  },
  {
    name: "cash_value_access_need",
    shortLabel: "Cash value access",
    question: "Does the client expect to access cash value, and if so, on what time horizon?",
    options: [
      { value: "none_expected", label: "None expected" },
      { value: "long_term", label: "Long term (10+ years)" },
      { value: "medium_term", label: "Medium term (5–10 years)" },
      { value: "near_term", label: "Near term (under 5 years)" },
    ],
  },
];

// ── Groups (unchanged structure) ─────────────────────────────────────────────

const GROUPS: {
  label: string;
  description: string;
  questionNames: (keyof RiskPreferences)[];
}[] = [
  {
    label: "Experience and complexity",
    description: "Establishes the client's starting frame for this conversation.",
    questionNames: ["financial_experience", "complexity_tolerance"],
  },
  {
    label: "Guarantees and variability",
    description: "Frames how the client weighs certainty against potential.",
    questionNames: ["guarantee_vs_upside", "value_variability_tolerance", "nonguaranteed_elements"],
  },
  {
    label: "Funding and liquidity",
    description: "Assesses commitment level and access expectations.",
    questionNames: ["premium_funding_commitment", "cash_value_access_need"],
  },
];

const questionByName = Object.fromEntries(QUESTIONS.map((q) => [q.name, q]));

// ── Helper ────────────────────────────────────────────────────────────────────

function optionLabel(q: QuestionDef, value: string | undefined): string {
  if (!value) return "—";
  return q.options.find((o) => o.value === value)?.label ?? value;
}

// ── Sub-components ───────────────────────────────────────────────────────────

/** Compact row shown for an already-answered question */
function AnsweredRow({
  shortLabel,
  answer,
  onEdit,
}: {
  shortLabel: string;
  answer: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 px-1">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-medium text-[var(--color-text-muted)] shrink-0">{shortLabel}</span>
        <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{answer}</span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline shrink-0 min-h-[32px] px-1"
        aria-label={`Edit ${shortLabel}`}
      >
        <Pencil size={11} />
        Edit
      </button>
    </div>
  );
}

/** The active question block — full display with answer choices */
function ActiveQuestion({
  questionNumber,
  totalInGroup,
  question,
  shortLabel,
  hint,
  options,
  value,
  onChange,
  error,
}: {
  questionNumber: number;
  totalInGroup: number;
  question: string;
  shortLabel: string;
  hint?: string;
  options: { value: string; label: string }[];
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-4 py-1">
      {/* Eyebrow */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)] mb-1.5">
          Question {questionNumber} of {totalInGroup}
        </p>
        <p className="text-[15px] font-semibold text-[var(--color-text-primary)] leading-snug">
          {question}
        </p>
        {hint && (
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 leading-relaxed font-mono">
            {hint}
          </p>
        )}
      </div>

      {/* Answer choices */}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={cn(
              "px-4 py-3 rounded-lg border text-sm font-medium transition-all min-h-[48px] text-left leading-snug",
              "sm:min-w-[140px]",
              value === opt.value
                ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-sm"
                : "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-[var(--color-error)]" role="alert">{error}</p>
      )}
    </div>
  );
}

// ── GroupCard ────────────────────────────────────────────────────────────────

type GroupStatus = "not_started" | "in_progress" | "complete";

function GroupCard({
  group,
  groupIndex,
  status,
  control,
  watch,
  errors,
  activeQuestionName,
  onAnswered,
  onEdit,
  isReviewExpanded,
  onToggleReview,
}: {
  group: typeof GROUPS[number];
  groupIndex: number;
  status: GroupStatus;
  control: ReturnType<typeof useForm<RiskPreferences>>["control"];
  watch: ReturnType<typeof useForm<RiskPreferences>>["watch"];
  errors: ReturnType<typeof useForm<RiskPreferences>>["formState"]["errors"];
  activeQuestionName: keyof RiskPreferences | null;
  onAnswered: (name: keyof RiskPreferences, value: string) => void;
  onEdit: (name: keyof RiskPreferences) => void;
  isReviewExpanded: boolean;
  onToggleReview: () => void;
}) {
  const isLocked = status === "not_started";
  const isComplete = status === "complete";
  const isActive = status === "in_progress";

  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        isLocked
          ? "border-[var(--color-border)] bg-[var(--color-surface)] opacity-50"
          : isComplete
          ? "border-[var(--color-border)] bg-[var(--color-surface)]"
          : "border-[var(--color-accent-ring)] bg-[var(--color-surface)] shadow-sm"
      )}
    >
      {/* Group header */}
      <div
        className={cn(
          "flex items-start justify-between gap-3 px-5 py-4",
          isComplete && "cursor-pointer",
          isComplete ? "border-b border-[var(--color-border)]" : isActive ? "border-b border-[var(--color-accent-ring)]" : ""
        )}
        onClick={isComplete ? onToggleReview : undefined}
        role={isComplete ? "button" : undefined}
        tabIndex={isComplete ? 0 : undefined}
        onKeyDown={isComplete ? (e) => e.key === "Enter" && onToggleReview() : undefined}
      >
        <div className="flex items-start gap-3 min-w-0">
          {/* Status dot / check */}
          <div className="mt-0.5 shrink-0">
            {isComplete ? (
              <CheckCircle2 size={18} className="text-[var(--color-success)]" />
            ) : isActive ? (
              <div className="w-4 h-4 rounded-full border-2 border-[var(--color-accent)] bg-[var(--color-accent-light)] mt-0.5" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-[var(--color-border-strong)] mt-0.5" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className={cn(
              "text-sm font-semibold",
              isLocked ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-primary)]"
            )}>
              {group.label}
            </h2>
            {!isComplete && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
                {group.description}
              </p>
            )}
            {isComplete && (
              <p className="text-xs text-[var(--color-success)] mt-0.5 font-medium">Complete</p>
            )}
          </div>
        </div>
        {isComplete && (
          <div className="shrink-0 text-[var(--color-text-muted)]">
            {isReviewExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        )}
      </div>

      {/* ── Locked state: nothing more to show ── */}
      {isLocked && null}

      {/* ── Complete state: collapsed summary, expandable ── */}
      {isComplete && isReviewExpanded && (
        <div className="px-5 py-3 divide-y divide-[var(--color-border)]">
          {group.questionNames.map((name) => {
            const q = questionByName[name as string];
            if (!q) return null;
            const val = watch(name) as string | undefined;
            return (
              <AnsweredRow
                key={name as string}
                shortLabel={q.shortLabel}
                answer={optionLabel(q, val)}
                onEdit={() => onEdit(name)}
              />
            );
          })}
        </div>
      )}

      {/* ── Active group: guided question flow ── */}
      {isActive && (
        <div className="px-5 py-4 space-y-0">
          {group.questionNames.map((name, qIdx) => {
            const q = questionByName[name as string];
            if (!q) return null;
            const val = watch(name) as string | undefined;
            const isAnswered = !!val && name !== activeQuestionName;
            const isActiveQ = name === activeQuestionName;
            const isFuture = !val && !isActiveQ;

            if (isAnswered) {
              return (
                <div key={name as string} className={cn(qIdx > 0 && "border-t border-[var(--color-border)]")}>
                  <AnsweredRow
                    shortLabel={q.shortLabel}
                    answer={optionLabel(q, val)}
                    onEdit={() => onEdit(name)}
                  />
                </div>
              );
            }

            if (isActiveQ) {
              // Count answered questions before this one for "Q X of N" display
              const answeredBefore = group.questionNames
                .slice(0, qIdx)
                .filter((n) => !!watch(n)).length;
              const questionNumber = answeredBefore + 1;

              const err = (errors[q.name] as { message?: string } | undefined)?.message;

              return (
                <div key={name as string} className={cn(qIdx > 0 && "border-t border-[var(--color-border)] pt-4")}>
                  <Controller
                    control={control}
                    name={q.name}
                    render={({ field }) => (
                      <ActiveQuestion
                        questionNumber={questionNumber}
                        totalInGroup={group.questionNames.length}
                        question={q.question}
                        shortLabel={q.shortLabel}
                        hint={q.hint}
                        options={q.options}
                        value={field.value as string | undefined}
                        onChange={(v) => {
                          field.onChange(v);
                          onAnswered(name, v);
                        }}
                        error={err}
                      />
                    )}
                  />
                </div>
              );
            }

            // Future question in this group — hidden until active
            return null;
          })}
        </div>
      )}
    </div>
  );
}

// ── Top progress rail ────────────────────────────────────────────────────────

function GroupProgressRail({ statuses }: { statuses: GroupStatus[] }) {
  return (
    <div className="flex gap-2 mb-6">
      {GROUPS.map((group, i) => {
        const status = statuses[i];
        return (
          <div key={group.label} className="flex-1 min-w-0">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all",
                status === "complete"
                  ? "bg-[var(--color-success)]"
                  : status === "in_progress"
                  ? "bg-[var(--color-accent)]"
                  : "bg-[var(--color-border-strong)]"
              )}
            />
            <p className={cn(
              "text-[10px] font-medium mt-1.5 truncate",
              status === "complete"
                ? "text-[var(--color-success)]"
                : status === "in_progress"
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)]"
            )}>
              {group.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const ADVANCE_DELAY_MS = 320;

export function PPStep5RiskPreferences() {
  const { formData, patch, markComplete, goNext } = usePPWizard();

  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<RiskPreferences>({
    resolver: zodResolver(riskPreferencesSchema),
    defaultValues: formData.risk_preferences as RiskPreferences | undefined,
  });

  useEffect(() => {
    if (formData.risk_preferences) reset(formData.risk_preferences as RiskPreferences);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.risk_preferences]);

  // ── UI state ─────────────────────────────────────────────────────────────

  // Which group is currently active (0-indexed); null = not started yet
  const [activeGroupIdx, setActiveGroupIdx] = useState<number>(() => {
    // Hydrate: find the first incomplete group
    if (!formData.risk_preferences) return 0;
    for (let gi = 0; gi < GROUPS.length; gi++) {
      const allAnswered = GROUPS[gi].questionNames.every(
        (n) => !!(formData.risk_preferences as RiskPreferences | undefined)?.[n]
      );
      if (!allAnswered) return gi;
    }
    return GROUPS.length; // all complete
  });

  // Active question within the current group
  const [activeQuestionName, setActiveQuestionName] = useState<keyof RiskPreferences | null>(() => {
    if (!formData.risk_preferences) return GROUPS[0]?.questionNames[0] ?? null;
    for (let gi = 0; gi < GROUPS.length; gi++) {
      for (const name of GROUPS[gi].questionNames) {
        const val = (formData.risk_preferences as RiskPreferences | undefined)?.[name];
        if (!val) return name;
      }
    }
    return null;
  });

  // Expanded review state for completed groups
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  // Error state for incomplete submission
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Advance timer ref — cancel on unmount
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived group statuses ────────────────────────────────────────────────

  const allValues = watch();

  const groupStatuses: GroupStatus[] = GROUPS.map((group, gi) => {
    const allAnswered = group.questionNames.every((n) => !!allValues[n]);
    if (allAnswered) return "complete";
    if (gi === activeGroupIdx) return "in_progress";
    return "not_started";
  });

  const allComplete = groupStatuses.every((s) => s === "complete");

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAnswered = useCallback(
    (name: keyof RiskPreferences, _value: string) => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);

      advanceTimerRef.current = setTimeout(() => {
        // Find current group
        const gi = GROUPS.findIndex((g) => g.questionNames.includes(name));
        if (gi === -1) return;
        const group = GROUPS[gi];

        // Find next unanswered question in this group
        const currentIdx = group.questionNames.indexOf(name);
        const snapshot = watch();
        const nextInGroup = group.questionNames
          .slice(currentIdx + 1)
          .find((n) => !snapshot[n]);

        if (nextInGroup) {
          // Advance to next question within same group
          setActiveQuestionName(nextInGroup);
        } else {
          // Group is complete — advance to next group
          const nextGroupIdx = gi + 1;
          if (nextGroupIdx < GROUPS.length) {
            setActiveGroupIdx(nextGroupIdx);
            const nextGroup = GROUPS[nextGroupIdx];
            const firstUnanswered = nextGroup.questionNames.find((n) => !snapshot[n]);
            setActiveQuestionName(firstUnanswered ?? nextGroup.questionNames[0]);
          } else {
            // All groups complete
            setActiveGroupIdx(GROUPS.length);
            setActiveQuestionName(null);
          }
        }
      }, ADVANCE_DELAY_MS);
    },
    [watch]
  );

  const handleEdit = useCallback((name: keyof RiskPreferences) => {
    // Find which group owns this question
    const gi = GROUPS.findIndex((g) => g.questionNames.includes(name));
    if (gi === -1) return;
    setActiveGroupIdx(gi);
    setActiveQuestionName(name);
    // If this group was complete and collapsed, expand it in the UI
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.delete(gi);
      return next;
    });
  }, []);

  const handleToggleReview = useCallback((gi: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(gi)) next.delete(gi);
      else next.add(gi);
      return next;
    });
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────

  const onValid = (data: RiskPreferences) => {
    setSubmitError(null);
    patch({ risk_preferences: data });
    markComplete(5);
    goNext();
  };

  const onInvalid = () => {
    setSubmitError("Please answer all questions before continuing.");
    // Focus first incomplete group
    const firstIncompleteGroup = GROUPS.findIndex((g) =>
      g.questionNames.some((n) => !(watch()[n]))
    );
    if (firstIncompleteGroup !== -1) {
      setActiveGroupIdx(firstIncompleteGroup);
      const group = GROUPS[firstIncompleteGroup];
      const firstUnanswered = group.questionNames.find((n) => !watch()[n]);
      if (firstUnanswered) setActiveQuestionName(firstUnanswered);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
      {/* Intro */}
      <p className="text-sm text-[var(--color-text-secondary)] mb-5 leading-relaxed">
        These questions help frame the client&apos;s comfort with guarantees, variability,
        complexity, and funding obligations.
      </p>

      {/* Group progress rail */}
      <GroupProgressRail statuses={groupStatuses} />

      {/* Submit error banner */}
      {submitError && (
        <div className="mb-4 rounded border border-[var(--color-error)] bg-[var(--color-error-light)] px-4 py-3 text-sm text-[var(--color-error)]" role="alert">
          {submitError}
        </div>
      )}

      {/* Group cards */}
      <div className="space-y-4">
        {GROUPS.map((group, gi) => (
          <GroupCard
            key={group.label}
            group={group}
            groupIndex={gi}
            status={groupStatuses[gi]}
            control={control}
            watch={watch}
            errors={errors}
            activeQuestionName={gi === activeGroupIdx ? activeQuestionName : null}
            onAnswered={handleAnswered}
            onEdit={handleEdit}
            isReviewExpanded={expandedGroups.has(gi)}
            onToggleReview={() => handleToggleReview(gi)}
          />
        ))}
      </div>

      <PPStepFooter continueDisabled={!allComplete} />
    </form>
  );
}
