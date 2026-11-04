"use client";
import { PP_STEP_META, PP_STEP_COUNT, usePPWizard } from "@/lib/policyplan/wizard-context";

import { PPProgressRail } from "@/components/policyplan/PPProgressRail";
import { PPConfirmationScreen } from "@/components/policyplan/PPConfirmationScreen";
import { AppNav } from "@/components/AppNav";
import { PPUploadIllustration } from "@/components/policyplan/PPUploadIllustration";

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
  const { step, submittedIntake, uploadDone } = usePPWizard();

  if (submittedIntake) {
    return <PPConfirmationScreen intake={submittedIntake} />;
  }

  if (!uploadDone) {
    return (
      <div className="min-h-screen bg-[var(--color-background)]">
        <AppNav hideNewIntake />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="max-w-2xl mx-auto mb-8">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-accent)]">Step 1 of 3</p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)] text-balance">
              Upload the proposed illustration
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              The letter is built from this illustration and the client profile you fill in next.
            </p>
          </div>
          <PPUploadIllustration />
        </main>
      </div>
    );
  }

  const meta = PP_STEP_META[step - 1];
  const StepComponent = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AppNav
        hideNewIntake
        rightSlot={
          <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
            Step {step} of {PP_STEP_COUNT}
          </span>
        }
      />

      {/* Progress rail — second sticky strip below the nav */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-14 z-20 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <PPProgressRail />
        </div>
      </div>

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
