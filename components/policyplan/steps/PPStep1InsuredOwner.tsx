"use client";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  insuredOwnerSchema,
  type InsuredOwner,
  businessTypeEnum,
} from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PP_SAMPLE_CASE } from "@/lib/policyplan/sample-case";
import { PPStepFooter, PPSectionCard } from "@/components/policyplan/PPStepWrapper";
import { FormField } from "@/components/ui/FormField";
import { TextInput, Select } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

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
      {/* Load sample case */}
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => loadSample(PP_SAMPLE_CASE)}
          className="text-xs font-medium text-[var(--color-accent)] hover:underline px-3 py-1.5 border border-[var(--color-accent)] rounded transition-colors"
        >
          Load sample case
        </button>
      </div>

      {/* Insureds */}
      <div className="space-y-4">
        {fields.map((field, idx) => (
          <PPSectionCard
            key={field.id}
            title={fields.length > 1 ? `Insured ${idx + 1}` : "Insured"}
          >
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
                  onChange={(v) => setValue(`insureds.${idx}.gender`, v, { shouldValidate: true })}
                />
              </FormField>

              <FormField label="Nicotine use in last 3 years">
                <SegmentedControl
                  options={YES_NO}
                  value={watch(`insureds.${idx}.nicotine_use`)}
                  onChange={(v) => setValue(`insureds.${idx}.nicotine_use`, v, { shouldValidate: true })}
                />
              </FormField>
            </div>

            {idx > 0 && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="flex items-center gap-1.5 text-xs text-[var(--color-error)] hover:underline"
                >
                  <Trash2 size={13} />
                  Remove second insured
                </button>
              </div>
            )}
          </PPSectionCard>
        ))}

        {fields.length < 2 && (
          <button
            type="button"
            onClick={() => append({ name: "" })}
            className="flex items-center gap-2 text-sm text-[var(--color-accent)] hover:underline font-medium"
          >
            <Plus size={15} />
            Add second insured
          </button>
        )}
      </div>

      {/* Ownership */}
      <div className="mt-6">
        <PPSectionCard title="Policy ownership">
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

            <FormField label="Ownership type" className="sm:col-span-2">
              <SegmentedControl
                options={OWNERSHIP_OPTIONS}
                value={ownershipType}
                onChange={(v) => setValue("ownership_type", v, { shouldValidate: true })}
              />
            </FormField>

            {ownershipType === "business" && (
              <FormField
                label="Business entity type"
                error={errors.business_type?.message}
                required
              >
                <Select {...register("business_type")} error={!!errors.business_type}>
                  <option value="">Select entity type</option>
                  {businessTypeEnum.options.map((v) => (
                    <option key={v} value={v}>
                      {v === "c_corp"
                        ? "C corporation"
                        : v === "s_corp"
                        ? "S corporation"
                        : v === "llc"
                        ? "LLC"
                        : v === "limited_partnership"
                        ? "Limited partnership"
                        : "Sole proprietorship"}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}

            {ownershipType === "trust" && (
              <>
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
              </>
            )}
          </div>
        </PPSectionCard>
      </div>

      <PPStepFooter onContinue={handleSubmit(onValid)} />
    </form>
  );
}
