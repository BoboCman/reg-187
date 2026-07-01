"use client";
import { ProgressRail } from "@/components/ProgressRail";
import { STEP_META, STEP_COUNT, useWizard } from "@/lib/wizard-context";

import { Step1InsuredInfo } from "@/components/steps/Step1InsuredInfo";
import { Step2Financial } from "@/components/steps/Step2Financial";
import { Step3ExistingInsurance } from "@/components/steps/Step3ExistingInsurance";
import { Step4Objectives } from "@/components/steps/Step4Objectives";
import { Step5PolicySpecs } from "@/components/steps/Step5PolicySpecs";
import { Step6DesignPriorities } from "@/components/steps/Step6DesignPriorities";
import { Step7RiskTolerance } from "@/components/steps/Step7RiskTolerance";
import { Step8Attestation } from "@/components/steps/Step8Attestation";
import { ConfirmationScreen } from "@/components/ConfirmationScreen";

const STEPS = [
  Step1InsuredInfo,
  Step2Financial,
  Step3ExistingInsurance,
  Step4Objectives,
  Step5PolicySpecs,
  Step6DesignPriorities,
  Step7RiskTolerance,
  Step8Attestation,
];

export function WizardShell() {
  const { step, submittedIntake } = useWizard();

  if (submittedIntake) {
    return <ConfirmationScreen intake={submittedIntake} />;
  }

  const meta = STEP_META[step - 1];
  const StepComponent = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4 mb-1">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-[var(--color-text-muted)]">
                Life Insurance Design Questionnaire
              </p>
            </div>
            <span className="text-xs text-[var(--color-text-muted)] shrink-0">
              Step {step} of {STEP_COUNT}
            </span>
          </div>
          <div className="mt-4">
            <ProgressRail />
          </div>
        </div>
      </header>

      {/* Step content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Step title */}
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
