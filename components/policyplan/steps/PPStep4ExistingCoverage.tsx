"use client";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import {
  existingCoverageSchema,
  policyTypeEnum,
  type ExistingCoverage,
} from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PPStepFooter, PPSectionCard } from "@/components/policyplan/PPStepWrapper";
import { FormField } from "@/components/ui/FormField";
import { TextInput, Select, MoneyInput } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/utils";

const POLICY_TYPE_LABELS: Record<string, string> = {
  term: "Term",
  whole_life: "Whole life",
  universal_life: "Universal life",
  indexed_ul: "Indexed UL",
  variable_ul: "Variable UL",
  guaranteed_ul: "Guaranteed UL",
  other: "Other",
};

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

const EMPTY_POLICY = {
  insurance_company: "",
  policy_number: "",
  insured: "",
  policy_owner: "",
  year_issued: undefined,
  death_benefit: undefined,
  gross_cash_value: undefined,
  policy_loan_balance: undefined,
  cash_surrender_value: undefined,
  premium_amount: undefined,
  remaining_premium_years: undefined,
  policy_type: undefined,
  under_replacement_consideration: undefined as "yes" | "no" | undefined,
};

function formatMoney(v: number | undefined | null) {
  if (v == null || v === 0) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function PolicyCard({
  idx,
  field,
  isOpen,
  onToggle,
  onRemove,
  control,
  register,
  watch,
  errors,
}: {
  idx: number;
  field: { id: string };
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  control: ReturnType<typeof useForm<ExistingCoverage>>["control"];
  register: ReturnType<typeof useForm<ExistingCoverage>>["register"];
  watch: ReturnType<typeof useForm<ExistingCoverage>>["watch"];
  errors: ReturnType<typeof useForm<ExistingCoverage>>["formState"]["errors"];
}) {
  const company = watch(`policies.${idx}.insurance_company`);
  const policyNum = watch(`policies.${idx}.policy_number`);
  const insured = watch(`policies.${idx}.insured`);
  const policyType = watch(`policies.${idx}.policy_type`);
  const deathBenefit = watch(`policies.${idx}.death_benefit`);
  const cashValue = watch(`policies.${idx}.gross_cash_value`);
  const replacement = watch(`policies.${idx}.under_replacement_consideration`);

  const isIncomplete = !company && !policyNum && !insured;
  const typeLabel = policyType ? POLICY_TYPE_LABELS[policyType] : null;

  return (
    <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
      {/* Summary row — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 bg-[var(--color-surface)] hover:bg-[var(--color-readonly-bg)] transition-colors text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] shrink-0">
            Policy {idx + 1}
          </span>
          {isIncomplete ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] italic">
              <AlertCircle size={12} className="text-amber-500" />
              Incomplete
            </span>
          ) : (
            <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {company || "—"}
              {policyNum ? ` · ${policyNum}` : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0 ml-3">
          {/* Quick summary chips */}
          {typeLabel && (
            <span className="hidden sm:block text-xs px-2 py-0.5 rounded bg-[var(--color-readonly-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
              {typeLabel}
            </span>
          )}
          {formatMoney(deathBenefit) && (
            <span className="hidden md:block text-xs text-[var(--color-text-secondary)]">
              DB {formatMoney(deathBenefit)}
            </span>
          )}
          {formatMoney(cashValue) && (
            <span className="hidden lg:block text-xs text-[var(--color-text-secondary)]">
              CV {formatMoney(cashValue)}
            </span>
          )}
          {replacement === "yes" && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-medium">
              Replacement
            </span>
          )}
          {isOpen ? (
            <ChevronUp size={16} className="text-[var(--color-text-muted)]" />
          ) : (
            <ChevronDown size={16} className="text-[var(--color-text-muted)]" />
          )}
        </div>
      </button>

      {/* Expanded editor */}
      {isOpen && (
        <div className="border-t border-[var(--color-border)] px-5 py-5 space-y-6">

          {/* Group 1 — Policy identity */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
              Policy identity
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Insurance company">
                <TextInput {...register(`policies.${idx}.insurance_company`)} placeholder="Carrier name" />
              </FormField>
              <FormField label="Policy number">
                <TextInput {...register(`policies.${idx}.policy_number`)} placeholder="Policy #" />
              </FormField>
              <FormField label="Insured">
                <TextInput {...register(`policies.${idx}.insured`)} placeholder="Insured name" />
              </FormField>
              <FormField label="Policy owner">
                <TextInput {...register(`policies.${idx}.policy_owner`)} placeholder="Owner name" />
              </FormField>
              <FormField label="Policy type">
                <Select {...register(`policies.${idx}.policy_type`)}>
                  <option value="">Select type</option>
                  {policyTypeEnum.options.map((v) => (
                    <option key={v} value={v}>{POLICY_TYPE_LABELS[v]}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Year issued">
                <TextInput
                  {...register(`policies.${idx}.year_issued`, { valueAsNumber: true })}
                  type="number"
                  placeholder="e.g. 2010"
                  min={1900}
                  max={2100}
                />
              </FormField>
            </div>
          </div>

          {/* Group 2 — Policy values */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
              Policy values
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Death benefit">
                <Controller
                  control={control}
                  name={`policies.${idx}.death_benefit`}
                  render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
                />
              </FormField>
              <FormField label="Gross cash value">
                <Controller
                  control={control}
                  name={`policies.${idx}.gross_cash_value`}
                  render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
                />
              </FormField>
              <FormField label="Cash surrender value">
                <Controller
                  control={control}
                  name={`policies.${idx}.cash_surrender_value`}
                  render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
                />
              </FormField>
              <FormField label="Policy loan balance">
                <Controller
                  control={control}
                  name={`policies.${idx}.policy_loan_balance`}
                  render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
                />
              </FormField>
            </div>
          </div>

          {/* Group 3 — Premium & duration */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
              Premium &amp; duration
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Annual premium">
                <Controller
                  control={control}
                  name={`policies.${idx}.premium_amount`}
                  render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
                />
              </FormField>
              <FormField label="Remaining premium years" hint="0 if paid-up; leave blank if unknown">
                <TextInput
                  {...register(`policies.${idx}.remaining_premium_years`, { valueAsNumber: true })}
                  type="number"
                  placeholder="e.g. 10"
                  min={0}
                  max={100}
                />
              </FormField>
              <FormField label="Purpose of policy" className="sm:col-span-2">
                <TextInput {...register(`policies.${idx}.purpose_of_policy`)} placeholder="Brief description" />
              </FormField>
            </div>
          </div>

          {/* Group 4 — Review context */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
              Review context
            </p>
            <FormField label="Under replacement consideration?">
              <Controller
                control={control}
                name={`policies.${idx}.under_replacement_consideration`}
                render={({ field }) => (
                  <SegmentedControl options={YES_NO} value={field.value} onChange={field.onChange} />
                )}
              />
            </FormField>
          </div>

          {/* Remove */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1.5 text-xs text-[var(--color-error)] hover:underline"
            >
              <Trash2 size={13} />
              Remove policy {idx + 1}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PPStep4ExistingCoverage() {
  const { formData, patch, markComplete, goNext } = usePPWizard();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const { register, control, handleSubmit, watch, reset, formState: { errors } } =
    useForm<ExistingCoverage>({
      resolver: zodResolver(existingCoverageSchema),
      defaultValues: formData.existing_coverage ?? {
        has_existing_coverage: undefined as unknown as "yes" | "no",
        policies: [],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "policies" });
  const hasCoverage = watch("has_existing_coverage");

  useEffect(() => {
    if (formData.existing_coverage) reset(formData.existing_coverage as ExistingCoverage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.existing_coverage]);

  // Auto-open new card when appended
  function handleAddPolicy() {
    append(EMPTY_POLICY);
    setOpenIdx(fields.length); // will be the new index
  }

  function handleRemove(idx: number) {
    remove(idx);
    setOpenIdx((prev) => (prev === idx ? null : prev != null && prev > idx ? prev - 1 : prev));
  }

  const onValid = (data: ExistingCoverage) => {
    patch({ existing_coverage: data });
    markComplete(4);
    goNext();
  };

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">
        Record any life insurance currently in force. This information is used to assess existing
        coverage adequacy and identify replacement considerations.
      </p>

      <PPSectionCard>
        <FormField
          label="Does the client have existing life insurance in force?"
          error={(errors.has_existing_coverage as { message?: string } | undefined)?.message}
          required
        >
          <Controller
            control={control}
            name="has_existing_coverage"
            render={({ field }) => (
              <SegmentedControl
                options={YES_NO}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>
      </PPSectionCard>

      {hasCoverage === "yes" && (
        <div className="mt-5 space-y-3">
          {/* Policy list error */}
          {errors.policies && !Array.isArray(errors.policies) && (
            <p className="text-sm text-[var(--color-error)] mb-1">
              {(errors.policies as { message?: string }).message}
            </p>
          )}

          {fields.map((field, idx) => (
            <PolicyCard
              key={field.id}
              idx={idx}
              field={field}
              isOpen={openIdx === idx}
              onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
              onRemove={() => handleRemove(idx)}
              control={control}
              register={register}
              watch={watch}
              errors={errors}
            />
          ))}

          {fields.length < 3 && (
            <button
              type="button"
              onClick={handleAddPolicy}
              className="w-full flex items-center gap-3 rounded-lg border border-dashed border-[var(--color-border-strong)] px-5 py-4 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors bg-[var(--color-surface)]"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-readonly-bg)] border border-[var(--color-border)]">
                <Plus size={14} />
              </span>
              <span className="font-medium">
                {fields.length === 0 ? "Add a policy" : "Add another policy"}
              </span>
              <span className="text-xs text-[var(--color-text-muted)] ml-auto hidden sm:block">
                Carrier, values, and replacement status
              </span>
            </button>
          )}
        </div>
      )}

      <PPStepFooter onContinue={handleSubmit(onValid)} />
    </form>
  );
}
