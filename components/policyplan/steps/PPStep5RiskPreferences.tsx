"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { riskPreferencesSchema, type RiskPreferences } from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PPStepFooter } from "@/components/policyplan/PPStepWrapper";
import { cn } from "@/lib/utils";

type QuestionDef<T extends string> = {
  name: keyof RiskPreferences;
  question: string;
  hint?: string;
  options: { value: T; label: string }[];
};

const QUESTIONS: QuestionDef<string>[] = [
  {
    name: "financial_experience",
    question: "How would you describe the client's overall experience with financial and insurance products?",
    options: [
      { value: "limited", label: "Limited" },
      { value: "moderate", label: "Moderate" },
      { value: "extensive", label: "Extensive" },
    ],
  },
  {
    name: "complexity_tolerance",
    question: "How comfortable is the client with products that have multiple moving parts, crediting strategies, or non-transparent fee structures?",
    options: [
      { value: "prefer_simple", label: "Prefer straightforward products" },
      { value: "comfortable_with_complexity", label: "Comfortable with complexity" },
    ],
  },
  {
    name: "guarantee_vs_upside",
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
    question: "How comfortable is the client if their policy values (cash value, death benefit) fluctuate year to year?",
    options: [
      { value: "prefer_stability", label: "Prefer stability" },
      { value: "balanced", label: "Balanced" },
      { value: "accept_variability", label: "Accept variability" },
    ],
  },
  {
    name: "nonguaranteed_elements",
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
    question: "If the policy requires a higher premium than initially illustrated to remain in force, is the client willing and able to fund it?",
    options: [
      { value: "able_and_willing", label: "Able and willing" },
      { value: "willing_if_necessary", label: "Willing if necessary" },
      { value: "unable_or_unwilling", label: "Unable or unwilling" },
    ],
  },
  {
    name: "cash_value_access_need",
    question: "Does the client expect to access cash value, and if so, on what time horizon?",
    options: [
      { value: "none_expected", label: "None expected" },
      { value: "long_term", label: "Long term (10+ years)" },
      { value: "medium_term", label: "Medium term (5–10 years)" },
      { value: "near_term", label: "Near term (under 5 years)" },
    ],
  },
];

// Three thematic groups
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

function QuestionBlock({
  questionNumber,
  question,
  hint,
  options,
  value,
  onChange,
  error,
}: {
  questionNumber: number;
  question: string;
  hint?: string;
  options: { value: string; label: string }[];
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="py-5 first:pt-0 last:pb-0 space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
          Question {questionNumber}
        </p>
        <p className="text-sm font-medium text-[var(--color-text-primary)] leading-relaxed">
          {question}
        </p>
        {hint && (
          <p className="text-xs text-[var(--color-text-muted)] mt-1 font-mono">{hint}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={cn(
              "px-4 py-3 rounded-lg border text-sm font-medium transition-colors min-h-[48px] min-w-[120px] text-left leading-snug",
              value === opt.value
                ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                : "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-[var(--color-error)]">{error}</p>
      )}
    </div>
  );
}

export function PPStep5RiskPreferences() {
  const { formData, patch, markComplete, goNext } = usePPWizard();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<RiskPreferences>({
    resolver: zodResolver(riskPreferencesSchema),
    defaultValues: formData.risk_preferences as RiskPreferences | undefined,
  });

  useEffect(() => {
    if (formData.risk_preferences) reset(formData.risk_preferences as RiskPreferences);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.risk_preferences]);

  const onValid = (data: RiskPreferences) => {
    patch({ risk_preferences: data });
    markComplete(5);
    goNext();
  };

  // Build question lookup
  const questionByName = Object.fromEntries(QUESTIONS.map((q) => [q.name, q]));
  let globalIndex = 0;

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">
        These questions help frame the client&apos;s comfort with guarantees, variability,
        complexity, and funding obligations.
      </p>

      <div className="space-y-5">
        {GROUPS.map((group) => (
          <div
            key={group.label}
            className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden"
          >
            {/* Group header */}
            <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-readonly-bg)]">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                {group.label}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{group.description}</p>
            </div>

            {/* Questions in this group */}
            <div className="px-6 divide-y divide-[var(--color-border)]">
              {group.questionNames.map((name) => {
                const q = questionByName[name as string];
                if (!q) return null;
                globalIndex += 1;
                const currentIndex = globalIndex;
                const err = (errors[q.name] as { message?: string } | undefined)?.message;

                return (
                  <Controller
                    key={q.name}
                    control={control}
                    name={q.name}
                    render={({ field }) => (
                      <QuestionBlock
                        questionNumber={currentIndex}
                        question={q.question}
                        hint={q.hint}
                        options={q.options}
                        value={field.value as string | undefined}
                        onChange={field.onChange}
                        error={err}
                      />
                    )}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <PPStepFooter onContinue={handleSubmit(onValid)} />
    </form>
  );
}
