"use client";
import { cn } from "@/lib/utils";
import { parseMoney, formatMoney } from "@/lib/utils";
import { useState, useEffect } from "react";
import type { InputHTMLAttributes } from "react";

const baseInput =
  "w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-[var(--color-accent)] transition-colors min-h-[44px]";

const readonlyInput =
  "w-full rounded border border-[var(--color-border)] bg-[var(--color-readonly-bg)] px-3 py-2.5 text-sm text-[var(--color-readonly-text)] text-right font-medium min-h-[44px] flex items-center";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function TextInput({ className, error, ...props }: TextInputProps) {
  return (
    <input
      className={cn(
        baseInput,
        error && "border-[var(--color-error)] focus:ring-red-200",
        className
      )}
      {...props}
    />
  );
}

export function TextArea({
  className,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      rows={4}
      className={cn(
        baseInput,
        "resize-y",
        error && "border-[var(--color-error)] focus:ring-red-200",
        className
      )}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({ className, error, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        baseInput,
        "bg-[var(--color-surface)]",
        error && "border-[var(--color-error)] focus:ring-red-200",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/** Formatted money input — displays with commas, stores raw number via onChange(number|undefined) */
interface MoneyInputProps {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  error?: boolean;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function MoneyInput({
  value,
  onChange,
  placeholder = "0",
  error,
  id,
  disabled,
  className,
}: MoneyInputProps) {
  const [raw, setRaw] = useState(() => (value != null ? formatMoney(value) : ""));

  // Keep raw in sync when value changes externally (e.g. sample case load)
  useEffect(() => {
    setRaw(value != null ? formatMoney(value) : "");
  }, [value]);

  return (
    <div className="relative">
      <span className="absolute inset-y-0 left-3 flex items-center text-sm text-[var(--color-text-muted)] pointer-events-none select-none">
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={raw}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          setRaw(v);
          onChange(parseMoney(v));
        }}
        onBlur={() => {
          const n = parseMoney(raw);
          setRaw(n != null ? formatMoney(n) : "");
          onChange(n);
        }}
        className={cn(
          baseInput,
          "pl-7 text-right",
          error && "border-[var(--color-error)] focus:ring-red-200",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
      />
    </div>
  );
}

/** Read-only derived total row */
export function ReadonlyMoney({
  value,
  label,
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn(readonlyInput, className)}>
      {label && <span className="flex-1 text-left text-[var(--color-text-muted)]">{label}</span>}
      <span>
        ${Math.round(value).toLocaleString("en-US")}
      </span>
    </div>
  );
}

/** Percent input */
interface PercentInputProps {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  id?: string;
  error?: boolean;
  placeholder?: string;
  className?: string;
}

export function PercentInput({
  value,
  onChange,
  id,
  error,
  placeholder = "0",
  className,
}: PercentInputProps) {
  const [raw, setRaw] = useState(() => (value != null ? String(value) : ""));

  useEffect(() => {
    setRaw(value != null ? String(value) : "");
  }, [value]);

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={raw}
        placeholder={placeholder}
        onChange={(e) => {
          setRaw(e.target.value);
          const n = parseFloat(e.target.value);
          onChange(isNaN(n) ? undefined : n);
        }}
        onBlur={() => {
          const n = parseFloat(raw);
          if (!isNaN(n)) {
            setRaw(String(n));
            onChange(n);
          } else {
            setRaw("");
            onChange(undefined);
          }
        }}
        className={cn(
          baseInput,
          "pr-8 text-right",
          error && "border-[var(--color-error)] focus:ring-red-200",
          className
        )}
      />
      <span className="absolute inset-y-0 right-3 flex items-center text-sm text-[var(--color-text-muted)] pointer-events-none select-none">
        %
      </span>
    </div>
  );
}
