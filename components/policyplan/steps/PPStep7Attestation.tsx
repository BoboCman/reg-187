"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import {
  attestationSchema,
  ATTESTATION_TEXT,
  policyPlanIntakeSchema,
  type Attestation,
  type PolicyPlanIntake,
  type PolicySpecs,
} from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PPStepFooter, PPSectionCard } from "@/components/policyplan/PPStepWrapper";
import { FormField } from "@/components/ui/FormField";
import { TextInput, TextArea } from "@/components/ui/inputs";
import { today } from "@/lib/utils";

type AttestationDefaults = {
  confirmed?: true;
  owner_signature?: string;
  signed_date?: string;
  signer_title?: string;
};

export function PPStep7Attestation() {
  const { formData, patch, markComplete, setSubmittedIntake } = usePPWizard();
  const ownershipType = formData.insured_owner?.ownership_type;
  const showSignerTitle = ownershipType === "trust" || ownershipType === "business";

  const emptyDefaults: AttestationDefaults = {
    confirmed: undefined,
    owner_signature: "",
    signed_date: today(),
    signer_title: "",
  };

  const { register, control, handleSubmit, watch, reset, formState: { errors } } =
    useForm<Attestation>({
      resolver: zodResolver(attestationSchema),
      defaultValues: (formData.attestation as AttestationDefaults | undefined) ?? emptyDefaults,
    });

  useEffect(() => {
    if (formData.attestation) reset(formData.attestation as AttestationDefaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.attestation]);

  const confirmed = watch("confirmed");
  const signature = watch("owner_signature");
  const canSubmit = confirmed === true && !!signature?.trim();

  const onValid = (attestationData: Attestation) => {
    const fullPayload: Partial<PolicyPlanIntake> = {
      insured_owner: formData.insured_owner as PolicyPlanIntake["insured_owner"],
      objectives: formData.objectives as PolicyPlanIntake["objectives"],
      financial: formData.financial as PolicyPlanIntake["financial"],
      existing_coverage: formData.existing_coverage as PolicyPlanIntake["existing_coverage"],
      risk_preferences: formData.risk_preferences as PolicyPlanIntake["risk_preferences"],
      policy_specs: formData.policy_specs as PolicySpecs,
      notes: formData.notes,
      attestation: attestationData,
    };

    const result = policyPlanIntakeSchema.safeParse(fullPayload);

    if (result.success) {
      console.log("[PolicyPlan] Validated intake:", result.data);
      patch({ attestation: attestationData, notes: formData.notes });
      markComplete(7);
      setSubmittedIntake(result.data);
    } else {
      console.error("[PolicyPlan] Validation errors:", result.error.errors);
      alert(
        "Some required information is missing. Please review your answers.\n\n" +
          result.error.errors
            .map((e) => `${e.path.join(".")} — ${e.message}`)
            .join("\n")
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <div className="space-y-5">
        {/* Notes */}
        <PPSectionCard title="Additional notes">
          <FormField label="Notes or comments for the advisor" hint="Optional">
            <TextArea
              value={formData.notes ?? ""}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Relevant context, health disclosures, planning considerations..."
              rows={5}
            />
          </FormField>
        </PPSectionCard>

        {/* Attestation */}
        <PPSectionCard title="Best-interest attestation">
          <div className="space-y-6">
            {/* Attestation text */}
            <div className="rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] px-5 py-4">
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {ATTESTATION_TEXT}
              </p>
            </div>

            {/* Checkbox */}
            <FormField
              label="Confirmation"
              error={(errors.confirmed as { message?: string } | undefined)?.message}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <Controller
                  control={control}
                  name="confirmed"
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      checked={field.value === true}
                      onChange={(e) => field.onChange(e.target.checked ? true : undefined)}
                      className="mt-0.5 h-5 w-5 rounded border-[var(--color-border-strong)] accent-[var(--color-accent)] cursor-pointer shrink-0"
                    />
                  )}
                />
                <span className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                  I confirm that the above statement is accurate and complete.
                </span>
              </label>
            </FormField>

            {/* Signature */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Signature (type full name)"
                error={errors.owner_signature?.message}
                required
              >
                <TextInput
                  {...register("owner_signature")}
                  placeholder="Full legal name"
                  error={!!errors.owner_signature}
                  className="italic"
                />
              </FormField>

              <FormField label="Date signed" error={errors.signed_date?.message} required>
                <TextInput
                  {...register("signed_date")}
                  type="date"
                  error={!!errors.signed_date}
                />
              </FormField>

              {showSignerTitle && (
                <FormField label="Signer title or capacity" hint="e.g. Trustee, President">
                  <TextInput
                    {...register("signer_title")}
                    placeholder="Trustee"
                  />
                </FormField>
              )}
            </div>
          </div>
        </PPSectionCard>
      </div>

      <PPStepFooter
        onContinue={handleSubmit(onValid)}
        continueDisabled={!canSubmit}
        isLastStep
      />
    </form>
  );
}


