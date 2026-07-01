"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import {
  policySpecsSchema,
  deathBenefitScaleEnum,
  premiumScaleEnum,
  type PolicySpecs,
} from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PPStepFooter, PPSectionCard } from "@/components/policyplan/PPStepWrapper";
import { FormField } from "@/components/ui/FormField";
import { MoneyInput, TextInput } from "@/components/ui/inputs";
import { cn } from "@/lib/utils";

const DB_SCALE_LABELS: Record<string, string> = {
  "10_years": "10 years",
  "20_years": "20 years",
  "30_years": "30 years",
  life_expectancy: "Life expectancy",
  age_100: "Age 100",
  beyond_age_100: "Beyond age 100",
};

const PREMIUM_SCALE_LABELS: Record<string, string> = {
  "1_year": "1 year",
  "5_years": "5 years",
  "10_years": "10 years",
  "20_years": "20 years",
  life_expectancy: "Life expectancy",
  all_years: "All years (lifetime)",
};

/** Dual-mode duration: tap a scale point OR type an age, mutually exclusive. */
function DualModeDuration({
  scaleOptions,
  scaleLabels,
  value,
  onChange,
  label,
}: {
  scaleOptions: readonly string[];
  scaleLabels: Record<string, string>;
  value: { mode: "age"; age: number } | { mode: "scale"; scale_point: string } | undefined;
  onChange: (v: { mode: "age"; age: number } | { mode: "scale"; scale_point: string } | undefined) => void;
  label: string;
}) {
  const [ageInput, setAgeInput] = useState(
    value?.mode === "age" ? String(value.age) : ""
  );

  const activeScale = value?.mode === "scale" ? value.scale_point : null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">{label}</p>
      <div className="flex flex-wrap gap-2">
        {scaleOptions.map((pt) => (
          <button
            key={pt}
            type="button"
            onClick={() => {
              setAgeInput("");
              onChange({ mode: "scale", scale_point: pt });
            }}
            className={cn(
              "px-3 py-2 rounded border text-sm transition-colors min-h-[40px]",
              activeScale === pt
                ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white font-medium"
                : "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            )}
          >
            {scaleLabels[pt]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <p className="text-xs text-[var(--color-text-muted)]">or a specific age:</p>
        <input
          type="number"
          min={0}
          max={120}
          value={ageInput}
          placeholder="e.g. 95"
          onChange={(e) => {
            const raw = e.target.value;
            setAgeInput(raw);
            const n = parseInt(raw, 10);
            if (!isNaN(n) && n >= 0 && n <= 120) {
              onChange({ mode: "age", age: n });
            }
          }}
          onFocus={() => {
            // Clear scale selection when user starts typing an age
            if (value?.mode === "scale") onChange(undefined);
          }}
          className="w-24 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] min-h-[40px]"
        />
      </div>
    </div>
  );
}

export function PPStep6PolicySpecs() {
  const { formData, patch, markComplete, goNext } = usePPWizard();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<PolicySpecs>({
    resolver: zodResolver(policySpecsSchema),
    defaultValues: formData.policy_specs as PolicySpecs | undefined,
  });

  useEffect(() => {
    if (formData.policy_specs) reset(formData.policy_specs as PolicySpecs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.policy_specs]);

  const onValid = (data: PolicySpecs) => {
    // Strip empty optional sub-objects so they stay undefined in the payload
    const cva = data.desired_cash_value_accumulation;
    if (cva && cva.amount == null && cva.at_age == null && cva.year == null) {
      data = { ...data, desired_cash_value_accumulation: undefined };
    }
    const dad = data.desired_annual_distribution;
    if (dad && dad.amount == null && dad.start_age == null && dad.end_age == null) {
      data = { ...data, desired_annual_distribution: undefined };
    }
    patch({ policy_specs: data });
    markComplete(6);
    goNext();
  };

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <div className="space-y-5">
        {/* Death benefit */}
        <PPSectionCard title="Death benefit">
          <div className="space-y-5">
            <FormField label="Desired death benefit amount">
              <Controller
                control={control}
                name="desired_death_benefit"
                render={({ field }) => (
                  <MoneyInput value={field.value} onChange={field.onChange} />
                )}
              />
            </FormField>
            <Controller
              control={control}
              name="death_benefit_duration"
              render={({ field }) => (
                <DualModeDuration
                  label="Coverage duration"
                  scaleOptions={deathBenefitScaleEnum.options}
                  scaleLabels={DB_SCALE_LABELS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </PPSectionCard>

        {/* Premium */}
        <PPSectionCard title="Premium">
          <div className="space-y-5">
            <FormField label="Desired annual premium">
              <Controller
                control={control}
                name="desired_premium"
                render={({ field }) => (
                  <MoneyInput value={field.value} onChange={field.onChange} />
                )}
              />
            </FormField>
            <Controller
              control={control}
              name="premium_duration"
              render={({ field }) => (
                <DualModeDuration
                  label="Premium payment period"
                  scaleOptions={premiumScaleEnum.options}
                  scaleLabels={PREMIUM_SCALE_LABELS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </PPSectionCard>

        {/* Optional targets */}
        <PPSectionCard title="Optional targets">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cash value accumulation */}
            <FormField label="Cash value accumulation target" hint="Target amount">
              <Controller
                control={control}
                name="desired_cash_value_accumulation.amount"
                render={({ field }) => (
                  <MoneyInput value={field.value} onChange={field.onChange} />
                )}
              />
            </FormField>
            <FormField label="At age (for accumulation target)">
              <Controller
                control={control}
                name="desired_cash_value_accumulation.at_age"
                render={({ field }) => (
                  <TextInput
                    type="number"
                    min={0}
                    max={120}
                    placeholder="e.g. 65"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      field.onChange(raw === "" ? undefined : parseInt(raw, 10));
                    }}
                  />
                )}
              />
            </FormField>

            {/* Annual distribution */}
            <FormField label="Annual distribution target">
              <Controller
                control={control}
                name="desired_annual_distribution.amount"
                render={({ field }) => (
                  <MoneyInput value={field.value} onChange={field.onChange} />
                )}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="From age">
                <Controller
                  control={control}
                  name="desired_annual_distribution.start_age"
                  render={({ field }) => (
                    <TextInput
                      type="number"
                      min={0}
                      max={120}
                      placeholder="e.g. 65"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        field.onChange(raw === "" ? undefined : parseInt(raw, 10));
                      }}
                    />
                  )}
                />
              </FormField>
              <FormField label="To age">
                <Controller
                  control={control}
                  name="desired_annual_distribution.end_age"
                  render={({ field }) => (
                    <TextInput
                      type="number"
                      min={0}
                      max={120}
                      placeholder="e.g. 85"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        field.onChange(raw === "" ? undefined : parseInt(raw, 10));
                      }}
                    />
                  )}
                />
              </FormField>
            </div>
          </div>
        </PPSectionCard>
      </div>

      <PPStepFooter onContinue={handleSubmit(onValid)} />
    </form>
  );
}
