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

function statusLabel(s: FieldStatus): string {
  if (s === "not_added") return "Not added";
  if (s === "estimated") return "Estimated";
  return "Exact";
}

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
  const exactWrapRef = useRef<HTMLDivElement>(null);

  // Sync localValue with incoming value whenever the picker opens with a new value.
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Auto-focus the exact input as soon as it mounts.
  useEffect(() => {
    if (!showExact) return;
    const input = exactWrapRef.current?.querySelector("input");
    if (input) {
      // Defer one tick so the input is fully painted before focusing.
      requestAnimationFrame(() => input.focus({ preventScroll: true }));
    }
  }, [showExact]);

  const step = (delta: number) => {
    const next = Math.max(0, (localValue ?? 0) + delta);
    setLocalValue(next);
    onChange(next, "estimated");
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-lg overflow-hidden">
      {/* Header — label only, no top-right Done */}
      <div className="px-5 pt-5 pb-4 space-y-4">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</p>

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
            <span className="flex-1 text-center text-base font-semibold tabular-nums text-[var(--color-text-primary)]">
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

      {/* Footer — primary close action */}
      <div className="border-t border-[var(--color-border)] px-5 py-3 flex items-center justify-between gap-3 bg-[var(--color-readonly-bg)]">
        <span className="text-xs text-[var(--color-text-muted)]">Updates apply immediately</span>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity sm:w-auto w-full justify-center"
        >
          <Check className="w-3.5 h-3.5" />
          Done
        </button>
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
  const exactWrapRef = useRef<HTMLDivElement>(null);
  const min = TAX_SNAP_POINTS[0];
  const max = TAX_SNAP_POINTS[TAX_SNAP_POINTS.length - 1];

  // Auto-focus exact input when revealed.
  useEffect(() => {
    if (!showExact) return;
    const input = exactWrapRef.current?.querySelector("input");
    if (input) requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }, [showExact]);

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-lg overflow-hidden">
      <div className="px-5 pt-5 pb-4 space-y-4">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">Income tax rate</p>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
            <span>{min}%</span>
            <span className="font-semibold tabular-nums text-[var(--color-text-primary)] text-sm">
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

        <div className="flex flex-wrap gap-1.5">
          {TAX_SNAP_POINTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium border transition-colors tabular-nums",
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
            <div ref={exactWrapRef} className="mt-2">
              <PercentInput value={value} onChange={onChange} />
            </div>
          )}
        </div>
      </div>

      {/* Footer — primary close action */}
      <div className="border-t border-[var(--color-border)] px-5 py-3 flex items-center justify-between gap-3 bg-[var(--color-readonly-bg)]">
        <span className="text-xs text-[var(--color-text-muted)]">Updates apply immediately</span>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity sm:w-auto w-full justify-center"
        >
          <Check className="w-3.5 h-3.5" />
          Done
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Field card — presentational; open state owned by PPPersonEditor
 * ─────────────────────────────────────────────────────────────────────────── */

function PPAmountFieldCard({
  fieldId,
  fieldKey,
  label,
  value,
  isOpen,
  onOpen,
  onClose,
  status,
  onChange,
  isTaxRate,
}: {
  fieldId: string;
  fieldKey: string;
  label: string;
  value: number | undefined;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  status: FieldStatus;
  onChange: (v: number | undefined, status: FieldStatus) => void;
  isTaxRate?: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});

  // Recompute portal position whenever the picker opens, or on resize/scroll.
  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 12;
    const pickerHeight = 420;
    const maxPickerWidth = 480;
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < pickerHeight && rect.top > pickerHeight;

    // Clamp horizontal: never overflow viewport edges.
    const rawLeft = rect.left;
    const pickerW = Math.min(Math.max(rect.width, 320), maxPickerWidth, window.innerWidth - margin * 2);
    const clampedLeft = Math.min(
      Math.max(rawLeft, margin),
      window.innerWidth - pickerW - margin
    );

    setPickerStyle({
      position: "fixed",
      left: clampedLeft,
      width: pickerW,
      ...(above
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
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

  // Outside-click: close only when click lands outside both trigger and picker.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (pickerRef.current?.contains(target)) return;
      onClose();
    };
    // Use capture so it fires before any stopPropagation inside the picker.
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [isOpen, onClose]);

  const handleTriggerClick = () => {
    if (isOpen) {
      onClose();
    } else {
      onOpen();
    }
  };

  const displayValue = isTaxRate
    ? value != null ? `${value}%` : null
    : value != null ? `$${Math.round(value).toLocaleString("en-US")}` : null;

  const pickerEl = isOpen ? (
    <div ref={pickerRef} style={pickerStyle}>
      {isTaxRate ? (
        <PPTaxRatePicker
          value={value}
          onChange={(v) => onChange(v, v == null ? "not_added" : "estimated")}
          onClose={onClose}
        />
      ) : (
        <PPAmountPicker
          fieldKey={fieldKey}
          label={label}
          value={value}
          onChange={onChange}
          onClose={onClose}
        />
      )}
    </div>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        aria-expanded={isOpen}
        aria-controls={`picker-${fieldId}`}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left group",
          isOpen
            ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] ring-2 ring-[var(--color-accent-ring)]"
            : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)]"
        )}
      >
        <div className="flex-1 min-w-0">
          {/* Label — slightly lighter weight so the value dominates */}
          <p className={cn(
            "text-sm font-normal leading-tight",
            status === "not_added"
              ? "text-[var(--color-text-muted)]"
              : "text-[var(--color-text-secondary)]"
          )}>{label}</p>
          {/* Value — 2–4 px larger, semibold, tabular-nums; muted when not entered */}
          <p className={cn(
            "text-[15px] leading-snug mt-0.5 tabular-nums font-semibold",
            status === "not_added"
              ? "text-[var(--color-text-muted)] font-normal"
              : "text-[var(--color-text-primary)]"
          )}>
            {displayValue ?? "Not added"}
          </p>
        </div>
        {/* Status pill — softened: no border, lighter bg, regular weight */}
        <span className={cn(
          "shrink-0 text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-full",
          status === "not_added"
            ? "text-[var(--color-text-muted)] bg-transparent"
            : status === "estimated"
            ? "text-amber-600 bg-amber-50"
            : "text-[var(--color-success)] bg-[var(--color-success-light)]"
        )}>
          {status !== "not_added" ? statusLabel(status) : ""}
        </span>
        {/* Pencil — tertiary: always muted, only accent on open */}
        <Pencil className={cn(
          "w-3.5 h-3.5 shrink-0 transition-colors opacity-40 group-hover:opacity-70",
          isOpen ? "text-[var(--color-accent)] opacity-100" : "text-[var(--color-text-muted)]"
        )} />
      </button>

      {typeof document !== "undefined" && pickerEl
        ? createPortal(
            <div id={`picker-${fieldId}`}>{pickerEl}</div>,
            document.body
          )
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
        <div className="px-4 pb-4 border-t border-[var(--color-border)]">
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
    ["Liquid net worth", totals.liquid_net_worth, true],
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
          <span className={cn(
            "text-sm",
            highlight ? "font-semibold text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"
          )}>
            {label}
          </span>
          <span className={cn(
            "text-sm font-semibold tabular-nums",
            highlight
              ? value >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-error)]"
              : value < 0 ? "text-[var(--color-error)]" : "text-[var(--color-text-primary)]"
          )}>
            {value < 0 ? "−" : ""}${Math.abs(Math.round(value)).toLocaleString("en-US")}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Single-person financial editor
 * One shared `openEditorId` — only one picker open at a time, owned here.
 * ─────────────────────────────────────────────────────────────────────────── */

type Prefix = "columns.client_1" | "columns.client_2" | "columns.joint";

// UI-only field status tracking — not persisted to schema.
type StatusMap = Record<string, FieldStatus>;

function initStatusMap(col: Partial<FinancialColumn>): StatusMap {
  const keys: (keyof FinancialColumn)[] = [
    "annual_income", "income_tax_rate",
    "residence", "cash_cds_securities", "qualified_plans",
    "business_interests", "real_estate", "other_assets",
    "mortgage_amount", "revolving_debt", "other_liability_amount",
  ];
  const map: StatusMap = {};
  for (const k of keys) {
    map[k] = col[k] == null ? "not_added" : "estimated";
  }
  return map;
}

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

  // Single shared open-editor id. Empty string = no picker open.
  const [openEditorId, setOpenEditorId] = useState<string>("");

  // UI-only status map — tracks Estimated / Exact / Not added per field.
  const [statusMap, setStatusMap] = useState<StatusMap>(() => initStatusMap(col));

  // Re-init status map when the column data changes from an external reset (e.g. sample load).
  // Only runs when the column reference structurally changes — not on every field change.
  const prevColRef = useRef<Partial<FinancialColumn>>(col);
  useEffect(() => {
    // If a reset caused all values to become undefined, reinitialize.
    const allEmpty = Object.values(col).every((v) => v == null);
    const prevAllEmpty = Object.values(prevColRef.current).every((v) => v == null);
    if (allEmpty && !prevAllEmpty) {
      setStatusMap(initStatusMap(col));
    }
    prevColRef.current = col;
  }, [col]);

  const field = (key: keyof FinancialColumn) =>
    `${prefix}.${key}` as Parameters<typeof control.register>[0];

  const fieldId = (key: keyof FinancialColumn) => `${prefix}.${key}`;

  const openField = useCallback((id: string) => setOpenEditorId(id), []);
  const closeField = useCallback(() => setOpenEditorId(""), []);

  const updateStatus = useCallback((key: string, s: FieldStatus) => {
    setStatusMap((prev) => ({ ...prev, [key]: s }));
  }, []);

  const assetFields: [keyof FinancialColumn, string][] = [
    ["cash_cds_securities", "Cash, CDs, and securities"],
    ["qualified_plans", "Qualified retirement plans"],
    ["residence", "Personal real estate"],
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
      {/* Income */}
      <PPFinancialSection title="Income" defaultOpen>
        <Controller
          control={control}
          name={field("annual_income")}
          render={({ field: f }) => (
            <PPAmountFieldCard
              fieldId={fieldId("annual_income")}
              fieldKey="annual_income"
              label="Annual income"
              value={f.value as number | undefined}
              isOpen={openEditorId === fieldId("annual_income")}
              onOpen={() => openField(fieldId("annual_income"))}
              onClose={closeField}
              status={statusMap["annual_income"] ?? "not_added"}
              onChange={(v, s) => { f.onChange(v); updateStatus("annual_income", s ?? "not_added"); }}
            />
          )}
        />
        <Controller
          control={control}
          name={field("income_tax_rate")}
          render={({ field: f }) => (
            <PPAmountFieldCard
              fieldId={fieldId("income_tax_rate")}
              fieldKey="income_tax_rate"
              label="Income tax rate"
              value={f.value as number | undefined}
              isOpen={openEditorId === fieldId("income_tax_rate")}
              onOpen={() => openField(fieldId("income_tax_rate"))}
              onClose={closeField}
              status={statusMap["income_tax_rate"] ?? "not_added"}
              onChange={(v, s) => { f.onChange(v); updateStatus("income_tax_rate", s ?? "not_added"); }}
              isTaxRate
            />
          )}
        />
      </PPFinancialSection>

      {/* Assets */}
      <PPFinancialSection title="Assets" defaultOpen>
        {assetFields.map(([key, label]) => (
          <Controller
            key={key}
            control={control}
            name={field(key)}
            render={({ field: f }) => (
              <PPAmountFieldCard
                fieldId={fieldId(key)}
                fieldKey={key}
                label={label}
                value={f.value as number | undefined}
                isOpen={openEditorId === fieldId(key)}
                onOpen={() => openField(fieldId(key))}
                onClose={closeField}
                status={statusMap[key] ?? "not_added"}
                onChange={(v, s) => { f.onChange(v); updateStatus(key, s ?? "not_added"); }}
              />
            )}
          />
        ))}
      </PPFinancialSection>

      {/* Liabilities */}
      <PPFinancialSection title="Liabilities" defaultOpen={false}>
        {liabilityFields.map(([key, label]) => (
          <Controller
            key={key}
            control={control}
            name={field(key)}
            render={({ field: f }) => (
              <PPAmountFieldCard
                fieldId={fieldId(key)}
                fieldKey={key}
                label={label}
                value={f.value as number | undefined}
                isOpen={openEditorId === fieldId(key)}
                onOpen={() => openField(fieldId(key))}
                onClose={closeField}
                status={statusMap[key] ?? "not_added"}
                onChange={(v, s) => { f.onChange(v); updateStatus(key, s ?? "not_added"); }}
              />
            )}
          />
        ))}
      </PPFinancialSection>

      {/* Summary — below sections */}
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

  // Keep activeTab valid when tab set changes (e.g. insured count or sample load)
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

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      {/* Page intro */}
      <div className="mb-6 bg-[var(--color-accent-light)] border border-[var(--color-accent-ring)] rounded-lg px-5 py-4">
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          <span className="font-semibold text-[var(--color-text-primary)]">Estimates are fine.</span>{" "}
          Start with reasonable estimates. Use the quick-pick amounts to build the client&rsquo;s financial picture, then refine exact figures only where needed.
        </p>
      </div>

      {/* Whose financials */}
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
            <PPPremiumSourceSelector value={f.value} onChange={f.onChange} />
          )}
        />
      </div>

      {/* Tab switcher */}
      {tabs.length > 1 && (
        <div className="mb-4">
          <PPProfileTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>
      )}

      {/* Person editors — all mounted, only active tab visible (preserves RHF state) */}
      {tabs.map((t) => (
        <div key={t.id} className={t.id === activeTab ? "block" : "hidden"}>
          <PPPersonEditor prefix={t.id} control={control} />
        </div>
      ))}

      <PPStepFooter onContinue={handleSubmit(onValid)} />
    </form>
  );
}
