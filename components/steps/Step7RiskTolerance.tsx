"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { riskToleranceSchema, type RiskTolerance } from "@/lib/lidq-schema";
import { useWizard } from "@/lib/wizard-context";
import { StepFooter, SectionCard } from "@/components/StepWrapper";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface OptionGroup<T extends string> {
  value: T;
  label: string;
}

function RadioRow<T extends string>({
  question,
  number,
  options,
  value,
  onChange,
  error,
}: {
  question: string;
  number: number;
  options: OptionGroup<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  error?: string;
}) {
  return (
    <div className="py-4 border-b border-[var(--color-border)] last:border-0">
      <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
        <span className="text-[var(--color-text-muted)] mr-1.5">Q{number}.</span>
        {question}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={cn(
              "px-4 py-2.5 rounded border text-sm font-medium transition-all min-h-[44px]",
              value === opt.value
                ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                : "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)]"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs text-[var(--color-error)]">{error}</p>}
    </div>
  );
}

const HIGH_TO_LOW = [
  { value: "very_high" as const, label: "Very high" },
  { value: "high" as const, label: "High" },
  { value: "medium" as const, label: "Medium" },
  { value: "low" as const, label: "Low" },
];

const AGREE_OPTS = [
  { value: "strongly_agree" as const, label: "Strongly agree" },
  { value: "agree" as const, label: "Agree" },
  { value: "disagree" as const, label: "Disagree" },
  { value: "strongly_disagree" as const, label: "Strongly disagree" },
];

const Q2_OPTS = [
  { value: "tangible_assets" as const, label: "Tangible assets (real estate, commodities)" },
  { value: "equities" as const, label: "Equities (stocks, mutual funds)" },
  { value: "fixed_income" as const, label: "Fixed income (bonds, annuities)" },
  { value: "bank_cds_money_market" as const, label: "Bank CDs / money market" },
];

const Q4_OPTS = [
  { value: "never" as const, label: "Never" },
  { value: "more_than_16_years" as const, label: "16+ years" },
  { value: "10_to_16_years" as const, label: "10–16 years" },
  { value: "6_to_9_years" as const, label: "6–9 years" },
  { value: "less_than_6_years" as const, label: "Under 6 years" },
];

export function Step7RiskTolerance() {
  const { formData, patch, goNext, markComplete } = useWizard();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RiskTolerance>({
    resolver: zodResolver(riskToleranceSchema),
    defaultValues: formData.risk_tolerance ?? {},
  });

  useEffect(() => {
    if (formData.risk_tolerance) {
      reset(formData.risk_tolerance as RiskTolerance);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.risk_tolerance]);

  const onContinue = handleSubmit((data) => {
    patch({ risk_tolerance: data });
    markComplete(7);
    goNext();
  });

  const e = errors as any;

  return (
    <div className="space-y-6">
      <SectionCard title="Risk profile">
        <Controller control={control} name="q1_investment_knowledge" render={({ field }) => (
          <RadioRow number={1} question="How would you describe your overall investment knowledge and experience?" options={HIGH_TO_LOW} value={field.value} onChange={field.onChange} error={e.q1_investment_knowledge?.message} />
        )} />

        <Controller control={control} name="q2_investment_focus" render={({ field }) => (
          <RadioRow number={2} question="Which type of investment has primarily defined your portfolio?" options={Q2_OPTS} value={field.value} onChange={field.onChange} error={e.q2_investment_focus?.message} />
        )} />

        <Controller control={control} name="q3_inflation_concern" render={({ field }) => (
          <RadioRow number={3} question="How concerned are you about inflation eroding the purchasing power of your assets?" options={HIGH_TO_LOW} value={field.value} onChange={field.onChange} error={e.q3_inflation_concern?.message} />
        )} />

        <Controller control={control} name="q4_cash_value_access_horizon" render={({ field }) => (
          <RadioRow number={4} question="When do you expect you may need to access cash value from this policy?" options={Q4_OPTS} value={field.value} onChange={field.onChange} error={e.q4_cash_value_access_horizon?.message} />
        )} />
      </SectionCard>

      <SectionCard title="Risk attitudes">
        <p className="text-xs text-[var(--color-text-muted)] mb-1 -mt-2">Indicate how strongly you agree or disagree with each statement.</p>
        <Controller control={control} name="q5_accept_return_variation" render={({ field }) => (
          <RadioRow number={5} question="I am comfortable with my policy's cash value varying based on investment performance." options={AGREE_OPTS} value={field.value} onChange={field.onChange} error={e.q5_accept_return_variation?.message} />
        )} />

        <Controller control={control} name="q6_pay_more_for_certainty" render={({ field }) => (
          <RadioRow number={6} question="I am willing to pay a higher premium in exchange for guaranteed policy values." options={AGREE_OPTS} value={field.value} onChange={field.onChange} error={e.q6_pay_more_for_certainty?.message} />
        )} />

        <Controller control={control} name="q7_pay_more_for_ltc" render={({ field }) => (
          <RadioRow number={7} question="I would pay a higher premium to include a long-term care or chronic illness rider." options={AGREE_OPTS} value={field.value} onChange={field.onChange} error={e.q7_pay_more_for_ltc?.message} />
        )} />

        <Controller control={control} name="q8_accept_higher_premium_risk" render={({ field }) => (
          <RadioRow number={8} question="I am willing to assume the risk of significantly higher premiums to achieve better long-term cash value performance." options={AGREE_OPTS} value={field.value} onChange={field.onChange} error={e.q8_accept_higher_premium_risk?.message} />
        )} />

        <Controller control={control} name="q9_accept_opaque_crediting" render={({ field }) => (
          <RadioRow number={9} question="I am comfortable with crediting strategies I may not fully understand (e.g., index caps, participation rates)." options={AGREE_OPTS} value={field.value} onChange={field.onChange} error={e.q9_accept_opaque_crediting?.message} />
        )} />

        <Controller control={control} name="q10_accept_higher_fees_for_upside" render={({ field }) => (
          <RadioRow number={10} question="I am willing to pay higher policy fees and expenses in exchange for greater upside potential." options={AGREE_OPTS} value={field.value} onChange={field.onChange} error={e.q10_accept_higher_fees_for_upside?.message} />
        )} />
      </SectionCard>

      <StepFooter onContinue={onContinue} />
    </div>
  );
}
