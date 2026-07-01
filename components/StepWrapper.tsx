"use client";
import { cn } from "@/lib/utils";
import { STEP_COUNT, useWizard } from "@/lib/wizard-context";
import type { ReactNode } from "react";

interface FooterProps {
  onContinue: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
  isLastStep?: boolean;
}

export function StepFooter({
  onContinue,
  continueDisabled,
  isLastStep,
}: FooterProps) {
  const { step, goBack } = useWizard();
  const last = isLastStep ?? step === STEP_COUNT;

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
        {last ? "Review and submit" : "Continue"}
      </button>
    </div>
  );
}

export function SectionCard({
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
