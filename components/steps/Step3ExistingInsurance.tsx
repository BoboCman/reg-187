"use client";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  existingInsuranceSchema,
  type ExistingInsurance,
} from "@/lib/lidq-schema";
import { useWizard } from "@/lib/wizard-context";
import { StepFooter, SectionCard } from "@/components/StepWrapper";
import { FormField } from "@/components/ui/FormField";
import { TextInput, MoneyInput, Select } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";

const YES_NO_OPTS = [
  { value: "yes" as const, label: "Yes" },
  { value: "no" as const, label: "No" },
];

const POLICY_TYPE_OPTS = [
  { value: "term", label: "Term" },
  { value: "whole_life", label: "Whole Life" },
  { value: "universal_life", label: "Universal Life" },
  { value: "indexed_ul", label: "Indexed UL" },
  { value: "variable_ul", label: "Variable UL" },
  { value: "guaranteed_ul", label: "Guaranteed UL" },
  { value: "other", label: "Other" },
];

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
  next_premium_due_date: undefined,
  policy_type: undefined,
  purpose_of_policy: "",
  premium_source: "",
  remaining_premium_years: undefined,
};

export function Step3ExistingInsurance() {
  const { formData, patch, goNext, markComplete } = useWizard();

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExistingInsurance>({
    resolver: zodResolver(existingInsuranceSchema),
    defaultValues: formData.existing_insurance ?? {
      has_existing_insurance: undefined as any,
      policies: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "policies" });
  const hasInsurance = watch("has_existing_insurance");

  useEffect(() => {
    if (formData.existing_insurance) {
      reset(formData.existing_insurance as ExistingInsurance);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.existing_insurance]);

  const onContinue = handleSubmit((data) => {
    patch({ existing_insurance: data });
    markComplete(3);
    goNext();
  });

  return (
    <div className="space-y-6">
      <SectionCard>
        <FormField
          label="Do you have existing life insurance?"
          error={(errors as any).has_existing_insurance?.message}
        >
          <Controller
            control={control}
            name="has_existing_insurance"
            render={({ field }) => (
              <SegmentedControl
                options={YES_NO_OPTS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>
      </SectionCard>

      {hasInsurance === "yes" && (
        <div className="space-y-4">
          {(errors as any).policies?.message && (
            <p className="text-sm text-[var(--color-error)]">
              {(errors as any).policies.message}
            </p>
          )}
          {fields.map((field, i) => (
            <SectionCard key={field.id} title={`Policy ${i + 1}`}>
              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="flex items-center gap-1 text-xs text-[var(--color-error)] hover:underline"
                >
                  <Trash2 size={13} /> Remove policy
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField label="Insurance company" htmlFor={`p${i}-company`}>
                  <TextInput
                    id={`p${i}-company`}
                    {...register(`policies.${i}.insurance_company`)}
                    placeholder="Company name"
                  />
                </FormField>

                <FormField label="Policy number" htmlFor={`p${i}-num`}>
                  <TextInput
                    id={`p${i}-num`}
                    {...register(`policies.${i}.policy_number`)}
                    placeholder="Policy #"
                  />
                </FormField>

                <FormField label="Policy type" htmlFor={`p${i}-type`}>
                  <Select id={`p${i}-type`} {...register(`policies.${i}.policy_type`)}>
                    <option value="">Select type…</option>
                    {POLICY_TYPE_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Insured" htmlFor={`p${i}-insured`}>
                  <TextInput
                    id={`p${i}-insured`}
                    {...register(`policies.${i}.insured`)}
                    placeholder="Name of insured"
                  />
                </FormField>

                <FormField label="Policy owner" htmlFor={`p${i}-owner`}>
                  <TextInput
                    id={`p${i}-owner`}
                    {...register(`policies.${i}.policy_owner`)}
                    placeholder="Owner name or entity"
                  />
                </FormField>

                <FormField label="Year issued" htmlFor={`p${i}-year`}>
                  <TextInput
                    id={`p${i}-year`}
                    type="number"
                    {...register(`policies.${i}.year_issued`, { valueAsNumber: true })}
                    placeholder="YYYY"
                  />
                </FormField>

                <FormField label="Death benefit">
                  <Controller
                    control={control}
                    name={`policies.${i}.death_benefit`}
                    render={({ field }) => (
                      <MoneyInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </FormField>

                <FormField label="Gross cash value">
                  <Controller
                    control={control}
                    name={`policies.${i}.gross_cash_value`}
                    render={({ field }) => (
                      <MoneyInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </FormField>

                <FormField label="Policy loan balance">
                  <Controller
                    control={control}
                    name={`policies.${i}.policy_loan_balance`}
                    render={({ field }) => (
                      <MoneyInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </FormField>

                <FormField label="Cash surrender value">
                  <Controller
                    control={control}
                    name={`policies.${i}.cash_surrender_value`}
                    render={({ field }) => (
                      <MoneyInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </FormField>

                <FormField label="Premium amount">
                  <Controller
                    control={control}
                    name={`policies.${i}.premium_amount`}
                    render={({ field }) => (
                      <MoneyInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </FormField>

                <FormField label="Next premium due" htmlFor={`p${i}-nextprem`}>
                  <TextInput
                    id={`p${i}-nextprem`}
                    type="date"
                    {...register(`policies.${i}.next_premium_due_date`)}
                  />
                </FormField>

                <FormField label="Remaining premium years" htmlFor={`p${i}-remyrs`}>
                  <TextInput
                    id={`p${i}-remyrs`}
                    type="number"
                    {...register(`policies.${i}.remaining_premium_years`, { valueAsNumber: true })}
                    placeholder="Years"
                  />
                </FormField>

                <FormField label="Purpose of policy" htmlFor={`p${i}-purpose`}>
                  <TextInput
                    id={`p${i}-purpose`}
                    {...register(`policies.${i}.purpose_of_policy`)}
                    placeholder="e.g. Estate liquidity, key person…"
                  />
                </FormField>

                <FormField label="Premium source" htmlFor={`p${i}-source`}>
                  <TextInput
                    id={`p${i}-source`}
                    {...register(`policies.${i}.premium_source`)}
                    placeholder="e.g. Business cash flow"
                  />
                </FormField>
              </div>
            </SectionCard>
          ))}

          {fields.length < 3 && (
            <button
              type="button"
              onClick={() => append(EMPTY_POLICY as any)}
              className="flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
            >
              <Plus size={16} />
              Add {fields.length === 0 ? "a policy" : "another policy"}
            </button>
          )}

          {fields.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">
              No policies added yet. Click the button above to add one.
            </p>
          )}
        </div>
      )}

      <StepFooter onContinue={onContinue} />
    </div>
  );
}
