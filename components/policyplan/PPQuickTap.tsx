"use client";
import { cn } from "@/lib/utils";

export type TapOption<T extends string> = { value: T; label: string };

/** One question answered with a single tap. Used on the short profile cards. */
export function PPQuickTap<T extends string>({
  question,
  hint,
  options,
  value,
  onChange,
  invalid,
}: {
  question: string;
  hint?: string;
  options: TapOption<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  invalid?: boolean;
}) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <p className={cn("text-sm font-medium", invalid ? "text-[var(--color-error)]" : "text-[var(--color-text-primary)]")}>
        {question}
      </p>
      {hint && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={question}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={cn(
                "min-h-[40px] rounded-full border px-4 text-sm transition-colors",
                on
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                  : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
