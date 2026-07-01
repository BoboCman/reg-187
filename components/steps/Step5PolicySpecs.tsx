"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  newPolicySpecsSchema,
  deathBenefitScaleEnum,
  premiumScaleEnum,
  type NewPolicySpecs,
} from "@/lib/lidq-schema";
import { useWizard } from "@/lib/wizard-context";
import { StepFooter, SectionCard } from "@/components/StepWrapper";
import { FormField } from "@/components/ui/FormField";
import { MoneyInput, TextInput } from "@/components/ui/inputs";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

const DB_SCALE_LABELS: Record<string, string> = {
  "10_years": "10 years",
  "20_years": "20 years",
  "30_years": "30 years",
  life_expectancy: "Life expectancy",
  age_100: "Age 100",
  beyond_age_100: "Beyond age 100",
};

const PREM_SCALE_LABELS: Record<string, string> = {
  "1_year": "1 year",
  "5_years": "5 years",
  "10_years": "10 years",
  "20_years": "20 years",
  life_expectancy: "Life expectancy",
  all_years: "All years",
};

const DB_SCALE_OPTS = deathBenefitScaleEnum.options;
const PREM_SCALE_OPTS = premiumScaleEnum.options;

interface DualModeDurationProps {
  scaleOpts: readonly string[];
  scaleLabels: Record<string, string>;
  value: { mode: "age"; age: number } | { mode: "scale"; scale_point: string } | undefined;
  onChange: (v: { mode: "age"; age: number } | { mode: "scale"; scale_point: string } | undefined) => void;
  ageLabel?: string;
}

function DualModeDuration({
  scaleOpts,
  scaleLabels,
  value,
  onChange,
  ageLabel = "Enter age",
}: DualModeDurationProps) {
  const activeScale = value?.mode === "scale" ? value.scale_point : null;
  const ageVal = value?.mode === "age" ? String(value.age) : "";

  return (
    <div className="space-y-3">
      {/* Scale stops */}
      <div className="flex flex-wrap gap-2">
        {scaleOpts.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              onChange({ mode: "scale", scale_point: opt });
            }}
            aria-pressed={activeScale === opt}
            className={cn(
              "px-4 py-2.5 rounded border text-sm font-medium transition-all min-h-[44px]",
              activeScale === opt
                ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                : "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)]"
            )}
          >
            {scaleLabels[opt]}
          </button>
        ))}
      </div>

      {/* OR age input */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--color-text-muted)] shrink-0">or enter age</span>
        <input
          type="number"
          min={0}
          max={120}
          value={ageVal}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n)) {
              onChange({ mode: "age", age: n });
            } else {
              onChange(undefined);
            }
          }}
          placeholder={ageLabel}
          className="w-24 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-[var(--color-accent)] min-h-[44px]"
        />
      </div>
    </div>
  );
}

export function Step5PolicySpecs() {
  const { formData, patch, goNext, markComplete } = useWizard();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewPolicySpecs>({
    resolver: zodResolver(newPolicySpecsSchema),
    defaultValues: formData.new_policy_specs ?? {},
  });

  useEffect(() => {
    if (formData.new_policy_specs) {
      reset(formData.new_policy_specs as NewPolicySpecs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.new_policy_specs]);

  const onContinue = handleSubmit((data) => {
    patch({ new_policy_specs: data });
    markComplete(5);
    goNext();
  });

  return (
    <div className="space-y-6">
      {/* Death benefit */}
      <SectionCard title="Death benefit">
        <div className="space-y-5">
          <FormField label="Desired death benefit" error={(errors as any).desired_death_benefit?.message}>
            <Controller
              control={control}
              name="desired_death_benefit"
              render={({ field }) => (
                <MoneyInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!(errors as any).desired_death_benefit}
                  className="max-w-64"
                />
              )}
            />
          </FormField>

          <FormField
            label="Duration"
            error={(errors as any).death_benefit_duration?.message}
            hint="Select a scale point or enter a specific attained age"
          >
            <Controller
              control={control}
              name="death_benefit_duration"
              render={({ field }) => (
                <DualModeDuration
                  scaleOpts={DB_SCALE_OPTS}
                  scaleLabels={DB_SCALE_LABELS}
                  value={field.value as any}
                  onChange={field.onChange}
                  ageLabel="Attained age"
                />
              )}
            />
          </FormField>
        </div>
      </SectionCard>

      {/* Premium */}
      <SectionCard title="Premium">
        <div className="space-y-5">
          <FormField label="Desired premium" error={(errors as any).desired_premium?.message}>
            <Controller
              control={control}
              name="desired_premium"
              render={({ field }) => (
                <MoneyInput
                  value={field.value}
                  onChange={field.onChange}
                  error={!!(errors as any).desired_premium}
                  className="max-w-64"
                />
              )}
            />
          </FormField>

          <FormField
            label="Premium duration"
            error={(errors as any).premium_duration?.message}
            hint="Select a scale point or enter a specific attained age"
          >
            <Controller
              control={control}
              name="premium_duration"
              render={({ field }) => (
                <DualModeDuration
                  scaleOpts={PREM_SCALE_OPTS}
                  scaleLabels={PREM_SCALE_LABELS}
                  value={field.value as any}
                  onChange={field.onChange}
                  ageLabel="Attained age"
                />
              )}
            />
          </FormField>
        </div>
      </SectionCard>

      {/* Cash value accumulation */}
      <SectionCard title="Cash value accumulation">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <FormField label="Desired amount">
            <Controller
              control={control}
              name="desired_cash_value_accumulation.amount"
              render={({ field }) => (
                <MoneyInput value={field.value} onChange={field.onChange} />
              )}
            />
          </FormField>

          <FormField label="At age" htmlFor="cva-age">
            <Controller
              control={control}
              name="desired_cash_value_accumulation.at_age"
              render={({ field }) => (
                <TextInput
                  id="cva-age"
                  type="number"
                  min={0}
                  max={120}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    field.onChange(isNaN(n) ? undefined : n);
                  }}
                  placeholder="Age"
                />
              )}
            />
          </FormField>

          <FormField label="Policy year" htmlFor="cva-year">
            <Controller
              control={control}
              name="desired_cash_value_accumulation.year"
              render={({ field }) => (
                <TextInput
                  id="cva-year"
                  type="number"
                  min={1}
                  max={100}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    field.onChange(isNaN(n) ? undefined : n);
                  }}
                  placeholder="Year"
                />
              )}
            />
          </FormField>
        </div>
      </SectionCard>

      {/* Annual distribution */}
      <SectionCard title="Annual distribution">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <FormField label="Desired annual amount">
            <Controller
              control={control}
              name="desired_annual_distribution.amount"
              render={({ field }) => (
                <MoneyInput value={field.value} onChange={field.onChange} />
              )}
            />
          </FormField>

          <FormField label="Start age" htmlFor="dist-start">
            <Controller
              control={control}
              name="desired_annual_distribution.start_age"
              render={({ field }) => (
                <TextInput
                  id="dist-start"
                  type="number"
                  min={0}
                  max={120}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    field.onChange(isNaN(n) ? undefined : n);
                  }}
                  placeholder="Age"
                />
              )}
            />
          </FormField>

          <FormField label="End age" htmlFor="dist-end">
            <Controller
              control={control}
              name="desired_annual_distribution.end_age"
              render={({ field }) => (
                <TextInput
                  id="dist-end"
                  type="number"
                  min={0}
                  max={120}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    field.onChange(isNaN(n) ? undefined : n);
                  }}
                  placeholder="Age"
                />
              )}
            />
          </FormField>
        </div>
      </SectionCard>

      <StepFooter onContinue={onContinue} />
    </div>
  );
}
