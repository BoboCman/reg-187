"use client";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
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

export function PPStep4ExistingCoverage() {
  const { formData, patch, markComplete, goNext } = usePPWizard();

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

  const onValid = (data: ExistingCoverage) => {
    patch({ existing_coverage: data });
    markComplete(4);
    goNext();
  };

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <PPSectionCard title="Existing life insurance">
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

        {hasCoverage === "yes" && (
          <div className="mt-6 space-y-4">
            {/* Top-level policy list error */}
            {errors.policies && !Array.isArray(errors.policies) && (
              <p className="text-sm text-[var(--color-error)]">
                {(errors.policies as { message?: string }).message}
              </p>
            )}

            {fields.map((field, idx) => (
              <div key={field.id} className="rounded-lg border border-[var(--color-border)] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Policy {idx + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="flex items-center gap-1 text-xs text-[var(--color-error)] hover:underline"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>

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
                  <FormField label="Year issued">
                    <TextInput
                      {...register(`policies.${idx}.year_issued`, { valueAsNumber: true })}
                      type="number"
                      placeholder="e.g. 2010"
                      min={1900}
                      max={2100}
                    />
                  </FormField>
                  <FormField label="Policy type">
                    <Select {...register(`policies.${idx}.policy_type`)}>
                      <option value="">Select type</option>
                      {policyTypeEnum.options.map((v) => (
                        <option key={v} value={v}>{POLICY_TYPE_LABELS[v]}</option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Death benefit">
                    <Controller
                      control={control}
                      name={`policies.${idx}.death_benefit`}
                      render={({ field }) => (
                        <MoneyInput value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </FormField>
                  <FormField label="Gross cash value">
                    <Controller
                      control={control}
                      name={`policies.${idx}.gross_cash_value`}
                      render={({ field }) => (
                        <MoneyInput value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </FormField>
                  <FormField label="Cash surrender value">
                    <Controller
                      control={control}
                      name={`policies.${idx}.cash_surrender_value`}
                      render={({ field }) => (
                        <MoneyInput value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </FormField>
                  <FormField label="Policy loan balance">
                    <Controller
                      control={control}
                      name={`policies.${idx}.policy_loan_balance`}
                      render={({ field }) => (
                        <MoneyInput value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </FormField>
                  <FormField label="Annual premium">
                    <Controller
                      control={control}
                      name={`policies.${idx}.premium_amount`}
                      render={({ field }) => (
                        <MoneyInput value={field.value} onChange={field.onChange} />
                      )}
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
                  <FormField label="Purpose of policy">
                    <TextInput {...register(`policies.${idx}.purpose_of_policy`)} placeholder="Brief description" />
                  </FormField>
                  <FormField label="Under replacement consideration?" className="sm:col-span-2">
                    <Controller
                      control={control}
                      name={`policies.${idx}.under_replacement_consideration`}
                      render={({ field }) => (
                        <SegmentedControl options={YES_NO} value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </FormField>
                </div>
              </div>
            ))}

            {fields.length < 3 && (
              <button
                type="button"
                onClick={() => append(EMPTY_POLICY)}
                className="flex items-center gap-2 text-sm text-[var(--color-accent)] hover:underline font-medium"
              >
                <Plus size={15} />
                Add {fields.length === 0 ? "a policy" : "another policy"}
              </button>
            )}
          </div>
        )}
      </PPSectionCard>

      <PPStepFooter onContinue={handleSubmit(onValid)} />
    </form>
  );
}
