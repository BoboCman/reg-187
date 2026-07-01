"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { riskPreferencesSchema, type RiskPreferences } from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PPStepFooter, PPSectionCard } from "@/components/policyplan/PPStepWrapper";
import { FormField } from "@/components/ui/FormField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

type QuestionDef<T extends string> = {
  name: keyof RiskPreferences;
  question: string;
  hint?: string;
  options: { value: T; label: string }[];
};

// All copy is independently authored — plain language descriptions of the regulatory factors.
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
    name: "value_variability_tolerance",
    question: "How comfortable is the client if their policy values (cash value, death benefit) fluctuate year to year?",
    options: [
      { value: "prefer_stability", label: "Prefer stability" },
      { value: "balanced", label: "Balanced" },
      { value: "accept_variability", label: "Accept variability" },
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
  {
    name: "complexity_tolerance",
    question: "How comfortable is the client with products that have multiple moving parts, crediting strategies, or non-transparent fee structures?",
    options: [
      { value: "prefer_simple", label: "Prefer straightforward products" },
      { value: "comfortable_with_complexity", label: "Comfortable with complexity" },
    ],
  },
];

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

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <div className="space-y-5">
        {QUESTIONS.map((q, i) => {
          const err = (errors[q.name] as { message?: string } | undefined)?.message;
          return (
            <PPSectionCard key={q.name}>
              <FormField
                label={`${i + 1}. ${q.question}`}
                hint={q.hint}
                error={err}
                required
              >
                <Controller
                  control={control}
                  name={q.name}
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {q.options.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          aria-pressed={field.value === opt.value}
                          className={[
                            "px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors min-h-[44px]",
                            field.value === opt.value
                              ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                              : "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
                          ].join(" ")}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                />
              </FormField>
            </PPSectionCard>
          );
        })}
      </div>

      <PPStepFooter onContinue={handleSubmit(onValid)} />
    </form>
  );
}
