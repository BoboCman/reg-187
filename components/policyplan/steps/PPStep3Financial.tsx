"use client";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  financialSchema,
  deriveFinancialTotals,
  type Financial,
  type FinancialColumn,
} from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PPStepFooter } from "@/components/policyplan/PPStepWrapper";
import { MoneyInput, PercentInput } from "@/components/ui/inputs";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils";
import { ChevronDown, ChevronUp, Pencil, Check } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
 * Constants & helpers
 * ─────────────────────────────────────────────────────────────────────────── */

const EMPTY_COL: Partial<FinancialColumn> = {
  annual_income: undefined,
  income_tax_rate: undefined,
  cash_cds_securities: undefined,
  qualified_plans: undefined,
  business_interests: undefined,
  real_estate: undefined,
  residence: undefined,
  other_assets: undefined,
  mortgage_amount: undefined,
  revolving_debt: undefined,
  other_liability_amount: undefined,
};

const PREMIUM_SOURCE_PRESETS = [
  "Personal savings",
  "Personal cash flow",
  "Business cash flow",
  "Annual gifts",
  "Trust assets",
  "Liquidity event",
  "Other",
] as const;

// Per-field quick-pick chip amounts (in dollars)
const MONEY_CHIPS: Record<string, number[]> = {
  annual_income: [50_000, 100_000, 150_000, 200_000, 300_000, 500_000],
  cash_cds_securities: [25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000],
  qualified_plans: [50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000],
  business_interests: [100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000],
  real_estate: [100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000],
  residence: [200_000, 400_000, 600_000, 800_000, 1_000_000, 2_000_000],
  other_assets: [25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000],
  mortgage_amount: [100_000, 200_000, 400_000, 600_000, 800_000, 1_000_000],
  revolving_debt: [5_000, 10_000, 25_000, 50_000, 100_000, 200_000],
  other_liability_amount: [10_000, 25_000, 50_000, 100_000, 250_000, 500_000],
};

const STEPPER_INCREMENT: Record<string, number> = {
  annual_income: 5_000,
  cash_cds_securities: 10_000,
  qualified_plans: 25_000,
  business_interests: 50_000,
  real_estate: 50_000,
  residence: 25_000,
  other_assets: 10_000,
  mortgage_amount: 10_000,
  revolving_debt: 1_000,
  other_liability_amount: 5_000,
};

const TAX_SNAP_POINTS = [15, 20, 22, 24, 25, 28, 30, 32, 35, 37, 40];

function chipLabel(v: number): string {
  if (v >= 1_000_000) return `${v / 1_000_000}M`;
  if (v >= 1_000) return `${v / 1_000}k`;
  return `${v}`;
}

type FieldStatus = "not_added" | "estimated" | "exact";

/* ─────────────────────────────────────────────────────────────────────────────
 * Premium source selector
 * ─────────────────────────────────────────────────────────────────────────── */

function PPPremiumSourceSelector({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const [showOther, setShowOther] = useState(
    () => !!value && !PREMIUM_SOURCE_PRESETS.slice(0, -1).includes(value as never)
  );
  const [otherText, setOtherText] = useState(
    () => (value && !PREMIUM_SOURCE_PRESETS.slice(0, -1).includes(value as never) ? value : "")
  );

  const handlePreset = (preset: string) => {
    if (preset === "Other") {
      setShowOther(true);
      onChange(otherText || "");
    } else {
      setShowOther(false);
      onChange(preset);
    }
  };

  const activePreset = PREMIUM_SOURCE_PRESETS.slice(0, -1).includes(value as never)
    ? value
    : showOther
    ? "Other"
    : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PREMIUM_SOURCE_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handlePreset(p)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors",
              activePreset === p
                ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            )}
          >
            {p}
          </button>
        ))}
      </div>
      {showOther && (
        <input
          type="text"
          value={otherText}
          placeholder="Describe the premium source…"
          onChange={(e) => {
            setOtherText(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full max-w-md rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-[var(--color-accent)] transition-colors min-h-[44px]"
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Amount picker (money fields)
 * ─────────────────────────────────────────────────────────────────────────── */

function PPAmountPicker({
  fieldKey,
  label,
  value,
  onChange,
  onClose,
}: {
  fieldKey: string;
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined, status: FieldStatus) => void;
  onClose: () => void;
}) {
  const chips = MONEY_CHIPS[fieldKey] ?? [25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];
  const increment = STEPPER_INCREMENT[fieldKey] ?? 10_000;
  const [showExact, setShowExact] = useState(false);
  const [localValue, setLocalValue] = useState<number | undefined>(value);

  const step = (delta: number) => {
    const next = Math.max(0, (localValue ?? 0) + delta);
    setLocalValue(next);
    onChange(next, "estimated");
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors px-2 py-1 rounded hover:bg-[var(--color-background)]"
        >
          Done
        </button>
      </div>

      {/* Quick chips */}
      <div>
        <p className="text-xs text-[var(--color-text-muted)] mb-2 uppercase tracking-wide font-medium">Quick estimate</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => { setLocalValue(undefined); onChange(undefined, "not_added"); }}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-medium border transition-colors",
              localValue == null
                ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                : "bg-[var(--color-readonly-bg)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            )}
          >
            None
          </button>
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setLocalValue(c); onChange(c, "estimated"); }}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium border transition-colors",
                localValue === c
                  ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                  : "bg-[var(--color-readonly-bg)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              )}
            >
              {chipLabel(c)}
            </button>
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
            className="w-10 h-10 rounded border border-[var(--color-border)] bg-[var(--color-readonly-bg)] text-[var(--color-text-primary)] font-semibold text-lg flex items-center justify-center hover:bg-[var(--color-background)] transition-colors"
          >
            −
          </button>
          <span className="flex-1 text-center text-base font-semibold text-[var(--color-text-primary)]">
            {localValue != null ? `$${localValue.toLocaleString("en-US")}` : "—"}
          </span>
          <button
            type="button"
            onClick={() => step(+increment)}
            className="w-10 h-10 rounded border border-[var(--color-border)] bg-[var(--color-readonly-bg)] text-[var(--color-text-primary)] font-semibold text-lg flex items-center justify-center hover:bg-[var(--color-background)] transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Exact entry */}
      <div>
        <button
          type="button"
          onClick={() => setShowExact((v) => !v)}
          className="text-xs text-[var(--color-accent)] hover:underline font-medium"
        >
          {showExact ? "Hide exact entry" : "Enter exact amount"}
        </button>
        {showExact && (
          <div className="mt-2">
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
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Tax rate picker
 * ─────────────────────────────────────────────────────────────────────────── */

function PPTaxRatePicker({
  value,
  onChange,
  onClose,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  onClose: () => void;
}) {
  const [showExact, setShowExact] = useState(false);
  const min = TAX_SNAP_POINTS[0];
  const max = TAX_SNAP_POINTS[TAX_SNAP_POINTS.length - 1];

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">Income tax rate</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors px-2 py-1 rounded hover:bg-[var(--color-background)]"
        >
          Done
        </button>
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
          <span>{min}%</span>
          <span className="font-semibold text-[var(--color-text-primary)] text-sm">
            {value != null ? `${value}%` : "—"}
          </span>
          <span>{max}%</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value ?? min}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[var(--color-accent)] h-2 cursor-pointer"
        />
      </div>

      {/* Snap chips */}
      <div className="flex flex-wrap gap-1.5">
        {TAX_SNAP_POINTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              "px-3 py-1 rounded text-xs font-medium border transition-colors",
              value === p
                ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                : "bg-[var(--color-readonly-bg)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            )}
          >
            {p}%
          </button>
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowExact((v) => !v)}
          className="text-xs text-[var(--color-accent)] hover:underline font-medium"
        >
          {showExact ? "Hide exact entry" : "Enter exact rate"}
        </button>
        {showExact && (
          <div className="mt-2">
            <PercentInput value={value} onChange={onChange} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Field card — compact row with popover editor
 * ─────────────────────────────────────────────────────────────────────────── */

function statusLabel(status: FieldStatus): string {
  if (status === "not_added") return "Not added";
  if (status === "estimated") return "Estimated";
  return "Exact";
}

// One field card can be open at a time — shared across the whole step.
// A module-level ref so all cards in the same render tree share one slot.
let globalCloseOpenPicker: (() => void) | null = null;

function PPAmountFieldCard({
  fieldKey,
  label,
  value,
  onChange,
  isTaxRate,
}: {
  fieldKey: string;
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined, status?: FieldStatus) => void;
  isTaxRate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<FieldStatus>(() =>
    value == null ? "not_added" : "estimated"
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});

  // Sync status when value changes externally (e.g. reset)
  useEffect(() => {
    if (value == null) setStatus("not_added");
    else if (status === "not_added") setStatus("estimated");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Register close handler globally so only one picker is open at a time
  useEffect(() => {
    if (open) {
      if (globalCloseOpenPicker && globalCloseOpenPicker !== closeThis) {
        globalCloseOpenPicker();
      }
      globalCloseOpenPicker = closeThis;
    } else {
      if (globalCloseOpenPicker === closeThis) globalCloseOpenPicker = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function closeThis() { setOpen(false); }

  // Position the portal picker below the trigger button
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const pickerHeight = 340; // approximate max height
    const above = spaceBelow < pickerHeight && rect.top > pickerHeight;
    setPickerStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      ...(above
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      zIndex: 9999,
    });
  }, [open]);

  // Close on outside click — checks both trigger and picker
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        pickerRef.current?.contains(target)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleChange = useCallback(
    (v: number | undefined, s: FieldStatus = "estimated") => {
      setStatus(v == null ? "not_added" : s);
      onChange(v, s);
    },
    [onChange]
  );

  const displayValue = isTaxRate
    ? value != null ? `${value}%` : null
    : value != null ? `$${Math.round(value).toLocaleString("en-US")}` : null;

  const pickerEl = open ? (
    <div ref={pickerRef} style={pickerStyle} className="shadow-xl min-w-[320px] max-w-[480px]">
      {isTaxRate ? (
        <PPTaxRatePicker
          value={value}
          onChange={(v) => { handleChange(v, v == null ? "not_added" : "estimated"); }}
          onClose={() => setOpen(false)}
        />
      ) : (
        <PPAmountPicker
          fieldKey={fieldKey}
          label={label}
          value={value}
          onChange={(v, s) => handleChange(v, s)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-colors text-left group"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
          <p
            className={cn(
              "text-xs mt-0.5",
              status === "not_added"
                ? "text-[var(--color-text-muted)]"
                : "text-[var(--color-text-secondary)]"
            )}
          >
            {displayValue ?? "Not added"}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border",
            status === "not_added"
              ? "border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-readonly-bg)]"
              : status === "estimated"
              ? "border-amber-300 text-amber-700 bg-amber-50"
              : "border-[var(--color-success)] text-[var(--color-success)] bg-[var(--color-success-light)]"
          )}
        >
          {statusLabel(status)}
        </span>
        <Pencil className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] shrink-0 transition-colors" />
      </button>

      {/* Render picker in a portal so it is never clipped by overflow:hidden ancestors */}
      {typeof document !== "undefined" && pickerEl
        ? createPortal(pickerEl, document.body)
        : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Accordion section
 * ─────────────────────────────────────────────────────────────────────────── */

function PPFinancialSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--color-background)] transition-colors"
      >
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-[var(--color-border)]">
          <div className="pt-3 space-y-2">{children}</div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Summary rail
 * ─────────────────────────────────────────────────────────────────────────── */

function PPFinancialSummaryRail({ totals }: { totals: ReturnType<typeof deriveFinancialTotals> }) {
  const rows: [string, number, boolean?][] = [
    ["Total liquid assets", totals.total_liquid_assets],
    ["Total assets", totals.total_assets],
    ["Total liabilities", totals.total_liabilities],
    ["Net worth", totals.net_worth],
    ["Liquid net worth (excludes residence)", totals.liquid_net_worth, true],
  ];

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-5 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
        Financial summary
      </p>
      {rows.map(([label, value, highlight]) => (
        <div
          key={label}
          className={cn(
            "flex items-center justify-between py-2",
            highlight
              ? "border-t border-[var(--color-border)] mt-1 pt-3"
              : "border-b border-[var(--color-border)] last:border-0"
          )}
        >
          <span
            className={cn(
              "text-sm",
              highlight
                ? "font-semibold text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)]"
            )}
          >
            {label}
          </span>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              highlight
                ? value >= 0
                  ? "text-[var(--color-success)]"
                  : "text-[var(--color-error)]"
                : value < 0
                ? "text-[var(--color-error)]"
                : "text-[var(--color-text-primary)]"
            )}
          >
            {value < 0 ? "−" : ""}${Math.abs(Math.round(value)).toLocaleString("en-US")}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Single-person financial editor (one active tab at a time)
 * ─────────────────────────────────────────────────────────────────────────── */

type Prefix = "columns.client_1" | "columns.client_2" | "columns.joint";

function PPPersonEditor({
  prefix,
  control,
}: {
  prefix: Prefix;
  control: ReturnType<typeof useForm<Financial>>["control"];
}) {
  const colValue = useWatch({ control, name: prefix }) as Partial<FinancialColumn> | undefined;
  const col = (colValue ?? {}) as FinancialColumn;
  const totals = deriveFinancialTotals(col);

  const field = (key: keyof FinancialColumn) =>
    `${prefix}.${key}` as Parameters<typeof control.register>[0];

  // Spec order: residence first, then liquids, retirement, business, investment RE, other
  const assetFields: [keyof FinancialColumn, string][] = [
    ["residence", "Personal real estate"],
    ["cash_cds_securities", "Cash, CDs, and securities"],
    ["qualified_plans", "Qualified retirement plans"],
    ["business_interests", "Business interests"],
    ["real_estate", "Investment real estate"],
    ["other_assets", "Other assets"],
  ];

  const liabilityFields: [keyof FinancialColumn, string][] = [
    ["mortgage_amount", "Mortgage balance(s)"],
    ["revolving_debt", "Revolving / credit debt"],
    ["other_liability_amount", "Other liabilities"],
  ];

  return (
    <div className="space-y-3">
      {/* Income section */}
      <PPFinancialSection title="Income" defaultOpen>
        <Controller
          control={control}
          name={field("annual_income")}
          render={({ field: f }) => (
            <PPAmountFieldCard
              fieldKey="annual_income"
              label="Annual income"
              value={f.value as number | undefined}
              onChange={(v) => f.onChange(v)}
            />
          )}
        />
        <Controller
          control={control}
          name={field("income_tax_rate")}
          render={({ field: f }) => (
            <PPAmountFieldCard
              fieldKey="income_tax_rate"
              label="Income tax rate"
              value={f.value as number | undefined}
              onChange={(v) => f.onChange(v)}
              isTaxRate
            />
          )}
        />
      </PPFinancialSection>

      {/* Assets section */}
      <PPFinancialSection title="Assets" defaultOpen>
        {assetFields.map(([key, label]) => (
          <Controller
            key={key}
            control={control}
            name={field(key)}
            render={({ field: f }) => (
              <PPAmountFieldCard
                fieldKey={key}
                label={label}
                value={f.value as number | undefined}
                onChange={(v) => f.onChange(v)}
              />
            )}
          />
        ))}
      </PPFinancialSection>

      {/* Liabilities section */}
      <PPFinancialSection title="Liabilities" defaultOpen={false}>
        {liabilityFields.map(([key, label]) => (
          <Controller
            key={key}
            control={control}
            name={field(key)}
            render={({ field: f }) => (
              <PPAmountFieldCard
                fieldKey={key}
                label={label}
                value={f.value as number | undefined}
                onChange={(v) => f.onChange(v)}
              />
            )}
          />
        ))}
      </PPFinancialSection>

      {/* Summary — below sections so hierarchy is: enter data → see result */}
      <PPFinancialSummaryRail totals={totals} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Tab switcher
 * ─────────────────────────────────────────────────────────────────────────── */

type Tab = { id: Prefix; label: string };

function PPProfileTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: Prefix;
  onChange: (id: Prefix) => void;
}) {
  return (
    <div className="flex gap-1 bg-[var(--color-readonly-bg)] rounded-lg p-1 border border-[var(--color-border)]">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "flex-1 py-2 px-3 rounded text-sm font-medium transition-colors",
            active === t.id
              ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Root step component
 * ─────────────────────────────────────────────────────────────────────────── */

export function PPStep3Financial() {
  const { formData, patch, markComplete, goNext } = usePPWizard();
  const hasSecondInsured = (formData.insured_owner?.insureds?.length ?? 1) > 1;

  const { control, handleSubmit, reset, register } = useForm<Financial>({
    resolver: zodResolver(financialSchema),
    defaultValues: formData.financial ?? {
      expected_source_of_premium: "",
      columns: { client_1: EMPTY_COL },
    },
  });

  useEffect(() => {
    if (formData.financial) reset(formData.financial as Financial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.financial]);

  const tabs: Tab[] = hasSecondInsured
    ? [
        { id: "columns.client_1", label: "Client 1" },
        { id: "columns.client_2", label: "Client 2" },
        { id: "columns.joint", label: "Joint" },
      ]
    : [{ id: "columns.client_1", label: "Financial profile" }];

  const [activeTab, setActiveTab] = useState<Prefix>(tabs[0].id);

  // Keep activeTab valid whenever the tab set changes (e.g. insured count changes, sample load)
  useEffect(() => {
    if (!tabs.find((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  const onValid = (data: Financial) => {
    patch({ financial: data });
    markComplete(3);
    goNext();
  };

  // Source of premium field value for the controlled selector
  const sourceValue = useWatch({ control, name: "expected_source_of_premium" });

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      {/* Page intro */}
      <div className="mb-6 bg-[var(--color-accent-light)] border border-[var(--color-accent-ring)] rounded-lg px-5 py-4">
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          <span className="font-semibold text-[var(--color-text-primary)]">Estimates are fine.</span>{" "}
          Start with reasonable estimates. Use the quick-pick amounts to build the client&rsquo;s financial picture, then refine exact figures only where needed.
        </p>
      </div>

      {/* Whose financials — Reg 187 suitability is about the policy owner */}
      <div className="mb-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-5 py-4">
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          <span className="font-semibold text-[var(--color-text-primary)]">Whose information to enter.</span>{" "}
          Enter the financial information of the policy owner. For a trust-owned policy, enter the grantor&rsquo;s or the premium funding source&rsquo;s information, not the insured&rsquo;s.
        </p>
      </div>

      {/* Premium source */}
      <div className="mb-6 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] px-5 py-5">
        <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
          Expected source of premium funds
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Choose the primary source of premium funds, or describe a custom source.
        </p>
        <Controller
          control={control}
          name="expected_source_of_premium"
          render={({ field: f }) => (
            <PPPremiumSourceSelector
              value={f.value}
              onChange={f.onChange}
            />
          )}
        />
      </div>

      {/* Tab switcher */}
      {tabs.length > 1 && (
        <div className="mb-4">
          <PPProfileTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>
      )}

      {/* Person editor — all tabs mounted, only active tab visible (preserves RHF state) */}
      {tabs.map((t) => (
        <div key={t.id} className={t.id === activeTab ? "block" : "hidden"}>
          <PPPersonEditor prefix={t.id} control={control} />
        </div>
      ))}

      <PPStepFooter onContinue={handleSubmit(onValid)} />
    </form>
  );
}
