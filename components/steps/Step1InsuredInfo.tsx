"use client";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insuredInfoSchema,
  type InsuredInfo,
} from "@/lib/lidq-schema";
import { useWizard } from "@/lib/wizard-context";
import { SAMPLE_CASE } from "@/lib/sample-case";
import { StepFooter, SectionCard } from "@/components/StepWrapper";
import { FormField } from "@/components/ui/FormField";
import { TextInput, Select } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Plus, Trash2, FlaskConical } from "lucide-react";
import { useEffect } from "react";

const OWNERSHIP_OPTS = [
  { value: "individual" as const, label: "Individual" },
  { value: "business" as const, label: "Business" },
  { value: "trust" as const, label: "Trust" },
];

const GENDER_OPTS = [
  { value: "male" as const, label: "Male" },
  { value: "female" as const, label: "Female" },
];

const YES_NO_OPTS = [
  { value: "yes" as const, label: "Yes" },
  { value: "no" as const, label: "No" },
];

const BUSINESS_TYPE_OPTS = [
  { value: "c_corp" as const, label: "C Corporation" },
  { value: "s_corp" as const, label: "S Corporation" },
  { value: "llc" as const, label: "LLC" },
  { value: "limited_partnership" as const, label: "Limited Partnership" },
  { value: "sole_proprietorship" as const, label: "Sole Proprietorship" },
];

export function Step1InsuredInfo() {
  const { formData, patch, goNext, markComplete, loadSample } = useWizard();

  const defaultValues: Partial<InsuredInfo> = formData.insured_info ?? {
    clients: [{ name: "", dob: undefined, gender: undefined, nicotine_use: undefined }],
    ownership_type: "individual",
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<InsuredInfo>({
    resolver: zodResolver(insuredInfoSchema),
    defaultValues: defaultValues as InsuredInfo,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "clients" });
  const ownershipType = watch("ownership_type");

  // Re-sync form when sample case loads
  useEffect(() => {
    if (formData.insured_info) {
      reset(formData.insured_info as InsuredInfo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.insured_info]);

  const onContinue = handleSubmit((data) => {
    patch({ insured_info: data });
    markComplete(1);
    goNext();
  });

  const handleLoadSample = () => {
    loadSample(SAMPLE_CASE);
    reset(SAMPLE_CASE.insured_info as InsuredInfo);
  };

  return (
    <div className="space-y-6">
      {/* Load sample button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleLoadSample}
          className="flex items-center gap-2 px-4 py-2 rounded border border-[var(--color-border-strong)] text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface)] hover:bg-[var(--color-background)] transition-colors"
        >
          <FlaskConical size={15} />
          Load sample case
        </button>
      </div>

      {/* Clients */}
      <SectionCard title="Insured clients">
        <div className="space-y-8">
          {fields.map((field, i) => (
            <div key={field.id} className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Client {i + 1}
                </h3>
                {i === 1 && (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="flex items-center gap-1 text-xs text-[var(--color-error)] hover:underline"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField
                  label="Full name"
                  htmlFor={`clients.${i}.name`}
                  error={errors.clients?.[i]?.name?.message}
                  required
                >
                  <TextInput
                    id={`clients.${i}.name`}
                    {...register(`clients.${i}.name`)}
                    placeholder="First and last name"
                    error={!!errors.clients?.[i]?.name}
                  />
                </FormField>

                <FormField
                  label="Date of birth"
                  htmlFor={`clients.${i}.dob`}
                  error={errors.clients?.[i]?.dob?.message}
                >
                  <TextInput
                    id={`clients.${i}.dob`}
                    type="date"
                    {...register(`clients.${i}.dob`)}
                    error={!!errors.clients?.[i]?.dob}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField label="Gender">
                  <Controller
                    control={control}
                    name={`clients.${i}.gender`}
                    render={({ field }) => (
                      <SegmentedControl
                        options={GENDER_OPTS}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </FormField>

                <FormField label="Nicotine use in last 5 years">
                  <Controller
                    control={control}
                    name={`clients.${i}.nicotine_use`}
                    render={({ field }) => (
                      <SegmentedControl
                        options={YES_NO_OPTS}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </FormField>
              </div>

              {i < fields.length - 1 && (
                <hr className="border-[var(--color-border)]" />
              )}
            </div>
          ))}

          {fields.length === 1 && (
            <button
              type="button"
              onClick={() =>
                append({
                  name: "",
                  dob: undefined,
                  gender: undefined,
                  nicotine_use: undefined,
                })
              }
              className="flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] hover:underline mt-2"
            >
              <Plus size={16} />
              Add second insured
            </button>
          )}
        </div>
      </SectionCard>

      {/* Policy owner */}
      <SectionCard title="Policy ownership">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FormField
            label="Policy owner"
            htmlFor="policy_owner"
            error={errors.policy_owner?.message}
          >
            <TextInput
              id="policy_owner"
              {...register("policy_owner")}
              placeholder="Name or entity"
              error={!!errors.policy_owner}
            />
          </FormField>

          <FormField
            label="State of ownership"
            htmlFor="state_of_ownership"
            error={errors.state_of_ownership?.message}
            hint="2-letter state code"
          >
            <TextInput
              id="state_of_ownership"
              {...register("state_of_ownership")}
              placeholder="NY"
              maxLength={2}
              className="uppercase"
              error={!!errors.state_of_ownership}
            />
          </FormField>
        </div>

        <div className="mt-5">
          <FormField label="Ownership type" error={(errors as any).ownership_type?.message}>
            <Controller
              control={control}
              name="ownership_type"
              render={({ field }) => (
                <SegmentedControl
                  options={OWNERSHIP_OPTS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>
        </div>

        {/* Business conditionals */}
        {ownershipType === "business" && (
          <div className="mt-5">
            <FormField
              label="Business type"
              htmlFor="business_type"
              error={(errors as any).business_type?.message}
              required
            >
              <Select
                id="business_type"
                {...register("business_type")}
                error={!!(errors as any).business_type}
              >
                <option value="">Select business type…</option>
                {BUSINESS_TYPE_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        )}

        {/* Trust conditionals */}
        {ownershipType === "trust" && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <FormField
              label="Trust type"
              error={(errors as any).trust_type?.message}
              required
            >
              <Controller
                control={control}
                name="trust_type"
                render={({ field }) => (
                  <SegmentedControl
                    options={[
                      { value: "irrevocable" as const, label: "Irrevocable" },
                      { value: "revocable" as const, label: "Revocable" },
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>

            <FormField label="Grantor trust">
              <Controller
                control={control}
                name="grantor_trust"
                render={({ field }) => (
                  <SegmentedControl
                    options={YES_NO_OPTS}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>

            <FormField label="GST exempt">
              <Controller
                control={control}
                name="gst_exempt"
                render={({ field }) => (
                  <SegmentedControl
                    options={YES_NO_OPTS}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>
          </div>
        )}
      </SectionCard>

      <StepFooter onContinue={onContinue} />
    </div>
  );
}
