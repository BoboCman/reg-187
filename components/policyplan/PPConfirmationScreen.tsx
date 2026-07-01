"use client";
import React from "react";
import { type PolicyPlanIntake } from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PPCaseReview } from "@/components/policyplan/PPCaseReview";

export function PPConfirmationScreen({ intake }: { intake: PolicyPlanIntake }) {
  const { setSubmittedIntake, setStep, submittedIntakeId } = usePPWizard();

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[var(--color-text-muted)]">
              Insurance Planner AI Professional
            </p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">
              PolicyPlan — Intake submitted
            </p>
            {submittedIntakeId && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 font-mono">
                Case ID: {submittedIntakeId}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSubmittedIntake(null);
              setStep(1);
            }}
            className="text-sm text-[var(--color-accent)] hover:underline font-medium"
          >
            Start new intake
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <PPCaseReview intake={intake} caseId={submittedIntakeId} />
      </main>
    </div>
  );
}
