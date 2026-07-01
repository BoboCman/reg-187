"use client";
import { PP_STEP_META, PP_STEP_COUNT, usePPWizard } from "@/lib/policyplan/wizard-context";
import { PPProgressRail } from "@/components/policyplan/PPProgressRail";
import { PPConfirmationScreen } from "@/components/policyplan/PPConfirmationScreen";

import { PPStep1InsuredOwner } from "@/components/policyplan/steps/PPStep1InsuredOwner";
import { PPStep2Objectives } from "@/components/policyplan/steps/PPStep2Objectives";
import { PPStep3Financial } from "@/components/policyplan/steps/PPStep3Financial";
import { PPStep4ExistingCoverage } from "@/components/policyplan/steps/PPStep4ExistingCoverage";
import { PPStep5RiskPreferences } from "@/components/policyplan/steps/PPStep5RiskPreferences";
import { PPStep6PolicySpecs } from "@/components/policyplan/steps/PPStep6PolicySpecs";
import { PPStep7Attestation } from "@/components/policyplan/steps/PPStep7Attestation";

const STEPS = [
  PPStep1InsuredOwner,
  PPStep2Objectives,
  PPStep3Financial,
  PPStep4ExistingCoverage,
  PPStep5RiskPreferences,
  PPStep6PolicySpecs,
  PPStep7Attestation,
];

export function PPWizardShell() {
  const { step, submittedIntake } = usePPWizard();

  if (submittedIntake) {
    return <PPConfirmationScreen intake={submittedIntake} />;
  }

  const meta = PP_STEP_META[step - 1];
  const StepComponent = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4 mb-1">
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-[var(--color-text-muted)]">
                Insurance Planner AI Professional
              </p>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                PolicyPlan
              </p>
            </div>
            <span className="text-xs text-[var(--color-text-muted)] shrink-0">
              Step {step} of {PP_STEP_COUNT}
            </span>
          </div>
          <div className="mt-4">
            <PPProgressRail />
          </div>
        </div>
      </header>

      {/* Step content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] text-balance">
            {meta.label}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {meta.subtitle}
          </p>
        </div>
        <StepComponent />
      </main>
    </div>
  );
}
