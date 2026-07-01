"use client";
import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  className,
  id,
}: Props<T>) {
  return (
    <div
      id={id}
      role="group"
      className={cn(
        "inline-flex rounded border border-[var(--color-border-strong)] overflow-hidden",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors min-h-[44px] min-w-[80px]",
              i > 0 && "border-l border-[var(--color-border-strong)]",
              active
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-light)]"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
