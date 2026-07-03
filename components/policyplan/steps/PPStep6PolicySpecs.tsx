"use client";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, X, Check } from "lucide-react";
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

/* ── AmountStatusBadge ───────────────────────────────────────────────────── */

function AmountStatusBadge({ status }: { status: "estimated" | "exact" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide",
        status === "exact"
          ? "bg-[var(--color-success-light,#e8f5e9)] text-[var(--color-success,#2e7d32)]"
          : "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
      )}
    >
      {status === "exact" ? "Exact" : "Estimated"}
    </span>
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

/* ── PrimaryTargetCard ───────────────────────────────────────────────────── */

function PrimaryTargetCard({
  title,
  description,
  amountLabel,
  durationLabel: durationTitle,
  amount,
  duration,
  scaleLabels,
  amountStatus,
  onAmountStatusChange,
  onAmountChange,
  durationControl,
  isEditing,
  onEditToggle,
}: {
  title: string;
  description: string;
  amountLabel: string;
  durationLabel: string;
  amount: number | undefined;
  duration: DurationValue;
  scaleLabels: Record<string, string>;
  amountStatus: "estimated" | "exact";
  onAmountStatusChange: (s: "estimated" | "exact") => void;
  onAmountChange: (v: number | undefined) => void;
  durationControl: React.ReactNode;
  isEditing: boolean;
  onEditToggle: () => void;
}) {
  const hasAmount = amount != null;
  const hasDuration = !!duration;

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[var(--color-border)] flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
        </div>
        <button
          type="button"
          onClick={onEditToggle}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline shrink-0 mt-0.5"
          aria-label={isEditing ? "Close edit" : "Edit"}
        >
          {isEditing ? (
            <><Check size={13} />Done</>
          ) : (
            <><Pencil size={13} />Edit</>
          )}
        </button>
      </div>

      {/* Summary row — always visible */}
      {!isEditing && (
        <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide font-semibold text-[var(--color-text-muted)] mb-1">
              {amountLabel}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-sm font-semibold", hasAmount ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]")}>
                {hasAmount ? fmtMoney(amount) : "Not set"}
              </span>
              {hasAmount && <AmountStatusBadge status={amountStatus} />}
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide font-semibold text-[var(--color-text-muted)] mb-1">
              {durationTitle}
            </p>
            <span className={cn("text-sm font-semibold", hasDuration ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]")}>
              {hasDuration ? durationLabel(duration, scaleLabels) : "Not set"}
            </span>
          </div>
        </div>
      )}

      {/* Edit panel */}
      {isEditing && (
        <div className="px-5 py-5 space-y-6">
          {/* Amount row */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">{amountLabel}</p>
            <MoneyInput value={amount} onChange={onAmountChange} />
            {/* Estimated / Exact toggle */}
            <div className="flex gap-2">
              {(["estimated", "exact"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onAmountStatusChange(s)}
                  className={cn(
                    "px-3 py-1.5 rounded border text-xs font-semibold transition-colors",
                    amountStatus === s
                      ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                      : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  )}
                >
                  {s === "estimated" ? "Estimated" : "Exact"}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">{durationTitle}</p>
            {durationControl}
          </div>
        </div>
      )}
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

  // Primary target edit states
  const [coverageEditing, setCoverageEditing] = useState(false);
  const [premiumEditing, setPremiumEditing] = useState(false);

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
                  title="Coverage target"
                  description="Target death benefit and how long coverage should remain in force."
                  amountLabel="Desired death benefit"
                  durationLabel="Coverage duration"
                  amount={dbField.value}
                  duration={durField.value}
                  scaleLabels={DB_SCALE_LABELS}
                  amountStatus={dbStatus}
                  onAmountStatusChange={setDbStatus}
                  onAmountChange={dbField.onChange}
                  durationControl={
                    <ModeFirstDuration
                      scaleOptions={deathBenefitScaleEnum.options}
                      scaleLabels={DB_SCALE_LABELS}
                      value={durField.value}
                      onChange={durField.onChange}
                    />
                  }
                  isEditing={coverageEditing}
                  onEditToggle={() => setCoverageEditing((v) => !v)}
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
                  title="Premium target"
                  description="Intended annual outlay and how long premiums will be paid."
                  amountLabel="Desired annual premium"
                  durationLabel="Premium payment period"
                  amount={premField.value}
                  duration={durField.value}
                  scaleLabels={PREMIUM_SCALE_LABELS}
                  amountStatus={premStatus}
                  onAmountStatusChange={setPremStatus}
                  onAmountChange={premField.onChange}
                  durationControl={
                    <ModeFirstDuration
                      scaleOptions={premiumScaleEnum.options}
                      scaleLabels={PREMIUM_SCALE_LABELS}
                      value={durField.value}
                      onChange={durField.onChange}
                    />
                  }
                  isEditing={premiumEditing}
                  onEditToggle={() => setPremiumEditing((v) => !v)}
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
