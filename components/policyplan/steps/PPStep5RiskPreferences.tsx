"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useRef, useCallback } from "react";
import { riskPreferencesSchema, type RiskPreferences } from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PPStepFooter } from "@/components/policyplan/PPStepWrapper";
import { cn } from "@/lib/utils";
import { CheckCircle2, Pencil } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type QuestionDef = {
  name: keyof RiskPreferences;
  question: string;
  shortLabel: string;
  hint?: string;
  options: { value: string; label: string }[];
};

type GroupStatus = "not_started" | "in_progress" | "complete";

// ── Questions (unchanged) ─────────────────────────────────────────────────────

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

// ── Groups (unchanged structure) ──────────────────────────────────────────────

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

// Flat ordered list of question names — drives the global Q index
const QUESTION_ORDER = QUESTIONS.map((q) => q.name);
const questionByName = Object.fromEntries(QUESTIONS.map((q) => [q.name, q]));

// ── Helpers ───────────────────────────────────────────────────────────────────

function optionLabel(q: QuestionDef, value: string | undefined): string {
  if (!value) return "—";
  return q.options.find((o) => o.value === value)?.label ?? value;
}

function groupForQuestion(name: keyof RiskPreferences): number {
  return GROUPS.findIndex((g) => g.questionNames.includes(name));
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Slim 3-section progress rail — passive orientation only */
function GroupProgressRail({
  statuses,
  activeGroupIdx,
}: {
  statuses: GroupStatus[];
  activeGroupIdx: number;
}) {
  return (
    <div className="flex gap-3 mb-7">
      {GROUPS.map((group, i) => {
        const status = statuses[i];
        return (
          <div key={group.label} className="flex-1 min-w-0">
            <div
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                status === "complete"
                  ? "bg-[var(--color-success)]"
                  : status === "in_progress"
                  ? "bg-[var(--color-accent)]"
                  : "bg-[var(--color-border-strong)]"
              )}
            />
            <div className="flex items-center gap-1 mt-1.5">
              {status === "complete" && (
                <CheckCircle2 size={10} className="text-[var(--color-success)] shrink-0" />
              )}
              <p
                className={cn(
                  "text-[10px] font-medium truncate leading-tight",
                  status === "complete"
                    ? "text-[var(--color-success)]"
                    : status === "in_progress"
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-muted)]"
                )}
              >
                {group.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** One answer chip */
function AnswerChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "px-5 py-3 rounded-xl border text-sm font-medium transition-all min-h-[52px]",
        "text-left leading-snug",
        selected
          ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-sm scale-[1.01]"
          : "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-secondary)]",
        !selected && "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      )}
    >
      {label}
    </button>
  );
}

/** The one active question card */
function ActiveQuestionCard({
  globalIndex,
  groupLabel,
  question,
  hint,
  options,
  value,
  onChange,
  error,
}: {
  globalIndex: number;
  groupLabel: string;
  question: string;
  hint?: string;
  options: { value: string; label: string }[];
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-accent-ring)] bg-[var(--color-surface)] shadow-sm px-6 py-6 space-y-5">
      {/* Eyebrow row */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
          {groupLabel}
        </span>
        <span className="text-[11px] font-semibold text-[var(--color-accent)] tabular-nums shrink-0">
          Question {globalIndex + 1} of {QUESTIONS.length}
        </span>
      </div>

      {/* Question text */}
      <p className="text-[15px] font-semibold text-[var(--color-text-primary)] leading-snug">
        {question}
      </p>

      {/* Hint */}
      {hint && (
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed -mt-2 font-mono">
          {hint}
        </p>
      )}

      {/* Answer chips — wrap naturally; 2-col on mobile */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5">
        {options.map((opt) => (
          <AnswerChip
            key={opt.value}
            label={opt.label}
            selected={value === opt.value}
            onClick={() => onChange(opt.value)}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Compact answered-question review row */
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
        <CheckCircle2 size={14} className="text-[var(--color-success)] shrink-0" />
        <span className="text-xs font-medium text-[var(--color-text-muted)] shrink-0 w-36 truncate">
          {shortLabel}
        </span>
        <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
          {answer}
        </span>
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

// ── Main component ────────────────────────────────────────────────────────────

const ADVANCE_DELAY_MS = 320;

export function PPStep5RiskPreferences() {
  const { formData, patch, markComplete, goNext } = usePPWizard();

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RiskPreferences>({
    resolver: zodResolver(riskPreferencesSchema),
    defaultValues: formData.risk_preferences as RiskPreferences | undefined,
  });

  useEffect(() => {
    if (formData.risk_preferences) reset(formData.risk_preferences as RiskPreferences);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.risk_preferences]);

  // ── UI state ──────────────────────────────────────────────────────────────

  // Global index of the currently active question (0–6); null = all done
  const [activeQIdx, setActiveQIdx] = useState<number | null>(() => {
    if (!formData.risk_preferences) return 0;
    const rp = formData.risk_preferences as RiskPreferences;
    const first = QUESTION_ORDER.findIndex((n) => !rp[n]);
    return first === -1 ? null : first;
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived values ────────────────────────────────────────────────────────

  const allValues = watch();

  // Global question statuses
  const answeredNames = new Set(
    QUESTION_ORDER.filter((n) => !!allValues[n])
  );
  const allComplete = answeredNames.size === QUESTIONS.length;

  // Active question definition
  const activeQ =
    activeQIdx !== null ? (questionByName[QUESTION_ORDER[activeQIdx]] ?? null) : null;
  const activeGroupIdx =
    activeQ ? groupForQuestion(activeQ.name) : -1;

  // Group statuses for the rail
  const groupStatuses: GroupStatus[] = GROUPS.map((group, gi) => {
    const allAnswered = group.questionNames.every((n) => !!allValues[n]);
    if (allAnswered) return "complete";
    if (gi === activeGroupIdx) return "in_progress";
    return "not_started";
  });

  // Questions answered so far (before the active one) — shown in review strip
  const answeredSoFar = QUESTIONS.filter(
    (q) =>
      !!allValues[q.name] &&
      (activeQIdx === null || QUESTION_ORDER.indexOf(q.name) < activeQIdx)
  );

  // ── Auto-advance ──────────────────────────────────────────────────────────

  const handleAnswered = useCallback(
    (name: keyof RiskPreferences) => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);

      advanceTimerRef.current = setTimeout(() => {
        const currentIdx = QUESTION_ORDER.indexOf(name);
        // Find next unanswered question globally
        const snapshot = watch();
        const nextIdx = QUESTION_ORDER.findIndex(
          (n, i) => i > currentIdx && !snapshot[n]
        );
        setActiveQIdx(nextIdx === -1 ? null : nextIdx);
      }, ADVANCE_DELAY_MS);
    },
    [watch]
  );

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  // ── Edit a prior answer ───────────────────────────────────────────────────

  const handleEdit = useCallback((name: keyof RiskPreferences) => {
    const idx = QUESTION_ORDER.indexOf(name);
    if (idx !== -1) setActiveQIdx(idx);
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
    // Return to first unanswered question
    const snapshot = watch();
    const firstUnanswered = QUESTION_ORDER.findIndex((n) => !snapshot[n]);
    if (firstUnanswered !== -1) setActiveQIdx(firstUnanswered);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
      {/* Intro */}
      <p className="text-sm text-[var(--color-text-secondary)] mb-5 leading-relaxed">
        These questions help frame the client&apos;s comfort with guarantees,
        variability, complexity, and funding obligations.
      </p>

      {/* Slim section progress rail */}
      <GroupProgressRail statuses={groupStatuses} activeGroupIdx={activeGroupIdx} />

      {/* Submit error banner */}
      {submitError && (
        <div
          className="mb-5 rounded border border-[var(--color-error)] bg-[var(--color-error-light)] px-4 py-3 text-sm text-[var(--color-error)]"
          role="alert"
        >
          {submitError}
        </div>
      )}

      {/* ── All complete: single summary list (no active question) ── */}
      {allComplete && activeQIdx === null ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] divide-y divide-[var(--color-border)] overflow-hidden">
          {QUESTIONS.map((q) => (
            <AnsweredRow
              key={q.name as string}
              shortLabel={q.shortLabel}
              answer={optionLabel(q, allValues[q.name] as string | undefined)}
              onEdit={() => handleEdit(q.name)}
            />
          ))}
        </div>
      ) : (
        <>
          {/* ── Answered-so-far review strip (only shown while a question is active) ── */}
          {answeredSoFar.length > 0 && (
            <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] divide-y divide-[var(--color-border)] overflow-hidden">
              {answeredSoFar.map((q) => (
                <AnsweredRow
                  key={q.name as string}
                  shortLabel={q.shortLabel}
                  answer={optionLabel(q, allValues[q.name] as string | undefined)}
                  onEdit={() => handleEdit(q.name)}
                />
              ))}
            </div>
          )}

          {/* ── Active question card ── */}
          {activeQ && (
            <Controller
              control={control}
              name={activeQ.name}
              render={({ field }) => (
                <ActiveQuestionCard
                  globalIndex={activeQIdx!}
                  groupLabel={GROUPS[activeGroupIdx]?.label ?? ""}
                  question={activeQ.question}
                  hint={activeQ.hint}
                  options={activeQ.options}
                  value={field.value as string | undefined}
                  onChange={(v) => {
                    field.onChange(v);
                    handleAnswered(activeQ.name);
                  }}
                  error={
                    (errors[activeQ.name] as { message?: string } | undefined)
                      ?.message
                  }
                />
              )}
            />
          )}

          {/* ── Answered-after strip: questions already answered beyond the active slot ── */}
          {(() => {
            const answeredAfter = QUESTIONS.filter(
              (q) =>
                !!allValues[q.name] &&
                activeQIdx !== null &&
                QUESTION_ORDER.indexOf(q.name) > activeQIdx
            );
            if (answeredAfter.length === 0) return null;
            return (
              <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] divide-y divide-[var(--color-border)] overflow-hidden">
                {answeredAfter.map((q) => (
                  <AnsweredRow
                    key={q.name as string}
                    shortLabel={q.shortLabel}
                    answer={optionLabel(q, allValues[q.name] as string | undefined)}
                    onEdit={() => handleEdit(q.name)}
                  />
                ))}
              </div>
            );
          })()}
        </>
      )}

      <PPStepFooter continueDisabled={!allComplete} />
    </form>
  );
}
