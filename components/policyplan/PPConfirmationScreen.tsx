"use client";
import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LayoutList } from "lucide-react";
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
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors font-medium"
          >
            Start new intake
          </button>
        }
      />

      {/* Submitted banner */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: confirmation identity */}
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] shrink-0" />
              <div>
                <p className="text-base font-semibold text-[var(--color-text-primary)]">
                  Intake submitted
                </p>
                {submittedIntakeId && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 font-mono">
                    {submittedIntakeId.slice(0, 8).toUpperCase()}
                  </p>
                )}
              </div>
            </div>

            {/* Right: primary + secondary CTAs */}
            <div className="flex items-center gap-3 flex-wrap">
              {submittedIntakeId && (
                <Link
                  href={`/cases/${submittedIntakeId}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-semibold transition-colors"
                >
                  Open case and begin review
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-readonly-bg)] transition-colors"
              >
                <LayoutList className="w-4 h-4" />
                Return to cases
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <PPCaseReview intake={intake} caseId={submittedIntakeId} />
      </main>
    </div>
  );
}
