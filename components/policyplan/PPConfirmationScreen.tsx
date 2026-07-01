"use client";
import React from "react";
import { type PolicyPlanIntake } from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PPCaseReview } from "@/components/policyplan/PPCaseReview";
import { AppNav } from "@/components/AppNav";

export function PPConfirmationScreen({ intake }: { intake: PolicyPlanIntake }) {
  const { setSubmittedIntake, setStep, submittedIntakeId } = usePPWizard();

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AppNav
        rightSlot={
          <button
            type="button"
            onClick={() => {
              setSubmittedIntake(null);
              setStep(1);
            }}
            className="text-xs text-[var(--color-accent)] hover:underline font-semibold"
          >
            Start new intake
          </button>
        }
      />

      {/* Submitted banner */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-base font-semibold text-[var(--color-text-primary)]">
            Intake submitted
          </p>
          {submittedIntakeId && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 font-mono">
              Case ID: {submittedIntakeId}
            </p>
          )}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <PPCaseReview intake={intake} caseId={submittedIntakeId} />
      </main>
    </div>
  );
}
