"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deriveFundingCapacity,
  inferDesignEmphasis,
  policyPlanIntakeSchema,
  type PolicyPlanIntake,
} from "@/lib/policyplan/schema";
import { detectSuitabilityTensions } from "@/lib/policyplan/rules";
import { usePPWizard, type PPFormData } from "@/lib/policyplan/wizard-context";
import { createClient } from "@/lib/supabase/client";

/**
 * Final step of the profile: validate, save the intake (with the redacted
 * illustration), start letter generation, and open the case.
 * Replaces the old Step 7 (attestation) submit; the producer now attests on
 * the letter, not on the intake.
 */
export function useSubmitIntake() {
  const router = useRouter();
  const { formData, illustration, setSubmittedIntakeId } = usePPWizard();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (overrides: Partial<PPFormData> = {}) => {
      setError(null);
      const data = { ...formData, ...overrides };
      const parsed = policyPlanIntakeSchema.safeParse({
        insured_owner: data.insured_owner,
        objectives: data.objectives,
        financial: data.financial,
        existing_coverage: data.existing_coverage,
        risk_preferences: data.risk_preferences,
        policy_specs: data.policy_specs,
        notes: data.notes,
      });
      if (!parsed.success) {
        const first = parsed.error.errors[0];
        setError(
          `Some answers are missing: ${first?.path.join(" › ") || "profile"} — ${first?.message ?? "invalid"}`
        );
        return;
      }
      const intake: PolicyPlanIntake = parsed.data;

      setIsSaving(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Your session has ended. Please sign in again.");

        const emphasis = inferDesignEmphasis({
          objectives: intake.objectives,
          risk_preferences: intake.risk_preferences,
          policy_specs: intake.policy_specs,
        });
        const suitability_flags = detectSuitabilityTensions(intake, emphasis);
        const cols = intake.financial?.columns;
        const liquid_net_worth = [cols?.client_1, cols?.client_2, cols?.joint]
          .filter((c): c is NonNullable<typeof c> => c != null)
          .reduce((sum, c) => sum + deriveFundingCapacity(c).primary_capacity, 0);

        const { data: row, error: insertError } = await supabase
          .from("policyplan_intakes")
          .insert({
            advisor_id: user.id,
            schema_version: intake.schema_version,
            primary_objective: intake.objectives.primary,
            ownership_type: intake.insured_owner.ownership_type,
            status: "submitted",
            payload: intake,
            emphasis,
            suitability_flags,
            liquid_net_worth,
            illustration: illustration
              ? {
                  filename: illustration.filename,
                  size_bytes: illustration.size_bytes,
                  page_count: illustration.page_count,
                  redaction_counts: illustration.redaction_counts,
                  extracted_at: illustration.extracted_at,
                }
              : null,
            illustration_text: illustration?.text ?? null,
          })
          .select("id")
          .single();
        if (insertError || !row) throw new Error(insertError?.message ?? "Could not save the case.");

        setSubmittedIntakeId(row.id);

        // Start the letter. If the trigger fails, the case page offers a retry.
        await fetch("/api/policyplan/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intake_id: row.id }),
        }).catch(() => undefined);

        router.push(`/cases/${row.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setIsSaving(false);
      }
    },
    [formData, illustration, router, setSubmittedIntakeId]
  );

  return { submit, isSaving, error };
}
