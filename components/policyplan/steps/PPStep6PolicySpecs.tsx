"use client";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Pencil, Check } from "lucide-react";
import {
  policySpecsSchema,
  deathBenefitScaleEnum,
  premiumScaleEnum,
  type PolicySpecs,
} from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PPStepFooter } from "@/components/policyplan/PPStepWrapper";
import { MoneyInput, TextInput } from "@/components/ui/inputs";
import { cn } from "@/lib/utils";

/* ── Labels ─────────────────────────────────────────────────────────────── */

const DB_SCALE_LABELS: Record<string, string> = {
  "10_years": "10 years",
  "20_years": "20 years",
  "30_years": "30 years",
  life_expectancy: "Life expectancy",
  age_100: "Age 100",
  beyond_age_100: "Beyond age 100",
};

const PREMIUM_SCALE_LABELS: Record<string, string> = {
  "1_year": "1 year",
  "5_years": "5 years",
  "10_years": "10 years",
  "20_years": "20 years",
  life_expectancy: "Life expectancy",
  all_years: "All years (lifetime)",
};

function fmtMoney(v: number | undefined | null): string {
  if (v == null) return "Not set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function durationLabel(
  v: { mode: "age"; age: number } | { mode: "scale"; scale_point: string } | undefined,
  scaleLabels: Record<string, string>
): string {
  if (!v) return "Not set";
  if (v.mode === "age") return `Age ${v.age}`;
  return scaleLabels[v.scale_point] ?? v.scale_point;
}

/* ── Amount chips + increments per field ────────────────────────────────── */

const AMOUNT_CHIPS: Record<string, number[]> = {
  desired_death_benefit: [100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000],
  desired_premium:       [2_500, 5_000, 10_000, 25_000, 50_000, 100_000],
};

const AMOUNT_INCREMENT: Record<string, number> = {
  desired_death_benefit: 50_000,
  desired_premium:       2_500,
};

function chipLabel(v: number): string {
  if (v >= 1_000_000) return `$${v / 1_000_000}M`;
  if (v >= 1_000) return `$${v / 1_000}k`;
  return `$${v}`;
}

/* ── Amount picker (portal) — mirrors PPAmountPicker in Step 3 ───────────── */

function AmountPicker({
  fieldKey,
  label,
  value,
  onChange,
  onClose,
}: {
  fieldKey: string;
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined, status: "estimated" | "exact") => void;
  onClose: () => void;
}) {
  const chips = AMOUNT_CHIPS[fieldKey] ?? [100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000];
  const increment = AMOUNT_INCREMENT[fieldKey] ?? 50_000;
  const [localValue, setLocalValue] = useState<number | undefined>(value);
  const [showExact, setShowExact] = useState(false);
  const exactWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalValue(value); }, [value]);

  useEffect(() => {
    if (!showExact) return;
    const input = exactWrapRef.current?.querySelector("input");
    if (input) requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }, [showExact]);

  const step = (delta: number) => {
    const next = Math.max(0, (localValue ?? 0) + delta);
    setLocalValue(next);
    onChange(next, "estimated");
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-lg overflow-hidden">
      <div className="px-5 pt-5 pb-4 space-y-4">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</p>

        {/* Quick estimate chips */}
        <div>
          <p className="text-xs text-[var(--color-text-muted)] mb-2 uppercase tracking-wide font-medium">Quick estimate</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => { setLocalValue(undefined); onChange(undefined, "estimated"); }}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium border transition-colors",
                localValue == null
                  ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                  : "bg-[var(--color-readonly-bg,#f8f9fa)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              )}
            >None</button>
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setLocalValue(c); onChange(c, "estimated"); }}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium border transition-colors",
                  localValue === c
                    ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                    : "bg-[var(--color-readonly-bg,#f8f9fa)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                )}
              >{chipLabel(c)}</button>
            ))}
          </div>
        </div>

        {/* Stepper */}
        <div>
          <p className="text-xs text-[var(--color-text-muted)] mb-2 uppercase tracking-wide font-medium">Adjust</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => step(-increment)}
              className="w-10 h-10 rounded border border-[var(--color-border)] bg-[var(--color-readonly-bg,#f8f9fa)] text-[var(--color-text-primary)] font-semibold text-lg flex items-center justify-center hover:bg-[var(--color-background)] transition-colors"
            >−</button>
            <span className="flex-1 text-center text-base font-semibold tabular-nums text-[var(--color-text-primary)]">
              {localValue != null ? `$${localValue.toLocaleString("en-US")}` : "—"}
            </span>
            <button
              type="button"
              onClick={() => step(+increment)}
              className="w-10 h-10 rounded border border-[var(--color-border)] bg-[var(--color-readonly-bg,#f8f9fa)] text-[var(--color-text-primary)] font-semibold text-lg flex items-center justify-center hover:bg-[var(--color-background)] transition-colors"
            >+</button>
          </div>
        </div>

        {/* Exact entry toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowExact((v) => !v)}
            className="text-xs text-[var(--color-accent)] hover:underline font-medium"
          >
            {showExact ? "Hide exact entry" : "Enter exact amount"}
          </button>
          {showExact && (
            <div ref={exactWrapRef} className="mt-2">
              <MoneyInput
                value={localValue}
                onChange={(v) => {
                  setLocalValue(v);
                  onChange(v, "exact");
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer — Done */}
      <div className="border-t border-[var(--color-border)] px-5 py-3 flex items-center justify-between gap-3 bg-[var(--color-readonly-bg,#f8f9fa)]">
        <span className="text-xs text-[var(--color-text-muted)]">Updates apply immediately</span>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Check className="w-3.5 h-3.5" />
          Done
        </button>
      </div>
    </div>
  );
}

/* ── ModeFirstDuration ───────────────────────────────────────────────────── */

type DurationValue =
  | { mode: "age"; age: number }
  | { mode: "scale"; scale_point: string }
  | undefined;

function ModeFirstDuration({
  scaleOptions,
  scaleLabels,
  value,
  onChange,
}: {
  scaleOptions: readonly string[];
  scaleLabels: Record<string, string>;
  value: DurationValue;
  onChange: (v: DurationValue) => void;
}) {
  // Derive chosen mode from value; default to "scale" when nothing set.
  const [selectedMode, setSelectedMode] = useState<"scale" | "age">(
    value?.mode === "age" ? "age" : "scale"
  );
  const [ageInput, setAgeInput] = useState(
    value?.mode === "age" ? String(value.age) : ""
  );

  // Re-sync when value changes externally (reset / load).
  useEffect(() => {
    if (value?.mode === "age") {
      setSelectedMode("age");
      setAgeInput(String(value.age));
    } else if (value?.mode === "scale") {
      setSelectedMode("scale");
      setAgeInput("");
    } else {
      setAgeInput("");
    }
  }, [value]);

  const handleModeSwitch = (mode: "scale" | "age") => {
    setSelectedMode(mode);
    if (mode === "scale") {
      setAgeInput("");
      onChange(undefined); // clear so user must pick a scale point
    } else {
      onChange(undefined); // clear scale; wait for age entry
    }
  };

  const activeScale = value?.mode === "scale" ? value.scale_point : null;

  return (
    <div className="space-y-3">
      {/* Mode selector */}
      <div className="flex gap-2">
        {(["scale", "age"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeSwitch(m)}
            className={cn(
              "px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors",
              selectedMode === m
                ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            )}
          >
            {m === "scale" ? "Standard duration points" : "Specific age"}
          </button>
        ))}
      </div>

      {/* Scale chips — shown only in scale mode */}
      {selectedMode === "scale" && (
        <div className="flex flex-wrap gap-2 pt-1">
          {scaleOptions.map((pt) => (
            <button
              key={pt}
              type="button"
              onClick={() => onChange({ mode: "scale", scale_point: pt })}
              className={cn(
                "px-3 py-2 rounded border text-sm font-medium transition-colors min-h-[38px]",
                activeScale === pt
                  ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              )}
            >
              {scaleLabels[pt]}
            </button>
          ))}
        </div>
      )}

      {/* Age input — shown only in age mode */}
      {selectedMode === "age" && (
        <div className="flex items-center gap-3 pt-1">
          <input
            type="number"
            min={0}
            max={120}
            value={ageInput}
            placeholder="e.g. 95"
            onChange={(e) => {
              const raw = e.target.value;
              setAgeInput(raw);
              const n = parseInt(raw, 10);
              if (!isNaN(n) && n >= 0 && n <= 120) {
                onChange({ mode: "age", age: n });
              } else if (raw === "") {
                onChange(undefined);
              }
            }}
            className="w-28 rounded border px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] min-h-[38px] bg-[var(--color-surface)] border-[var(--color-border)]"
          />
          <span className="text-sm text-[var(--color-text-muted)]">years old (attained age)</span>
        </div>
      )}
    </div>
  );
}

/* ── PrimaryTargetCard — trigger row + portal picker (mirrors Step 3) ────── */

function PrimaryTargetCard({
  fieldKey,
  title,
  description,
  amountLabel,
  durationLabel: durationTitle,
  amount,
  amountStatus,
  onAmountChange,
  durationControl,
}: {
  fieldKey: string;
  title: string;
  description: string;
  amountLabel: string;
  durationLabel: string;
  amount: number | undefined;
  amountStatus: "estimated" | "exact";
  onAmountChange: (v: number | undefined, status: "estimated" | "exact") => void;
  durationControl: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 12;
    const pickerHeight = 400;
    const maxPickerWidth = 480;
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < pickerHeight && rect.top > pickerHeight;
    const pickerW = Math.min(Math.max(rect.width, 320), maxPickerWidth, window.innerWidth - margin * 2);
    const clampedLeft = Math.min(Math.max(rect.left, margin), window.innerWidth - pickerW - margin);
    setPickerStyle({
      position: "fixed",
      left: clampedLeft,
      width: pickerW,
      ...(above ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [isOpen, reposition]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || pickerRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [isOpen]);

  const displayValue = amount != null ? `$${Math.round(amount).toLocaleString("en-US")}` : null;

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
      {/* Card header */}
      <div className="px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
      </div>

      <div className="px-5 py-5 space-y-6">
        {/* Amount trigger row — collapses to label+value+badge+pencil; opens picker on click */}
        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">{amountLabel}</p>
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setIsOpen((v) => !v)}
              aria-expanded={isOpen}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left group",
                isOpen
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] ring-2 ring-[var(--color-accent-ring)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)]"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[15px] leading-snug tabular-nums font-semibold",
                  displayValue ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)] font-normal"
                )}>
                  {displayValue ?? "Not set"}
                </p>
              </div>
              {displayValue && (
                <span className={cn(
                  "shrink-0 text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-full",
                  amountStatus === "exact"
                    ? "text-[var(--color-success,#2e7d32)] bg-[var(--color-success-light,#e8f5e9)]"
                    : "text-amber-600 bg-amber-50"
                )}>
                  {amountStatus === "exact" ? "Exact" : "Estimated"}
                </span>
              )}
              <Pencil className={cn(
                "w-3.5 h-3.5 shrink-0 transition-colors opacity-40 group-hover:opacity-70",
                isOpen ? "text-[var(--color-accent)] opacity-100" : "text-[var(--color-text-muted)]"
              )} />
            </button>

            {typeof document !== "undefined" && isOpen && createPortal(
              <div ref={pickerRef} style={pickerStyle}>
                <AmountPicker
                  fieldKey={fieldKey}
                  label={amountLabel}
                  value={amount}
                  onChange={(v, s) => { onAmountChange(v, s); }}
                  onClose={() => setIsOpen(false)}
                />
              </div>,
              document.body
            )}
          </div>
        </div>

        {/* Duration — always visible below the trigger row */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">{durationTitle}</p>
          {durationControl}
        </div>
      </div>
    </div>
  );
}

/* ── OptionalTargetCard ──────────────────────────────────────────────────── */

function OptionalTargetCard({
  title,
  explanation,
  isActive,
  summary,
  onAdd,
  onRemove,
  children,
}: {
  title: string;
  explanation: string;
  isActive: boolean;
  summary: string | null;
  onAdd: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
      {/* Header row */}
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
          {!isActive && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{explanation}</p>
          )}
          {isActive && summary && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-medium">{summary}</p>
          )}
        </div>
        {!isActive ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent)] hover:underline shrink-0"
          >
            <Plus size={13} />
            Add target
          </button>
        ) : (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-danger,#d32f2f)] transition-colors shrink-0"
            aria-label="Remove target"
          >
            <X size={13} />
            Remove
          </button>
        )}
      </div>

      {/* Fields — only when active */}
      {isActive && (
        <div className="border-t border-[var(--color-border)] px-5 py-5">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── AgeInput helper ─────────────────────────────────────────────────────── */

function AgeInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      type="number"
      min={0}
      max={120}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? undefined : parseInt(raw, 10));
      }}
    />
  );
}

/* ── Main step component ─────────────────────────────────────────────────── */

export function PPStep6PolicySpecs() {
  const { formData, patch, markComplete, goNext } = usePPWizard();

  const { control, handleSubmit, reset, setValue, getValues } = useForm<PolicySpecs>({
    resolver: zodResolver(policySpecsSchema),
    defaultValues: formData.policy_specs as PolicySpecs | undefined,
  });

  useEffect(() => {
    if (formData.policy_specs) reset(formData.policy_specs as PolicySpecs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.policy_specs]);

  // Amount status (UI-only — Estimated / Exact)
  const [dbStatus, setDbStatus] = useState<"estimated" | "exact">("estimated");
  const [premStatus, setPremStatus] = useState<"estimated" | "exact">("estimated");

  // Optional target active states — derived from whether fields have values.
  const allValues = useWatch({ control });
  const cvaAmount = allValues.desired_cash_value_accumulation?.amount;
  const cvaAge = allValues.desired_cash_value_accumulation?.at_age;
  const dadAmount = allValues.desired_annual_distribution?.amount;
  const dadStartAge = allValues.desired_annual_distribution?.start_age;
  const dadEndAge = allValues.desired_annual_distribution?.end_age;

  const cvaActive = cvaAmount != null || cvaAge != null;
  const dadActive = dadAmount != null || dadStartAge != null || dadEndAge != null;

  // Track whether optional targets were intentionally added this session.
  const [cvaAdded, setCvaAdded] = useState(cvaActive);
  const [dadAdded, setDadAdded] = useState(dadActive);

  // Sync added state when form reloads
  const prevCvaActive = useRef(cvaActive);
  const prevDadActive = useRef(dadActive);
  useEffect(() => {
    if (prevCvaActive.current !== cvaActive) { setCvaAdded(cvaActive); prevCvaActive.current = cvaActive; }
    if (prevDadActive.current !== dadActive) { setDadAdded(dadActive); prevDadActive.current = dadActive; }
  }, [cvaActive, dadActive]);

  // Optional target summaries
  const cvaSummary =
    cvaAmount != null && cvaAge != null
      ? `${fmtMoney(cvaAmount)} at age ${cvaAge}`
      : cvaAmount != null
      ? fmtMoney(cvaAmount)
      : null;

  const dadSummary =
    dadAmount != null && dadStartAge != null && dadEndAge != null
      ? `${fmtMoney(dadAmount)} annually from age ${dadStartAge} to age ${dadEndAge}`
      : dadAmount != null
      ? fmtMoney(dadAmount)
      : null;

  const clearCva = () => {
    setValue("desired_cash_value_accumulation", undefined);
    setCvaAdded(false);
  };

  const clearDad = () => {
    setValue("desired_annual_distribution", undefined);
    setDadAdded(false);
  };

  const onValid = (data: PolicySpecs) => {
    const cva = data.desired_cash_value_accumulation;
    if (cva && cva.amount == null && cva.at_age == null && cva.year == null) {
      data = { ...data, desired_cash_value_accumulation: undefined };
    }
    const dad = data.desired_annual_distribution;
    if (dad && dad.amount == null && dad.start_age == null && dad.end_age == null) {
      data = { ...data, desired_annual_distribution: undefined };
    }
    patch({ policy_specs: data });
    markComplete(6);
    goNext();
  };

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <div className="space-y-4">

        {/* ── Coverage target ── */}
        <Controller
          control={control}
          name="desired_death_benefit"
          render={({ field: dbField }) => (
            <Controller
              control={control}
              name="death_benefit_duration"
              render={({ field: durField }) => (
                <PrimaryTargetCard
                  fieldKey="desired_death_benefit"
                  title="Coverage target"
                  description="Target death benefit and how long coverage should remain in force."
                  amountLabel="Desired death benefit"
                  durationLabel="Coverage duration"
                  amount={dbField.value}
                  amountStatus={dbStatus}
                  onAmountChange={(v, s) => { dbField.onChange(v); setDbStatus(s); }}
                  durationControl={
                    <ModeFirstDuration
                      scaleOptions={deathBenefitScaleEnum.options}
                      scaleLabels={DB_SCALE_LABELS}
                      value={durField.value}
                      onChange={durField.onChange}
                    />
                  }
                />
              )}
            />
          )}
        />

        {/* ── Premium target ── */}
        <Controller
          control={control}
          name="desired_premium"
          render={({ field: premField }) => (
            <Controller
              control={control}
              name="premium_duration"
              render={({ field: durField }) => (
                <PrimaryTargetCard
                  fieldKey="desired_premium"
                  title="Premium target"
                  description="Intended annual outlay and how long premiums will be paid."
                  amountLabel="Desired annual premium"
                  durationLabel="Premium payment period"
                  amount={premField.value}
                  amountStatus={premStatus}
                  onAmountChange={(v, s) => { premField.onChange(v); setPremStatus(s); }}
                  durationControl={
                    <ModeFirstDuration
                      scaleOptions={premiumScaleEnum.options}
                      scaleLabels={PREMIUM_SCALE_LABELS}
                      value={durField.value}
                      onChange={durField.onChange}
                    />
                  }
                />
              )}
            />
          )}
        />

        {/* ── Optional planning targets ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
            Optional planning targets
          </p>
          <div className="space-y-3">

            {/* Cash value accumulation */}
            <OptionalTargetCard
              title="Cash value accumulation"
              explanation="Set a target cash value to reach by a specific age."
              isActive={cvaAdded}
              summary={cvaSummary}
              onAdd={() => setCvaAdded(true)}
              onRemove={clearCva}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Target amount</p>
                  <Controller
                    control={control}
                    name="desired_cash_value_accumulation.amount"
                    render={({ field }) => (
                      <MoneyInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">At age</p>
                  <Controller
                    control={control}
                    name="desired_cash_value_accumulation.at_age"
                    render={({ field }) => (
                      <AgeInput value={field.value} onChange={field.onChange} placeholder="e.g. 65" />
                    )}
                  />
                </div>
              </div>
            </OptionalTargetCard>

            {/* Annual distribution */}
            <OptionalTargetCard
              title="Annual distribution"
              explanation="Set a target annual income draw from the policy, and the ages it spans."
              isActive={dadAdded}
              summary={dadSummary}
              onAdd={() => setDadAdded(true)}
              onRemove={clearDad}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Annual amount</p>
                  <Controller
                    control={control}
                    name="desired_annual_distribution.amount"
                    render={({ field }) => (
                      <MoneyInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">From age</p>
                  <Controller
                    control={control}
                    name="desired_annual_distribution.start_age"
                    render={({ field }) => (
                      <AgeInput value={field.value} onChange={field.onChange} placeholder="e.g. 65" />
                    )}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">To age</p>
                  <Controller
                    control={control}
                    name="desired_annual_distribution.end_age"
                    render={({ field }) => (
                      <AgeInput value={field.value} onChange={field.onChange} placeholder="e.g. 85" />
                    )}
                  />
                </div>
              </div>
            </OptionalTargetCard>

          </div>
        </div>
      </div>

      <PPStepFooter />
    </form>
  );
}
