"use client";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Plus, Trash2, User } from "lucide-react";
import {
  insuredOwnerSchema,
  type InsuredOwner,
  businessTypeEnum,
} from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PP_SAMPLE_CASE } from "@/lib/policyplan/sample-case";
import { PPStepFooter } from "@/components/policyplan/PPStepWrapper";
import { FormField } from "@/components/ui/FormField";
import { TextInput, Select } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/utils";

const GENDER_OPTIONS = [
  { value: "male" as const, label: "Male" },
  { value: "female" as const, label: "Female" },
];

const YES_NO = [
  { value: "yes" as const, label: "Yes" },
  { value: "no" as const, label: "No" },
];

const OWNERSHIP_OPTIONS = [
  { value: "individual" as const, label: "Individual" },
  { value: "business" as const, label: "Business" },
  { value: "trust" as const, label: "Trust" },
];

const TRUST_OPTIONS = [
  { value: "irrevocable" as const, label: "Irrevocable" },
  { value: "revocable" as const, label: "Revocable" },
];

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  c_corp: "C corporation",
  s_corp: "S corporation",
  llc: "LLC",
  limited_partnership: "Limited partnership",
  sole_proprietorship: "Sole proprietorship",
};

export function PPStep1InsuredOwner() {
  const { formData, patch, markComplete, goNext, loadSample } = usePPWizard();

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<InsuredOwner>({
    resolver: zodResolver(insuredOwnerSchema),
    defaultValues: (formData.insured_owner as InsuredOwner | undefined) ?? {
      insureds: [{ name: "" }],
      ownership_type: "individual",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "insureds" });
  const ownershipType = watch("ownership_type");

  useEffect(() => {
    if (formData.insured_owner) reset(formData.insured_owner as InsuredOwner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.insured_owner]);

  const onValid = (data: InsuredOwner) => {
    patch({ insured_owner: data });
    markComplete(1);
    goNext();
  };

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      {/* Page intro */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Start with who is insured and who will own the policy.
        </p>
        <button
          type="button"
          onClick={() => loadSample(PP_SAMPLE_CASE)}
          className="shrink-0 text-xs font-medium text-[var(--color-accent)] hover:underline px-3 py-1.5 border border-[var(--color-accent)] rounded transition-colors"
        >
          Load sample case
        </button>
      </div>

      {/* Insured profile cards */}
      <div className="space-y-4">
        {fields.map((field, idx) => (
          <div
            key={field.id}
            className={cn(
              "bg-[var(--color-surface)] rounded-lg border overflow-hidden",
              idx === 0 ? "border-[var(--color-border)]" : "border-[var(--color-border)] opacity-95"
            )}
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-readonly-bg)]">
              <div className="flex items-center gap-2">
                <User size={14} className="text-[var(--color-text-muted)]" />
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {fields.length > 1 ? `Insured ${idx + 1}` : "Insured"}
                </span>
              </div>
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="flex items-center gap-1 text-xs text-[var(--color-error)] hover:underline"
                >
                  <Trash2 size={12} />
                  Remove
                </button>
              )}
            </div>

            {/* Card body */}
            <div className="px-5 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Full legal name"
                  error={errors.insureds?.[idx]?.name?.message}
                  required
                  className="sm:col-span-2"
                >
                  <TextInput
                    {...register(`insureds.${idx}.name`)}
                    placeholder="Full legal name"
                    error={!!errors.insureds?.[idx]?.name}
                  />
                </FormField>

                <FormField label="Date of birth" error={errors.insureds?.[idx]?.dob?.message}>
                  <TextInput
                    {...register(`insureds.${idx}.dob`)}
                    type="date"
                    error={!!errors.insureds?.[idx]?.dob}
                  />
                </FormField>

                <FormField label="Gender">
                  <SegmentedControl
                    options={GENDER_OPTIONS}
                    value={watch(`insureds.${idx}.gender`)}
                    onChange={(v) =>
                      setValue(`insureds.${idx}.gender`, v, { shouldValidate: true })
                    }
                  />
                </FormField>

                <FormField label="Nicotine use in last 3 years" className="sm:col-span-2">
                  <SegmentedControl
                    options={YES_NO}
                    value={watch(`insureds.${idx}.nicotine_use`)}
                    onChange={(v) =>
                      setValue(`insureds.${idx}.nicotine_use`, v, { shouldValidate: true })
                    }
                  />
                </FormField>
              </div>
            </div>
          </div>
        ))}

        {/* Add second insured action */}
        {fields.length < 2 && (
          <button
            type="button"
            onClick={() => append({ name: "" })}
            className="w-full flex items-center gap-3 rounded-lg border border-dashed border-[var(--color-border-strong)] px-5 py-4 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors bg-[var(--color-surface)]"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-readonly-bg)] border border-[var(--color-border)]">
              <Plus size={14} />
            </span>
            <div className="text-left">
              <p className="font-medium text-sm">Add second insured</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                For survivorship or joint-life cases
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Policy ownership */}
      <div className="mt-6 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-readonly-bg)]">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Policy ownership
          </span>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Owner + state */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Policy owner" className="sm:col-span-2">
              <TextInput {...register("policy_owner")} placeholder="Name or entity" />
            </FormField>

            <FormField
              label="State of ownership"
              hint="2-letter state code"
              error={errors.state_of_ownership?.message}
            >
              <TextInput
                {...register("state_of_ownership")}
                placeholder="NY"
                maxLength={2}
                className="uppercase w-24"
              />
            </FormField>
          </div>

          {/* Ownership type — visually central */}
          <FormField label="Ownership type">
            <SegmentedControl
              options={OWNERSHIP_OPTIONS}
              value={ownershipType}
              onChange={(v) => setValue("ownership_type", v, { shouldValidate: true })}
            />
          </FormField>

          {/* Business details subcard */}
          {ownershipType === "business" && (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-readonly-bg)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
                Business details
              </p>
              <FormField
                label="Business entity type"
                error={errors.business_type?.message}
                required
              >
                <Select {...register("business_type")} error={!!errors.business_type}>
                  <option value="">Select entity type</option>
                  {businessTypeEnum.options.map((v) => (
                    <option key={v} value={v}>
                      {BUSINESS_TYPE_LABELS[v] ?? v}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          )}

          {/* Trust details subcard */}
          {ownershipType === "trust" && (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-readonly-bg)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
                Trust details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Trust type" error={errors.trust_type?.message} required>
                  <SegmentedControl
                    options={TRUST_OPTIONS}
                    value={watch("trust_type")}
                    onChange={(v) => setValue("trust_type", v, { shouldValidate: true })}
                  />
                </FormField>

                <FormField label="Grantor trust">
                  <SegmentedControl
                    options={YES_NO}
                    value={watch("grantor_trust")}
                    onChange={(v) => setValue("grantor_trust", v, { shouldValidate: true })}
                  />
                </FormField>

                <FormField label="GST exempt">
                  <SegmentedControl
                    options={YES_NO}
                    value={watch("gst_exempt")}
                    onChange={(v) => setValue("gst_exempt", v, { shouldValidate: true })}
                  />
                </FormField>
              </div>
            </div>
          )}
        </div>
      </div>

      <PPStepFooter onContinue={handleSubmit(onValid)} />
    </form>
  );
}
