"use client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEP_META, STEP_COUNT } from "@/lib/wizard-context";
import { useWizard } from "@/lib/wizard-context";

export function ProgressRail() {
  const { step, setStep, completed } = useWizard();

  return (
    <nav aria-label="Form progress" className="w-full">
      <ol className="flex items-start justify-between relative">
        {/* Connecting line behind nodes */}
        <div
          className="absolute top-[18px] left-0 right-0 h-px bg-[var(--color-border-strong)] z-0"
          aria-hidden
        />
        {Array.from({ length: STEP_COUNT }, (_, i) => {
          const num = i + 1;
          const isActive = num === step;
          const isDone = completed.has(num) && num !== step;
          const isClickable = isDone || completed.has(num - 1) || num === 1;

          return (
            <li
              key={num}
              className="flex flex-col items-center gap-2 z-10 flex-1"
            >
              <button
                type="button"
                onClick={() => isClickable && setStep(num)}
                disabled={!isClickable}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Step ${num}: ${STEP_META[i].label}${isDone ? " (complete)" : ""}`}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
                  isActive &&
                    "bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-md",
                  isDone &&
                    "bg-[var(--color-accent)] border-[var(--color-accent)] text-white cursor-pointer hover:brightness-110",
                  !isActive &&
                    !isDone &&
                    isClickable &&
                    "bg-[var(--color-surface)] border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent-light)]",
                  !isActive &&
                    !isDone &&
                    !isClickable &&
                    "bg-[var(--color-surface)] border-[var(--color-border-strong)] text-[var(--color-text-disabled)] cursor-not-allowed"
                )}
              >
                {isDone ? <Check size={16} strokeWidth={2.5} /> : num}
              </button>
              <span
                className={cn(
                  "text-xs text-center leading-tight hidden sm:block w-16",
                  isActive
                    ? "text-[var(--color-accent)] font-semibold"
                    : isDone
                    ? "text-[var(--color-text-secondary)]"
                    : "text-[var(--color-text-muted)]"
                )}
              >
                {STEP_META[i].label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
