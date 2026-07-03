"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  policySpecsSchema,
  deathBenefitScaleEnum,
  premiumScaleEnum,
  type PolicySpecs,
} from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PPStepFooter } from "@/components/policyplan/PPStepWrapper";
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

/**
 * Dual-mode duration — scale chips or exact age entry.
 * Two visually distinct modes with a clear "or" separator.
 */
function DualModeDuration({
  scaleOptions,
  scaleLabels,
  value,
  onChange,
  modeLabel,
}: {
  scaleOptions: readonly string[];
  scaleLabels: Record<string, string>;
  value: { mode: "age"; age: number } | { mode: "scale"; scale_point: string } | undefined;
  onChange: (v: { mode: "age"; age: number } | { mode: "scale"; scale_point: string } | undefined) => void;
  modeLabel: string;
}) {
  const [ageInput, setAgeInput] = useState(value?.mode === "age" ? String(value.age) : "");
  const activeScale = value?.mode === "scale" ? value.scale_point : null;
  const ageMode = value?.mode === "age";

  return (
    <div className="space-y-4">
      {/* Mode A — standard duration points */}
      <div
        className={cn(
          "rounded-lg border p-4 transition-colors",
          !ageMode
            ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
            : "border-[var(--color-border)] bg-[var(--color-surface)]"
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
          Standard {modeLabel.toLowerCase()} points
        </p>
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
                "px-3 py-2 rounded border text-sm transition-colors min-h-[40px] font-medium",
                activeScale === pt
                  ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              )}
            >
              {scaleLabels[pt]}
            </button>
          ))}
        </div>
      </div>

      {/* Mode B — specific age */}
      <div
        className={cn(
          "rounded-lg border p-4 transition-colors",
          ageMode
            ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
            : "border-[var(--color-border)] bg-[var(--color-surface)]"
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
          Specific age
        </p>
        <div className="flex items-center gap-3">
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
              if (value?.mode === "scale") onChange(undefined);
            }}
            className={cn(
              "w-28 rounded border px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] min-h-[40px] bg-[var(--color-surface)]",
              ageMode ? "border-[var(--color-accent)]" : "border-[var(--color-border-strong)]"
            )}
          />
          <span className="text-sm text-[var(--color-text-muted)]">years old (attained age)</span>
        </div>
      </div>
    </div>
  );
}

/** A target block — amount input + duration selector as one design decision. */
function TargetBlock({
  title,
  description,
  amountLabel,
  amountControl,
  durationLabel,
  durationControl,
}: {
  title: string;
  description: string;
  amountLabel: string;
  amountControl: React.ReactNode;
  durationLabel: string;
  durationControl: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-[var(--color-border)]">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-5 space-y-6">
        <FormField label={amountLabel}>
          {amountControl}
        </FormField>
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">{durationLabel}</p>
          {durationControl}
        </div>
      </div>
    </div>
  );
}

export function PPStep6PolicySpecs() {
  const { formData, patch, markComplete, goNext } = usePPWizard();
  const [optionalOpen, setOptionalOpen] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<PolicySpecs>({
    resolver: zodResolver(policySpecsSchema),
    defaultValues: formData.policy_specs as PolicySpecs | undefined,
  });

  useEffect(() => {
    if (formData.policy_specs) reset(formData.policy_specs as PolicySpecs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.policy_specs]);

  const onValid = (data: PolicySpecs) => {
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
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">
        Set the primary design targets for this policy. These drive the illustration parameters and
        best-interest analysis.
      </p>

      <div className="space-y-5">
        {/* Coverage target */}
        <TargetBlock
          title="Coverage target"
          description="How much death benefit is needed, and for how long?"
          amountLabel="Desired death benefit"
          amountControl={
            <Controller
              control={control}
              name="desired_death_benefit"
              render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
            />
          }
          durationLabel="Coverage duration"
          durationControl={
            <Controller
              control={control}
              name="death_benefit_duration"
              render={({ field }) => (
                <DualModeDuration
                  modeLabel="Duration"
                  scaleOptions={deathBenefitScaleEnum.options}
                  scaleLabels={DB_SCALE_LABELS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          }
        />

        {/* Premium target */}
        <TargetBlock
          title="Premium target"
          description="What is the intended annual outlay, and for how long will premiums be paid?"
          amountLabel="Desired annual premium"
          amountControl={
            <Controller
              control={control}
              name="desired_premium"
              render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
            />
          }
          durationLabel="Premium payment period"
          durationControl={
            <Controller
              control={control}
              name="premium_duration"
              render={({ field }) => (
                <DualModeDuration
                  modeLabel="Payment period"
                  scaleOptions={premiumScaleEnum.options}
                  scaleLabels={PREMIUM_SCALE_LABELS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          }
        />

        {/* Optional planning targets — collapsed by default */}
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
          <button
            type="button"
            onClick={() => setOptionalOpen((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--color-readonly-bg)] transition-colors text-left"
            aria-expanded={optionalOpen}
          >
            <div>
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                Optional planning targets
              </span>
              <span className="text-xs text-[var(--color-text-muted)] ml-3">
                Cash value accumulation &amp; annual distributions
              </span>
            </div>
            {optionalOpen ? (
              <ChevronUp size={16} className="text-[var(--color-text-muted)]" />
            ) : (
              <ChevronDown size={16} className="text-[var(--color-text-muted)]" />
            )}
          </button>

          {optionalOpen && (
            <div className="border-t border-[var(--color-border)] px-6 py-5 space-y-6">
              {/* Cash value accumulation */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
                  Cash value accumulation target
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Target amount">
                    <Controller
                      control={control}
                      name="desired_cash_value_accumulation.amount"
                      render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
                    />
                  </FormField>
                  <FormField label="At age">
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
                </div>
              </div>

              {/* Annual distribution */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
                  Annual distribution target
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="Annual amount" className="sm:col-span-1">
                    <Controller
                      control={control}
                      name="desired_annual_distribution.amount"
                      render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
                    />
                  </FormField>
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
            </div>
          )}
        </div>
      </div>

      <PPStepFooter onContinue={handleSubmit(onValid)} />
    </form>
  );
}
