"use client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  attestationSchema,
  ATTESTATION_TEXT,
  deriveFundingCapacity,
  inferDesignEmphasis,
  policyPlanIntakeSchema,
  type Attestation,
  type PolicyPlanIntake,
  type PolicySpecs,
} from "@/lib/policyplan/schema";
import { detectSuitabilityTensions } from "@/lib/policyplan/rules";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { createClient } from "@/lib/supabase/client";
import { PPStepFooter } from "@/components/policyplan/PPStepWrapper";
import { FormField } from "@/components/ui/FormField";
import { TextInput, TextArea } from "@/components/ui/inputs";
import { today } from "@/lib/utils";
import { cn } from "@/lib/utils";

type AttestationDefaults = {
  confirmed?: true;
  owner_signature?: string;
  signed_date?: string;
  signer_title?: string;
};

export function PPStep7Attestation() {
  const { formData, patch, markComplete, setSubmittedIntake, setSubmittedIntakeId } = usePPWizard();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<PolicyPlanIntake | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
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

  async function persistIntake(validatedIntake: PolicyPlanIntake) {
    setSaveError(null);
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated session. Please sign in and try again.");

      const emphasis = inferDesignEmphasis({
        objectives: validatedIntake.objectives,
        risk_preferences: validatedIntake.risk_preferences,
        policy_specs: validatedIntake.policy_specs,
      });
      const suitability_flags = detectSuitabilityTensions(validatedIntake, emphasis);

      const cols = validatedIntake.financial?.columns;
      const presentCols = [cols?.client_1, cols?.client_2, cols?.joint].filter(
        (c): c is NonNullable<typeof c> => c != null
      );
      const liquid_net_worth = presentCols.reduce(
        (sum, c) => sum + deriveFundingCapacity(c).primary_capacity,
        0
      );

      const { data, error } = await supabase
        .from("policyplan_intakes")
        .insert({
          advisor_id: user.id,
          schema_version: validatedIntake.schema_version,
          primary_objective: validatedIntake.objectives.primary,
          ownership_type: validatedIntake.insured_owner.ownership_type,
          status: "submitted",
          payload: validatedIntake,
          emphasis,
          suitability_flags,
          liquid_net_worth,
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      setSubmittedIntakeId(data.id);
      markComplete(7);
      setSubmittedIntake(validatedIntake);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setSaveError(message);
      setPendingPayload(validatedIntake);
    } finally {
      setIsSaving(false);
    }
  }

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
      patch({ attestation: attestationData, notes: formData.notes });
      persistIntake(result.data);
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
      {/* Save failure — always above everything else */}
      {saveError && (
        <div className="mb-5 rounded-lg border border-red-300 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700 mb-1">
            Save failed — your intake has not been recorded
          </p>
          <p className="text-sm text-red-600 mb-3">{saveError}</p>
          {pendingPayload && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => persistIntake(pendingPayload)}
              className="inline-flex items-center px-4 py-2 rounded-md bg-red-700 hover:bg-red-800 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {isSaving ? "Retrying…" : "Retry save"}
            </button>
          )}
        </div>
      )}

      <p className="text-sm text-[var(--color-text-secondary)] mb-6">
        Review your notes, read the attestation statement, confirm, and sign.
      </p>

      <div className="space-y-5">
        {/* Additional notes — collapsible, visually secondary */}
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
          <button
            type="button"
            onClick={() => setNotesOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--color-readonly-bg)] transition-colors text-left"
            aria-expanded={notesOpen}
          >
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              Additional notes
              <span className="text-xs text-[var(--color-text-muted)] ml-2 font-normal">Optional</span>
            </span>
            {notesOpen ? (
              <ChevronUp size={15} className="text-[var(--color-text-muted)]" />
            ) : (
              <ChevronDown size={15} className="text-[var(--color-text-muted)]" />
            )}
          </button>
          {notesOpen && (
            <div className="border-t border-[var(--color-border)] px-5 pb-5 pt-4">
              <TextArea
                value={formData.notes ?? ""}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="Relevant context, health disclosures, planning considerations..."
                rows={4}
              />
            </div>
          )}
        </div>

        {/* Sign-off card — the main event */}
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-readonly-bg)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Best-interest attestation
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Read, confirm, and sign before submitting.
            </p>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Zone 1 — Statement */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
                Statement
              </p>
              <div className="rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] px-5 py-5">
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {ATTESTATION_TEXT}
                </p>
              </div>
            </div>

            {/* Zone 2 — Confirmation */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
                Confirmation
              </p>
              <div
                className={cn(
                  "rounded-lg border px-5 py-4 transition-colors",
                  confirmed === true
                    ? "border-[var(--color-success)] bg-[var(--color-success-light)]"
                    : "border-[var(--color-border-strong)] bg-[var(--color-surface)]"
                )}
              >
                <label className="flex items-start gap-4 cursor-pointer">
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
                  <span className="text-sm font-medium text-[var(--color-text-primary)] leading-relaxed">
                    I have read the above statement and affirm that it is accurate and complete.
                  </span>
                </label>
                {(errors.confirmed as { message?: string } | undefined)?.message && (
                  <p className="text-xs text-[var(--color-error)] mt-2 ml-9">
                    {(errors.confirmed as { message?: string }).message}
                  </p>
                )}
              </div>
            </div>

            {/* Zone 3 — Signature */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
                Signature
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Signature (type full name)"
                  error={errors.owner_signature?.message}
                  required
                  className={showSignerTitle ? "" : "sm:col-span-1"}
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
                  <FormField
                    label="Signer title or capacity"
                    hint="e.g. Trustee, President"
                    className="sm:col-span-2"
                  >
                    <TextInput {...register("signer_title")} placeholder="Trustee" />
                  </FormField>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PPStepFooter
        onContinue={handleSubmit(onValid)}
        continueDisabled={!canSubmit || isSaving}
        isLastStep
        continueLabel={isSaving ? "Saving…" : undefined}
      />
    </form>
  );
}
