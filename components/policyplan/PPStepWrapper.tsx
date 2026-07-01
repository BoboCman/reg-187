"use client";
import { cn } from "@/lib/utils";
import { PP_STEP_COUNT, usePPWizard } from "@/lib/policyplan/wizard-context";
import type { ReactNode } from "react";

interface StepFooterProps {
  onContinue: () => void;
  continueDisabled?: boolean;
  isLastStep?: boolean;
  continueLabel?: string;
}

export function PPStepFooter({ onContinue, continueDisabled, isLastStep, continueLabel }: StepFooterProps) {
  const { step, goBack } = usePPWizard();
  const last = isLastStep ?? step === PP_STEP_COUNT;

  return (
    <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex items-center justify-between gap-4">
      <div>
        {step > 1 && (
          <button
            type="button"
            onClick={goBack}
            className="px-5 py-2.5 rounded border border-[var(--color-border-strong)] text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface)] hover:bg-[var(--color-background)] transition-colors min-h-[44px]"
          >
            Back
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-[var(--color-text-muted)] hidden sm:block">
          Step {step} of {PP_STEP_COUNT}
        </span>
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled}
          className={cn(
            "px-6 py-2.5 rounded text-sm font-semibold transition-colors min-h-[44px]",
            last
              ? "bg-[var(--color-success)] text-white hover:brightness-105"
              : "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]",
            continueDisabled && "opacity-40 cursor-not-allowed pointer-events-none"
          )}
        >
          {continueLabel ?? (last ? "Review and submit" : "Continue")}
        </button>
      </div>
    </div>
  );
}

export function PPSectionCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6",
        className
      )}
    >
      {title && (
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-5">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
