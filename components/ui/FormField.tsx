import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  horizontal?: boolean;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
  horizontal,
}: Props) {
  return (
    <div className={cn(horizontal ? "flex items-center gap-4" : "flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className={cn(
          "text-sm font-medium text-[var(--color-text-primary)]",
          horizontal && "shrink-0 w-48"
        )}
      >
        {label}
        {required && <span className="ml-0.5 text-[var(--color-error)]" aria-hidden>*</span>}
      </label>
      <div className="flex-1">
        {children}
        {hint && !error && (
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>
        )}
        {error && (
          <p className="mt-1 text-xs text-[var(--color-error)]" role="alert">{error}</p>
        )}
      </div>
    </div>
  );
}
