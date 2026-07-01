"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  attestationSchema,
  lidqIntakeSchema,
  type Attestation,
  type LidqIntake,
} from "@/lib/lidq-schema";
import { useWizard } from "@/lib/wizard-context";
import { StepFooter, SectionCard } from "@/components/StepWrapper";
import { FormField } from "@/components/ui/FormField";
import { TextInput, TextArea } from "@/components/ui/inputs";
import { today } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const ATTESTATION_TEXT =
  "I confirm that the information given is accurate and complete. I have not omitted any information, facts, or circumstances that are relevant to determining the suitability of a life insurance product recommendation.";

export function Step8Attestation() {
  const { formData, patch, markComplete, setSubmittedIntake } = useWizard();

  const ownershipType = formData.insured_info?.ownership_type;
  const showTitle = ownershipType === "trust" || ownershipType === "business";

  const [submitErrors, setSubmitErrors] = useState<string[]>([]);

  type AttestationDefaults = {
    confirmed?: true;
    owner_signature?: string;
    signed_date?: string;
    signer_title?: string;
  };

  const emptyDefaults: AttestationDefaults = {
    confirmed: undefined,
    owner_signature: "",
    signed_date: today(),
    signer_title: "",
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<Attestation>({
    resolver: zodResolver(attestationSchema),
    defaultValues: (formData.attestation as AttestationDefaults | undefined) ?? emptyDefaults,
  });

  useEffect(() => {
    if (formData.attestation) {
      reset(formData.attestation as AttestationDefaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.attestation]);

  const confirmed = watch("confirmed");
  const signature = watch("owner_signature");
  const canSubmit = confirmed === true && !!signature?.trim();

  const onSubmit = handleSubmit((attestationData) => {
    // Save notes + attestation
    const updatedData = { ...formData, attestation: attestationData };

    // Assemble the full payload
    const payload = {
      schema_version: "0.1.0" as const,
      insured_info: updatedData.insured_info,
      financial: updatedData.financial,
      existing_insurance: updatedData.existing_insurance,
      objectives: updatedData.objectives,
      new_policy_specs: updatedData.new_policy_specs,
      design_priorities: updatedData.design_priorities,
      risk_tolerance: updatedData.risk_tolerance,
      notes: updatedData.notes,
      attestation: attestationData,
    };

    const result = lidqIntakeSchema.safeParse(payload);

    if (result.success) {
      console.log("[LIDQ] Validated intake payload:", result.data);
      patch({ attestation: attestationData });
      markComplete(8);
      setSubmittedIntake(result.data);
    } else {
      const issues = result.error.issues.map(
        (i) => `${i.path.join(".")} — ${i.message}`
      );
      console.error("[LIDQ] Validation errors:", issues);
      setSubmitErrors(issues);
    }
  });

  return (
    <div className="space-y-6">
      {/* Notes */}
      <SectionCard title="Advisor notes">
        <FormField label="Additional notes or context (optional)" htmlFor="notes">
          <Controller
            control={control as any}
            name={"notes" as any}
            render={() => (
              <TextArea
                id="notes"
                value={formData.notes ?? ""}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="Any additional observations, carrier preferences, or context for this case…"
                rows={5}
              />
            )}
          />
        </FormField>
      </SectionCard>

      {/* Attestation */}
      <SectionCard title="Reg 187 attestation">
        <div className="rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] p-5 mb-5">
          <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
            {ATTESTATION_TEXT}
          </p>
        </div>

        <FormField
          label=""
          error={(errors as any).confirmed?.message}
          className="mb-5"
        >
          <Controller
            control={control}
            name="confirmed"
            render={({ field }) => (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.value === true}
                  onChange={(e) =>
                    field.onChange(e.target.checked ? true : (undefined as any))
                  }
                  className="mt-0.5 w-5 h-5 rounded border-[var(--color-border-strong)] accent-[var(--color-accent)] cursor-pointer shrink-0"
                />
                <span className="text-sm text-[var(--color-text-primary)]">
                  I confirm the above attestation is accurate and complete.
                </span>
              </label>
            )}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FormField
            label="Signature (typed name)"
            htmlFor="signature"
            error={errors.owner_signature?.message}
            required
          >
            <TextInput
              id="signature"
              {...register("owner_signature")}
              placeholder="Type full legal name"
              error={!!errors.owner_signature}
              className={cn(
                "font-serif italic",
                signature && "text-[var(--color-text-primary)]"
              )}
            />
          </FormField>

          <FormField
            label="Date signed"
            htmlFor="signed_date"
            error={errors.signed_date?.message}
            required
          >
            <TextInput
              id="signed_date"
              type="date"
              {...register("signed_date")}
              error={!!errors.signed_date}
            />
          </FormField>

          {showTitle && (
            <FormField
              label="Signer title"
              htmlFor="signer_title"
              hint="e.g. Trustee, Managing Member, President"
            >
              <TextInput
                id="signer_title"
                {...register("signer_title")}
                placeholder="Title or capacity"
              />
            </FormField>
          )}
        </div>
      </SectionCard>

      {submitErrors.length > 0 && (
        <div className="rounded-lg bg-[var(--color-error-light)] border border-[var(--color-error)] p-4">
          <p className="text-sm font-semibold text-[var(--color-error)] mb-2">
            Submission errors — please review earlier steps:
          </p>
          <ul className="list-disc list-inside space-y-1">
            {submitErrors.map((e, i) => (
              <li key={i} className="text-sm text-[var(--color-error)]">{e}</li>
            ))}
          </ul>
        </div>
      )}

      <StepFooter onContinue={onSubmit} continueDisabled={!canSubmit} />
    </div>
  );
}
