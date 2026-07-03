"use client";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, Pencil, Check } from "lucide-react";
import {
  existingCoverageSchema,
  policyTypeEnum,
  OBJECTIVE_LABELS,
  businessTypeEnum,
  type ExistingCoverage,
} from "@/lib/policyplan/schema";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { PPStepFooter, PPSectionCard } from "@/components/policyplan/PPStepWrapper";
import { FormField } from "@/components/ui/FormField";
import { TextInput, MoneyInput } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
 * Constants
 * ─────────────────────────────────────────────────────────────────────────── */

const POLICY_TYPE_LABELS: Record<string, string> = {
  term: "Term",
  whole_life: "Whole life",
  universal_life: "Universal life",
  indexed_ul: "Indexed UL",
  variable_ul: "Variable UL",
  guaranteed_ul: "Guaranteed UL",
  other: "Other",
};

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

const EMPTY_POLICY = {
  insurance_company: "",
  policy_number: "",
  insured: "",
  policy_owner: "",
  year_issued: undefined,
  death_benefit: undefined,
  gross_cash_value: undefined,
  policy_loan_balance: undefined,
  cash_surrender_value: undefined,
  premium_amount: undefined,
  remaining_premium_years: undefined,
  policy_type: undefined,
  purpose_of_policy: undefined,
  under_replacement_consideration: undefined as "yes" | "no" | undefined,
};

const MONEY_CHIPS: Record<string, number[]> = {
  death_benefit: [100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000],
  gross_cash_value: [10_000, 25_000, 50_000, 100_000, 250_000, 500_000],
  cash_surrender_value: [10_000, 25_000, 50_000, 100_000, 250_000, 500_000],
  policy_loan_balance: [5_000, 10_000, 25_000, 50_000, 100_000, 250_000],
  premium_amount: [1_000, 2_500, 5_000, 10_000, 25_000, 50_000],
};

const STEPPER_INCREMENT: Record<string, number> = {
  death_benefit: 25_000,
  gross_cash_value: 5_000,
  cash_surrender_value: 5_000,
  policy_loan_balance: 2_500,
  premium_amount: 500,
};

// Policy-specific purposes not covered by Step 2 objectives
const POLICY_SPECIFIC_PURPOSES = ["Key person", "Buy-sell"];

// Build the purpose chip list for a given policy card:
// Row 1 = currently selected Step 2 objective labels (canonical)
// Row 2 = policy-specific extras not in Step 2
// Always appended: "Other"
function buildPurposeOptions(selectedObjectiveLabels: string[]): {
  primary: string[];
  secondary: string[];
} {
  return {
    primary: selectedObjectiveLabels,
    secondary: POLICY_SPECIFIC_PURPOSES.filter(
      (p) => !selectedObjectiveLabels.includes(p)
    ),
  };
}

const OWNERSHIP_OPTIONS = [
  { value: "individual" as const, label: "Individual" },
  { value: "business" as const, label: "Business" },
  { value: "trust" as const, label: "Trust" },
];

const TRUST_OPTIONS = [
  { value: "irrevocable" as const, label: "Irrevocable" },
  { value: "revocable" as const, label: "Revocable" },
];

const BUSINESS_TYPE_OPTIONS: Array<{ value: typeof businessTypeEnum._type; label: string }> = [
  { value: "c_corp", label: "C corporation" },
  { value: "s_corp", label: "S corporation" },
  { value: "llc", label: "LLC" },
  { value: "limited_partnership", label: "Limited partnership" },
  { value: "sole_proprietorship", label: "Sole proprietorship" },
];

const MAX_POLICIES = 3;

const currentYear = new Date().getFullYear();
type YearPreset = "unknown" | "recent" | "5_10" | "10_20" | "20_plus" | "exact";
const YEAR_PRESETS: { id: YearPreset; label: string; year?: number }[] = [
  { id: "unknown", label: "Unknown" },
  { id: "recent", label: "Last 5 years", year: currentYear - 2 },
  { id: "5_10", label: "5–10 years ago", year: currentYear - 7 },
  { id: "10_20", label: "10–20 years ago", year: currentYear - 15 },
  { id: "20_plus", label: "20+ years ago", year: currentYear - 25 },
  { id: "exact", label: "Enter exact year" },
];

type PremiumPreset = "paid_up" | "ongoing" | "1_5" | "6_10" | "11_plus" | "unknown" | "exact";
const PREMIUM_PRESETS: { id: PremiumPreset; label: string; years?: number }[] = [
  { id: "paid_up", label: "Paid-up", years: 0 },
  { id: "ongoing", label: "Ongoing / lifetime" },
  { id: "1_5", label: "1–5 years", years: 3 },
  { id: "6_10", label: "6–10 years", years: 8 },
  { id: "11_plus", label: "11+ years", years: 15 },
  { id: "unknown", label: "Unknown" },
  { id: "exact", label: "Enter exact years" },
];

/* ─────────────────────────────────────────────────────────────────────────────
 * UI-only field status — includes "unknown" as a durable intentional state
 * ─────────────────────────────────────────────────────────────────────────── */

type FieldStatus = "not_added" | "estimated" | "exact" | "unknown";

function chipLabel(v: number): string {
  if (v >= 1_000_000) return `${v / 1_000_000}M`;
  if (v >= 1_000) return `${v / 1_000}k`;
  return `${v}`;
}

function statusLabel(s: FieldStatus): string {
  if (s === "estimated") return "Estimated";
  if (s === "exact") return "Exact";
  if (s === "unknown") return "Unknown";
  return "";
}

function fmtMoney(v: number | undefined | null): string | null {
  if (v == null || v === 0) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Amount picker — supports unknown as a distinct selection
 * ─────────────────────────────────────────────────────────────────────────── */

function AmountPicker({
  fieldKey,
  label,
  value,
  currentStatus,
  onChange,
  onClose,
}: {
  fieldKey: string;
  label: string;
  value: number | undefined;
  currentStatus: FieldStatus;
  onChange: (v: number | undefined, status: FieldStatus) => void;
  onClose: () => void;
}) {
  const chips = MONEY_CHIPS[fieldKey] ?? [25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];
  const increment = STEPPER_INCREMENT[fieldKey] ?? 10_000;
  const [showExact, setShowExact] = useState(false);
  const [localValue, setLocalValue] = useState<number | undefined>(value);
  const [localStatus, setLocalStatus] = useState<FieldStatus>(currentStatus);
  const exactWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalValue(value);
    setLocalStatus(currentStatus);
  }, [value, currentStatus]);

  useEffect(() => {
    if (!showExact) return;
    const input = exactWrapRef.current?.querySelector("input");
    if (input) requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }, [showExact]);

  const step = (delta: number) => {
    const next = Math.max(0, (localValue ?? 0) + delta);
    setLocalValue(next);
    setLocalStatus("estimated");
    onChange(next, "estimated");
  };

  const isUnknown = localStatus === "unknown";

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] shadow-lg overflow-hidden">
      <div className="px-5 pt-5 pb-4 space-y-4">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</p>

        {/* Quick chips */}
        <div>
          <p className="text-xs text-[var(--color-text-muted)] mb-2 uppercase tracking-wide font-medium">Quick estimate</p>
          <div className="flex flex-wrap gap-1.5">
            {/* Unknown — distinct from None/not_added */}
            <button
              type="button"
              onClick={() => {
                setLocalValue(undefined);
                setLocalStatus("unknown");
                onChange(undefined, "unknown");
              }}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium border transition-colors",
                isUnknown
                  ? "bg-[var(--color-text-muted)] border-[var(--color-text-muted)] text-white"
                  : "bg-[var(--color-readonly-bg)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-muted)]"
              )}
            >
              Unknown
            </button>
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setLocalValue(c);
                  setLocalStatus("estimated");
                  onChange(c, "estimated");
                }}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium border transition-colors",
                  localValue === c && !isUnknown
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
            >−</button>
            <span className="flex-1 text-center text-base font-semibold tabular-nums text-[var(--color-text-primary)]">
              {isUnknown ? "Unknown" : localValue != null ? `$${localValue.toLocaleString("en-US")}` : "—"}
            </span>
            <button
              type="button"
              onClick={() => step(+increment)}
              className="w-10 h-10 rounded border border-[var(--color-border)] bg-[var(--color-readonly-bg)] text-[var(--color-text-primary)] font-semibold text-lg flex items-center justify-center hover:bg-[var(--color-background)] transition-colors"
            >+</button>
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
            <div ref={exactWrapRef} className="mt-2">
              <MoneyInput
                value={localValue}
                onChange={(v) => {
                  setLocalValue(v);
                  setLocalStatus(v == null ? "not_added" : "exact");
                  onChange(v, v == null ? "not_added" : "exact");
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--color-border)] px-5 py-3 flex items-center justify-between gap-3 bg-[var(--color-readonly-bg)]">
        <span className="text-xs text-[var(--color-text-muted)]">Updates apply immediately</span>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Check className="w-3.5 h-3.5" />Done
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Field card — presentational, open state owned by PolicyCard
 * ─────────────────────────────────────────────────────────────────────────── */

function AmountFieldCard({
  fieldId,
  fieldKey,
  label,
  value,
  isOpen,
  onOpen,
  onClose,
  status,
  onChange,
}: {
  fieldId: string;
  fieldKey: string;
  label: string;
  value: number | undefined;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  status: FieldStatus;
  onChange: (v: number | undefined, s: FieldStatus) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 12;
    const maxW = 480;
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < 420 && rect.top > 420;
    const w = Math.min(Math.max(rect.width, 320), maxW, window.innerWidth - margin * 2);
    const left = Math.min(Math.max(rect.left, margin), window.innerWidth - w - margin);
    setPickerStyle({
      position: "fixed",
      left,
      width: w,
      zIndex: 9999,
      ...(above ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    reposition();
    window.addEventListener("resize", reposition, { passive: true });
    window.addEventListener("scroll", reposition, { passive: true, capture: true });
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [isOpen, reposition]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || pickerRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  const handleTriggerClick = () => { isOpen ? onClose() : onOpen(); };

  const hasValue = status !== "not_added";
  const displayValue = status === "unknown"
    ? "Unknown"
    : value != null ? `$${Math.round(value).toLocaleString("en-US")}` : null;

  const pickerEl = isOpen ? (
    <div ref={pickerRef} style={pickerStyle}>
      <AmountPicker
        fieldKey={fieldKey}
        label={label}
        value={value}
        currentStatus={status}
        onChange={onChange}
        onClose={onClose}
      />
    </div>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        id={`field-${fieldId}`}
        onClick={handleTriggerClick}
        aria-expanded={isOpen}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left group",
          isOpen
            ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] ring-2 ring-[var(--color-accent-ring)]"
            : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)]"
        )}
      >
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-normal leading-tight",
            hasValue ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-muted)]"
          )}>{label}</p>
          <p className={cn(
            "text-[15px] leading-snug mt-0.5 tabular-nums",
            hasValue ? "font-semibold text-[var(--color-text-primary)]" : "font-normal text-[var(--color-text-muted)]",
            status === "unknown" && "italic"
          )}>
            {displayValue ?? "Not added"}
          </p>
        </div>
        {/* Status pill — hidden for not_added, distinct styling per status */}
        {hasValue && (
          <span className={cn(
            "shrink-0 text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-full",
            status === "estimated" ? "text-amber-600 bg-amber-50"
              : status === "exact" ? "text-[var(--color-success)] bg-[var(--color-success-light)]"
              : status === "unknown" ? "text-[var(--color-text-muted)] bg-[var(--color-readonly-bg)]"
              : ""
          )}>
            {statusLabel(status)}
          </span>
        )}
        <Pencil className={cn(
          "w-3.5 h-3.5 shrink-0 transition-colors opacity-40 group-hover:opacity-70",
          isOpen ? "text-[var(--color-accent)] opacity-100" : "text-[var(--color-text-muted)]"
        )} />
      </button>
      {typeof document !== "undefined" && pickerEl ? createPortal(pickerEl, document.body) : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Helpers for hydrating UI state from loaded policy data
 * ─────────────────────────────────────────────────────────────────────────── */

type StatusMap = Record<string, FieldStatus>;

// Derive status for a money field — loaded non-null values default to "estimated".
function deriveMoneyStatus(v: number | undefined | null): FieldStatus {
  return v != null ? "estimated" : "not_added";
}

// All possible owner relationship values — mirrors Step 1 logic for dual-insured cases.
type OwnerRelation =
  | "same"          // same as the selected insured (single or dual)
  | "insured_1"     // same as insured 1 (dual only)
  | "insured_2"     // same as insured 2 (dual only)
  | "joint"         // jointly owned: "Insured 1 & Insured 2" (dual only)
  | "different";    // custom owner entry

function deriveOwnerRelation(
  owner: string,
  insuredVal: string,
  insuredNames: string[]
): OwnerRelation {
  if (!owner) return "same";
  if (insuredNames.length >= 2) {
    const joint = `${insuredNames[0]} & ${insuredNames[1]}`;
    if (owner === joint) return "joint";
    if (owner === insuredNames[0]) return "insured_1";
    if (owner === insuredNames[1]) return "insured_2";
    if (owner === insuredVal) return "same";
    return "different";
  }
  if (insuredVal && owner === insuredVal) return "same";
  return owner ? "different" : "same";
}

// Build the stable joint label for two insureds.
function jointLabel(names: string[]): string | null {
  return names.length >= 2 ? `${names[0]} & ${names[1]}` : null;
}

// Derive insuredSelection — recognizes individual names, joint label, or "Other".
function deriveInsuredSelection(insured: string, knownNames: string[]): string {
  if (!insured) return knownNames[0] ?? "Other";
  if (knownNames.find((n) => n === insured)) return insured;
  const jl = jointLabel(knownNames);
  if (jl && insured === jl) return jl; // joint/survivorship is a first-class recognized value
  return "Other";
}

// Derive year preset from loaded year_issued value.
function deriveYearPreset(year: number | undefined | null): YearPreset | null {
  if (year == null) return null;
  const ago = currentYear - year;
  if (ago <= 5) return "recent";
  if (ago <= 10) return "5_10";
  if (ago <= 20) return "10_20";
  return "20_plus";
}

// Derive premium preset from loaded remaining_premium_years.
function derivePremiumPreset(years: number | undefined | null): PremiumPreset | null {
  if (years == null) return null;
  if (years === 0) return "paid_up";
  if (years <= 5) return "1_5";
  if (years <= 10) return "6_10";
  return "11_plus";
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Policy card
 * ─────────────────────────────────────────────────────────────────────────── */

function PolicyCard({
  idx,
  fieldId,
  isOpen,
  onToggle,
  onRemove,
  control,
  register,
  setValue,
  watch,
  insuredNames,
  isNewPolicy,
  selectedObjectiveLabels,
}: {
  idx: number;
  fieldId: string;
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  control: ReturnType<typeof useForm<ExistingCoverage>>["control"];
  register: ReturnType<typeof useForm<ExistingCoverage>>["register"];
  setValue: ReturnType<typeof useForm<ExistingCoverage>>["setValue"];
  watch: ReturnType<typeof useForm<ExistingCoverage>>["watch"];
  insuredNames: string[];
  // Used for new-policy defaults: pre-selects insured 1 and mirrors owner.
  isNewPolicy: boolean;
  selectedObjectiveLabels: string[];
}) {
  const prefix = `policies.${idx}` as const;

  const [openFieldId, setOpenFieldId] = useState<string | null>(null);

  // ── Hydrated from loaded values ──────────────────────────────────────────
  const initialInsuredVal = watch(`${prefix}.insured`);
  const initialOwnerVal = watch(`${prefix}.policy_owner`);
  const initialDeathBenefit = watch(`${prefix}.death_benefit`);
  const initialGrossCV = watch(`${prefix}.gross_cash_value`);
  const initialCSV = watch(`${prefix}.cash_surrender_value`);
  const initialLoanBal = watch(`${prefix}.policy_loan_balance`);
  const initialPremAmt = watch(`${prefix}.premium_amount`);
  const initialYearIssued = watch(`${prefix}.year_issued`);
  const initialPremYears = watch(`${prefix}.remaining_premium_years`);
  const initialPurpose = watch(`${prefix}.purpose_of_policy`);

  // StatusMap — hydrate from loaded values (loaded non-null = estimated, not exact)
  const [statusMap, setStatusMap] = useState<StatusMap>(() => ({
    death_benefit: deriveMoneyStatus(initialDeathBenefit),
    gross_cash_value: deriveMoneyStatus(initialGrossCV),
    cash_surrender_value: deriveMoneyStatus(initialCSV),
    policy_loan_balance: deriveMoneyStatus(initialLoanBal),
    premium_amount: deriveMoneyStatus(initialPremAmt),
  }));

  // OwnerRelation — for loaded policies: derive from saved values.
  // For brand-new policies: default to "same" (isNewPolicy is only true on initial append).
  const [ownerRelation, setOwnerRelation] = useState<OwnerRelation>(() =>
    deriveOwnerRelation(
      initialOwnerVal ?? "",
      initialInsuredVal ?? "",
      insuredNames
    )
  );

  // One-time mount effect for new policies: set insured + owner to insured 1 defaults.
  // Uses a ref so it only ever fires once and is inert after hydration completes.
  const newPolicyInitRef = useRef(false);
  useEffect(() => {
    if (!isNewPolicy || newPolicyInitRef.current) return;
    newPolicyInitRef.current = true;
    const defaultInsured = insuredNames[0] ?? "";
    if (defaultInsured) {
      setValue(`${prefix}.insured`, defaultInsured);
      setValue(`${prefix}.policy_owner`, defaultInsured);
    }
    // ownerRelation stays "same" as initialized above
    setInsuredSelection(defaultInsured || "Other");
    setShowOtherInsured(!defaultInsured);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable joint label for this card's insuredNames — used in hydration and UI.
  const jl = jointLabel(insuredNames);

  // InsuredSelection — hydrate from loaded insured value; joint label is first-class.
  const [insuredSelection, setInsuredSelection] = useState<string>(() =>
    deriveInsuredSelection(initialInsuredVal ?? "", insuredNames)
  );
  const [showOtherInsured, setShowOtherInsured] = useState<boolean>(() => {
    if (!initialInsuredVal) return false;
    // Do NOT show Other input for a known individual name or the joint label.
    if (insuredNames.includes(initialInsuredVal)) return false;
    if (jl && initialInsuredVal === jl) return false;
    return true;
  });

  // YearPreset — hydrate from loaded year_issued
  const [yearPreset, setYearPreset] = useState<YearPreset | null>(() =>
    deriveYearPreset(initialYearIssued)
  );
  const [showExactYear, setShowExactYear] = useState(false);

  // PremiumPreset — hydrate from loaded remaining_premium_years
  const [premiumPreset, setPremiumPreset] = useState<PremiumPreset | null>(() =>
    derivePremiumPreset(initialPremYears)
  );
  const [showExactPremiumYears, setShowExactPremiumYears] = useState(false);

  // Purpose — build chip options from Step 2 objectives + policy-specific extras
  const purposeOptions = buildPurposeOptions(selectedObjectiveLabels);
  const allStandardPurposes = [...purposeOptions.primary, ...purposeOptions.secondary];

  // hydrate: value is "custom" (Other) if it isn't in any standard chip list
  const [showOtherPurpose, setShowOtherPurpose] = useState<boolean>(() => {
    if (!initialPurpose) return false;
    return !allStandardPurposes.includes(initialPurpose);
  });

  // Live watched values — used for summary row, active-purpose logic, and re-hydration.
  const company = watch(`${prefix}.insurance_company`);
  const policyNum = watch(`${prefix}.policy_number`);
  const policyType = watch(`${prefix}.policy_type`);
  const deathBenefit = watch(`${prefix}.death_benefit`);
  const cashValue = watch(`${prefix}.gross_cash_value`);
  const loanBalance = watch(`${prefix}.policy_loan_balance`);
  const replacement = watch(`${prefix}.under_replacement_consideration`);
  const insuredVal = watch(`${prefix}.insured`);
  const ownerVal = watch(`${prefix}.policy_owner`);
  const purposeVal = watch(`${prefix}.purpose_of_policy`);
  const yearIssuedVal = watch(`${prefix}.year_issued`);
  const premYearsVal = watch(`${prefix}.remaining_premium_years`);
  const grossCVVal = watch(`${prefix}.gross_cash_value`);
  const csvVal = watch(`${prefix}.cash_surrender_value`);
  const loanBalVal = watch(`${prefix}.policy_loan_balance`);
  const premAmtVal = watch(`${prefix}.premium_amount`);

  const isIncomplete = !company && !policyNum;
  const typeLabel = policyType ? POLICY_TYPE_LABELS[policyType] : null;

  const updateStatus = (key: string, v: number | undefined, s: FieldStatus) => {
    setStatusMap((prev) => ({ ...prev, [key]: s }));
  };

  // ── Hydration tracking ───────────────────────────────────────────────────
  // `hasHydratedUIRef` becomes true only AFTER the re-hydration effect has run
  // at least once. The owner-mirror effect checks this before writing.
  const hasHydratedUIRef = useRef(false);

  // ── Central re-hydration effect ──────────────────────────────────────────
  // Runs whenever any relevant watched value changes (including after reset()).
  // Re-derives ALL local UI state from live RHF values so the UI stays in sync.
  useEffect(() => {
    // 1. StatusMap — preserve intentional "unknown" if field is still undefined;
    //    otherwise derive from actual current value.
    setStatusMap((prev) => {
      const derive = (key: string, v: number | undefined | null): FieldStatus => {
        if (prev[key] === "unknown" && v == null) return "unknown"; // preserve intentional unknown
        return deriveMoneyStatus(v);
      };
      return {
        death_benefit: derive("death_benefit", deathBenefit),
        gross_cash_value: derive("gross_cash_value", grossCVVal),
        cash_surrender_value: derive("cash_surrender_value", csvVal),
        policy_loan_balance: derive("policy_loan_balance", loanBalVal),
        premium_amount: derive("premium_amount", premAmtVal),
      };
    });

    // 2. Insured selection
    const newInsuredSel = deriveInsuredSelection(insuredVal ?? "", insuredNames);
    setInsuredSelection(newInsuredSel);
    const isKnownInsured =
      insuredNames.includes(insuredVal ?? "") ||
      (jl != null && insuredVal === jl);
    setShowOtherInsured(!!insuredVal && !isKnownInsured);

    // 3. Owner relationship
    setOwnerRelation(
      deriveOwnerRelation(ownerVal ?? "", insuredVal ?? "", insuredNames)
    );

    // 4. Year preset — derive bucket; if value is present but doesn't match
    //    a bucket midpoint exactly, it was entered via "exact" entry.
    const derivedYear = deriveYearPreset(yearIssuedVal);
    if (yearIssuedVal == null) {
      // Do not force "unknown" — leave null (no preset selected) unless already unknown
      if (yearPreset !== "unknown") setYearPreset(null);
      setShowExactYear(false);
    } else {
      // If the value matches a preset bucket, select that bucket.
      // If no bucket matches (exact entry was used), show "exact" + open exact input.
      const bucketPreset = derivedYear;
      const bucketYear = bucketPreset ? YEAR_PRESETS.find((p) => p.id === bucketPreset)?.year : undefined;
      if (bucketPreset && bucketYear === yearIssuedVal) {
        setYearPreset(bucketPreset);
        setShowExactYear(false);
      } else {
        setYearPreset("exact");
        setShowExactYear(true);
      }
    }

    // 5. Premium preset — derive bucket; handle exact entry
    const derivedPrem = derivePremiumPreset(premYearsVal);
    if (premYearsVal == null) {
      if (premiumPreset !== "unknown") setPremiumPreset(null);
      setShowExactPremiumYears(false);
    } else if (premYearsVal === 0) {
      setPremiumPreset("paid_up");
      setShowExactPremiumYears(false);
    } else {
      const bucketYears = derivedPrem ? PREMIUM_PRESETS.find((p) => p.id === derivedPrem)?.years : undefined;
      if (derivedPrem && bucketYears === premYearsVal) {
        setPremiumPreset(derivedPrem);
        setShowExactPremiumYears(false);
      } else {
        setPremiumPreset("exact");
        setShowExactPremiumYears(true);
      }
    }

    // 6. Purpose
    const isStandardPurpose = allStandardPurposes.includes(purposeVal ?? "");
    setShowOtherPurpose(!!purposeVal && !isStandardPurpose);

    // Mark hydration complete — owner mirror effect may now run.
    hasHydratedUIRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    insuredVal, ownerVal, purposeVal,
    yearIssuedVal, premYearsVal,
    deathBenefit, grossCVVal, csvVal, loanBalVal, premAmtVal,
  ]);

  // ── Owner mirror effect ───────────────────────────────────────────────────
  // Only runs after hydration is synchronized. Writes policy_owner from
  // ownerRelation whenever the relationship or insured changes.
  useEffect(() => {
    if (!hasHydratedUIRef.current) return;
    const dual = insuredNames.length >= 2;
    if (ownerRelation === "same") {
      if (insuredVal) setValue(`${prefix}.policy_owner`, insuredVal);
    } else if (ownerRelation === "insured_1" && dual) {
      setValue(`${prefix}.policy_owner`, insuredNames[0]);
    } else if (ownerRelation === "insured_2" && dual) {
      setValue(`${prefix}.policy_owner`, insuredNames[1]);
    } else if (ownerRelation === "joint" && dual) {
      setValue(`${prefix}.policy_owner`, `${insuredNames[0]} & ${insuredNames[1]}`);
    }
    // "different" — no mirror, manual entry shown
  }, [ownerRelation, insuredVal, insuredNames, prefix, setValue]);

  // Year-issued handler
  const handleYearPreset = (preset: YearPreset) => {
    setYearPreset(preset);
    if (preset === "unknown") {
      setValue(`${prefix}.year_issued`, undefined);
      setShowExactYear(false);
    } else if (preset === "exact") {
      setShowExactYear(true);
    } else {
      const found = YEAR_PRESETS.find((p) => p.id === preset);
      if (found?.year) setValue(`${prefix}.year_issued`, found.year);
      setShowExactYear(false);
    }
  };

  // Premium-years handler
  const handlePremiumPreset = (preset: PremiumPreset) => {
    setPremiumPreset(preset);
    if (preset === "unknown") {
      setValue(`${prefix}.remaining_premium_years`, undefined);
      setShowExactPremiumYears(false);
    } else if (preset === "exact") {
      setShowExactPremiumYears(true);
    } else {
      const found = PREMIUM_PRESETS.find((p) => p.id === preset);
      if (found?.years != null) setValue(`${prefix}.remaining_premium_years`, found.years);
      else setValue(`${prefix}.remaining_premium_years`, undefined);
      setShowExactPremiumYears(false);
    }
  };

  // Live watched ownership sub-type values.
  // These fields exist in the Zod schema but TypeScript's RHF path inference doesn't
  // surface them — use (prefix + field) cast via `as any` throughout this block.
  const ownershipTypeVal = watch(`${prefix}.ownership_type` as any) as "individual" | "business" | "trust" | undefined;

  // Convenience alias for setValue that bypasses the strict path union.
  const setVal = (path: string, value: unknown, opts?: object) =>
    (setValue as (p: any, v: any, o?: any) => void)(path, value, opts);

  // Clear stale sub-type fields when owner type changes — mirrors Step 1 handleOwnerTypeChange.
  const handleOwnerTypeChange = (v: "individual" | "business" | "trust") => {
    setVal(`${prefix}.ownership_type`, v, { shouldValidate: true });
    if (v !== "business") setVal(`${prefix}.business_type`, undefined);
    if (v !== "trust") {
      setVal(`${prefix}.trust_type`, undefined);
      setVal(`${prefix}.grantor_trust`, undefined);
      setVal(`${prefix}.gst_exempt`, undefined);
    }
  };

  // When owner relationship changes — mirrors Step 1 handleRelChange.
  // Clears business/trust fields when leaving the "different" branch.
  const handleOwnerRelationChange = (rel: OwnerRelation) => {
    const prev = ownerRelation;
    setOwnerRelation(rel);
    if (rel !== "different") {
      // Clear ownership sub-type fields when returning to a same-owner path
      if (prev === "different") {
        setVal(`${prefix}.ownership_type`, "individual");
        setVal(`${prefix}.business_type`, undefined);
        setVal(`${prefix}.trust_type`, undefined);
        setVal(`${prefix}.grantor_trust`, undefined);
        setVal(`${prefix}.gst_exempt`, undefined);
      }
    } else {
      // Switching TO different — clear carry-over trust/business from previous owner
      setVal(`${prefix}.business_type`, undefined);
      setVal(`${prefix}.trust_type`, undefined);
      setVal(`${prefix}.grantor_trust`, undefined);
      setVal(`${prefix}.gst_exempt`, undefined);
    }
  };

  // Purpose handler — clear field when switching TO Other if current value is standard
  const handlePurposePreset = (p: string) => {
    if (p === "Other") {
      setShowOtherPurpose(true);
      // Only clear if the current value is a standard purpose chip
      if (allStandardPurposes.includes(purposeVal ?? "")) {
        setValue(`${prefix}.purpose_of_policy`, "");
      }
      // Otherwise preserve the custom value
    } else {
      setShowOtherPurpose(false);
      setValue(`${prefix}.purpose_of_policy`, p);
    }
  };

  // Insured selection handler — pill-based for individual names, joint label, and Other.
  const handleInsuredSelect = (name: string) => {
    if (name === "Other") {
      setInsuredSelection("Other");
      setShowOtherInsured(true);
      setValue(`${prefix}.insured`, "");
      // Do not auto-sync owner when switching to custom entry
    } else {
      setInsuredSelection(name);
      setShowOtherInsured(false);
      setValue(`${prefix}.insured`, name);
      // Sync owner only when relation explicitly follows insured
      if (ownerRelation === "same") {
        setValue(`${prefix}.policy_owner`, name);
      }
    }
  };

  const activePurposePreset = (() => {
    if (!purposeVal) return showOtherPurpose ? "Other" : null;
    if (allStandardPurposes.includes(purposeVal)) return purposeVal;
    return showOtherPurpose ? "Other" : null;
  })();

  return (
    <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
      {/* ── Collapsed summary row ─────────────────────────────────── */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 bg-[var(--color-surface)] hover:bg-[var(--color-readonly-bg)] transition-colors text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] shrink-0">
            Policy {idx + 1}
          </span>
          {isIncomplete ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] italic">
              <AlertCircle size={12} className="text-amber-500" />
              Incomplete
            </span>
          ) : (
            <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
              {company || "—"}
              {policyNum ? (
                <span className="font-normal text-[var(--color-text-secondary)]"> · {policyNum}</span>
              ) : null}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0 ml-3">
          {typeLabel && (
            <span className="hidden sm:block text-xs px-2 py-0.5 rounded bg-[var(--color-readonly-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
              {typeLabel}
            </span>
          )}
          {deathBenefit != null && deathBenefit > 0 && (
            <span className="hidden md:block text-xs font-semibold tabular-nums text-[var(--color-text-primary)]">
              DB {fmtMoney(deathBenefit)}
            </span>
          )}
          {cashValue != null && cashValue > 0 && (
            <span className="hidden lg:block text-xs tabular-nums text-[var(--color-text-secondary)]">
              CV {fmtMoney(cashValue)}
            </span>
          )}
          {/* Loan balance — surfaced when present */}
          {loanBalance != null && loanBalance > 0 && (
            <span className="hidden lg:block text-xs tabular-nums text-[var(--color-text-secondary)]">
              Loan {fmtMoney(loanBalance)}
            </span>
          )}
          {replacement === "yes" && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-medium">
              Replacement
            </span>
          )}
          {isOpen
            ? <ChevronUp size={16} className="text-[var(--color-text-muted)]" />
            : <ChevronDown size={16} className="text-[var(--color-text-muted)]" />}
        </div>
      </button>

      {/* ─��� Expanded editor ───────────────────────────────────────── */}
      {isOpen && (
        <div className="border-t border-[var(--color-border)] px-5 py-5 space-y-7">

          {/* ── Section 1: Policy identity ──────────────────────── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-4">
              Policy identity
            </p>
            <div className="space-y-4">

              <FormField label="Insurance company">
                <TextInput
                  {...register(`${prefix}.insurance_company`)}
                  placeholder="Carrier name"
                />
              </FormField>

              <FormField label="Policy number" hint="Leave blank if unknown">
                <TextInput
                  {...register(`${prefix}.policy_number`)}
                  placeholder="Policy # (optional)"
                />
              </FormField>

              {/* Insured — pill-based; adds joint/survivorship for dual-insured */}
              <div>
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Insured</p>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {insuredNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleInsuredSelect(name)}
                        className={cn(
                          "px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors",
                          insuredSelection === name
                            ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                            : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        )}
                      >{name}</button>
                    ))}
                    {/* Joint / survivorship — dual-insured only; uses stable jl */}
                    {jl && (
                      <button
                        type="button"
                        onClick={() => handleInsuredSelect(jl)}
                        className={cn(
                          "px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors",
                          insuredSelection === jl
                            ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                            : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        )}
                      >Joint / survivorship</button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleInsuredSelect("Other")}
                      className={cn(
                        "px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors",
                        insuredSelection === "Other"
                          ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                          : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      )}
                    >Other</button>
                  </div>
                  {showOtherInsured && (
                    <TextInput {...register(`${prefix}.insured`)} placeholder="Insured name" />
                  )}
                </div>
              </div>

              {/* Policy owner — relationship selector + full Step 1 owner subform for "different" */}
              <div>
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Policy owner</p>
                <div className="space-y-3">
                  {insuredNames.length >= 2 ? (
                    // Dual-insured: pill grid matching Step 1 dual options
                    <div className="flex flex-wrap gap-2">
                      {(["same", "insured_1", "insured_2", "joint", "different"] as OwnerRelation[]).map((rel) => {
                        const labelMap: Record<OwnerRelation, string> = {
                          same: "Same as insured",
                          insured_1: `Same as ${insuredNames[0] || "Insured 1"}`,
                          insured_2: `Same as ${insuredNames[1] || "Insured 2"}`,
                          joint: "Jointly owned",
                          different: "Different owner",
                        };
                        return (
                          <button
                            key={rel}
                            type="button"
                            onClick={() => handleOwnerRelationChange(rel)}
                            className={cn(
                              "px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors",
                              ownerRelation === rel
                                ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                                : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                            )}
                          >{labelMap[rel]}</button>
                        );
                      })}
                    </div>
                  ) : (
                    // Single-insured: simple two-option segmented control
                    <SegmentedControl
                      options={[
                        { value: "same", label: "Same as insured" },
                        { value: "different", label: "Different owner" },
                      ]}
                      value={ownerRelation === "different" ? "different" : "same"}
                      onChange={(v) => handleOwnerRelationChange(v as OwnerRelation)}
                    />
                  )}

                  {/* ── Different owner: full Step 1-style subform ── */}
                  {ownerRelation === "different" && (
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-readonly-bg)] px-4 py-4 space-y-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                        Owner details
                      </p>

                      {/* Owner type */}
                      <FormField label="Owner type">
                        <SegmentedControl
                          options={OWNERSHIP_OPTIONS}
                          value={ownershipTypeVal ?? "individual"}
                          onChange={handleOwnerTypeChange}
                        />
                      </FormField>

                      {/* Owner name / entity */}
                      <FormField label="Policy owner">
                        <TextInput
                          {...register(`${prefix}.policy_owner`)}
                          placeholder="Name or entity"
                        />
                      </FormField>

                      {/* Business details subcard */}
                      {ownershipTypeVal === "business" && (
                        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-4">
                            Business details
                          </p>
                          <FormField label="Business entity type">
                            <div className="flex flex-wrap gap-2">
                              {BUSINESS_TYPE_OPTIONS.map((opt) => {
                                const isSelected = watch(`${prefix}.business_type` as any) === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() =>
                                      setVal(`${prefix}.business_type`, opt.value, { shouldValidate: true })
                                    }
                                    className={cn(
                                      "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                                      isSelected
                                        ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                                        : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </FormField>
                        </div>
                      )}

                      {/* Trust details subcard */}
                      {ownershipTypeVal === "trust" && (
                        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-4">
                            Trust details
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <FormField label="Trust type">
                              <SegmentedControl
                                options={TRUST_OPTIONS}
                                value={watch(`${prefix}.trust_type` as any)}
                                onChange={(v) => setVal(`${prefix}.trust_type`, v, { shouldValidate: true })}
                              />
                            </FormField>
                            <FormField label="Grantor trust">
                              <SegmentedControl
                                options={YES_NO}
                                value={watch(`${prefix}.grantor_trust` as any)}
                                onChange={(v) => setVal(`${prefix}.grantor_trust`, v, { shouldValidate: true })}
                              />
                            </FormField>
                            <FormField label="GST exempt">
                              <SegmentedControl
                                options={YES_NO}
                                value={watch(`${prefix}.gst_exempt` as any)}
                                onChange={(v) => setVal(`${prefix}.gst_exempt`, v, { shouldValidate: true })}
                              />
                            </FormField>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Policy type */}
              <div>
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Policy type</p>
                <Controller
                  control={control}
                  name={`${prefix}.policy_type`}
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-2">
                      {policyTypeEnum.options.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => field.onChange(field.value === v ? undefined : v)}
                          className={cn(
                            "px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors",
                            field.value === v
                              ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                              : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                          )}
                        >{POLICY_TYPE_LABELS[v]}</button>
                      ))}
                    </div>
                  )}
                />
              </div>

              {/* Year issued — guided presets; Unknown stays visually selected */}
              <div>
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Year issued</p>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {YEAR_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleYearPreset(p.id)}
                        className={cn(
                          "px-3 py-1.5 rounded border text-xs font-medium transition-colors",
                          yearPreset === p.id
                            ? p.id === "unknown"
                              ? "bg-[var(--color-text-muted)] border-[var(--color-text-muted)] text-white"
                              : "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                            : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        )}
                      >{p.label}</button>
                    ))}
                  </div>
                  {showExactYear && (
                    <TextInput
                      {...register(`${prefix}.year_issued`, { valueAsNumber: true })}
                      type="number"
                      placeholder="e.g. 2010"
                      min={1900}
                      max={2100}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Policy values ─────────────────────────── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-4">
              Policy values
            </p>
            <div className="space-y-2">
              {(["death_benefit", "gross_cash_value", "cash_surrender_value", "policy_loan_balance"] as const).map((key) => {
                const fid = `${fieldId}.${key}`;
                const labelMap: Record<string, string> = {
                  death_benefit: "Death benefit",
                  gross_cash_value: "Gross cash value",
                  cash_surrender_value: "Cash surrender value",
                  policy_loan_balance: "Policy loan balance",
                };
                return (
                  <Controller
                    key={key}
                    control={control}
                    name={`${prefix}.${key}`}
                    render={({ field }) => (
                      <AmountFieldCard
                        fieldId={fid}
                        fieldKey={key}
                        label={labelMap[key]}
                        value={field.value}
                        isOpen={openFieldId === fid}
                        onOpen={() => setOpenFieldId(fid)}
                        onClose={() => setOpenFieldId(null)}
                        status={statusMap[key]}
                        onChange={(v, s) => { field.onChange(v); updateStatus(key, v, s); }}
                      />
                    )}
                  />
                );
              })}
            </div>
          </div>

          {/* ── Section 3: Premium & duration ───────────────────── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-4">
              Premium &amp; duration
            </p>
            <div className="space-y-4">

              <Controller
                control={control}
                name={`${prefix}.premium_amount`}
                render={({ field }) => {
                  const fid = `${fieldId}.premium_amount`;
                  return (
                    <AmountFieldCard
                      fieldId={fid}
                      fieldKey="premium_amount"
                      label="Annual premium"
                      value={field.value}
                      isOpen={openFieldId === fid}
                      onOpen={() => setOpenFieldId(fid)}
                      onClose={() => setOpenFieldId(null)}
                      status={statusMap.premium_amount}
                      onChange={(v, s) => { field.onChange(v); updateStatus("premium_amount", v, s); }}
                    />
                  );
                }}
              />

              {/* Remaining premium years — Unknown stays visually selected */}
              <div>
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Remaining premium years</p>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {PREMIUM_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePremiumPreset(p.id)}
                        className={cn(
                          "px-3 py-1.5 rounded border text-xs font-medium transition-colors",
                          premiumPreset === p.id
                            ? p.id === "unknown"
                              ? "bg-[var(--color-text-muted)] border-[var(--color-text-muted)] text-white"
                              : "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                            : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        )}
                      >{p.label}</button>
                    ))}
                  </div>
                  {showExactPremiumYears && (
                    <TextInput
                      {...register(`${prefix}.remaining_premium_years`, { valueAsNumber: true })}
                      type="number"
                      placeholder="e.g. 10"
                      min={0}
                      max={100}
                    />
                  )}
                </div>
              </div>

              {/* Purpose of policy — primary row from Step 2 objectives, secondary for policy-specific */}
              <div>
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Purpose of policy</p>
                <div className="space-y-2">
                  {/* Row 1: Step 2 objective labels */}
                  {purposeOptions.primary.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {purposeOptions.primary.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePurposePreset(p)}
                          className={cn(
                            "px-3 py-1.5 rounded border text-xs font-medium transition-colors",
                            activePurposePreset === p
                              ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                              : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                          )}
                        >{p}</button>
                      ))}
                    </div>
                  )}
                  {/* Row 2: policy-specific + Other */}
                  <div className="flex flex-wrap gap-2">
                    {purposeOptions.secondary.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePurposePreset(p)}
                        className={cn(
                          "px-3 py-1.5 rounded border text-xs font-medium transition-colors",
                          activePurposePreset === p
                            ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                            : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        )}
                      >{p}</button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handlePurposePreset("Other")}
                      className={cn(
                        "px-3 py-1.5 rounded border text-xs font-medium transition-colors",
                        activePurposePreset === "Other"
                          ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                          : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      )}
                    >Other</button>
                  </div>
                  {showOtherPurpose && (
                    <TextInput
                      {...register(`${prefix}.purpose_of_policy`)}
                      placeholder="Describe purpose…"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 4: Review context ────────────────────────── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-4">
              Review context
            </p>
            <FormField label="Under replacement consideration?">
              <Controller
                control={control}
                name={`${prefix}.under_replacement_consideration`}
                render={({ field }) => (
                  <SegmentedControl
                    options={YES_NO}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>
          </div>

          {/* Remove */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1.5 text-xs text-[var(--color-error)] hover:underline"
            >
              <Trash2 size={13} />
              Remove policy {idx + 1}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Root step component
 * ─────────────────────────────────────────────────────────────────────────── */

export function PPStep4ExistingCoverage() {
  const { formData, patch, markComplete, goNext } = usePPWizard();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  // Track which field indices were just added (new) vs loaded from existing data
  const [newPolicyIndices, setNewPolicyIndices] = useState<Set<number>>(new Set());

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<ExistingCoverage>({
      resolver: zodResolver(existingCoverageSchema),
      defaultValues: formData.existing_coverage ?? {
        has_existing_coverage: undefined as unknown as "yes" | "no",
        policies: [],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "policies" });
  const hasCoverage = watch("has_existing_coverage");

  const insuredNames: string[] = (formData.insured_owner?.insureds ?? [])
    .map((i) => i.name)
    .filter(Boolean);

  // Step 2 selected objectives → canonical labels for Step 4 purpose chips
  const selectedObjectiveLabels: string[] = (formData.objectives?.selected ?? [])
    .map((obj) => OBJECTIVE_LABELS[obj as keyof typeof OBJECTIVE_LABELS])
    .filter(Boolean);

  useEffect(() => {
    if (formData.existing_coverage) {
      reset(formData.existing_coverage as ExistingCoverage);
      // Loaded policies are never "new" — clear the new-policy index set on every reload.
      setNewPolicyIndices(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.existing_coverage]);

  function handleAddPolicy() {
    if (fields.length >= MAX_POLICIES) return;
    const newIdx = fields.length;
    const prefilled = {
      ...EMPTY_POLICY,
      insured: insuredNames[0] ?? "",
      policy_owner: insuredNames[0] ?? "",
    };
    append(prefilled);
    setOpenIdx(newIdx);
    setNewPolicyIndices((prev) => new Set([...prev, newIdx]));
  }

  function handleRemove(idx: number) {
    remove(idx);
    setNewPolicyIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => { if (i < idx) next.add(i); else if (i > idx) next.add(i - 1); });
      return next;
    });
    setOpenIdx((prev) =>
      prev === idx ? null : prev != null && prev > idx ? prev - 1 : prev
    );
  }

  const onValid = (data: ExistingCoverage) => {
    patch({ existing_coverage: data });
    markComplete(4);
    goNext();
  };

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed">
        Record any life insurance currently in force. This information is used to assess existing
        coverage adequacy and identify replacement considerations.
      </p>

      <PPSectionCard>
        <FormField
          label="Does the client have existing life insurance in force?"
          error={(errors.has_existing_coverage as { message?: string } | undefined)?.message}
          required
        >
          <Controller
            control={control}
            name="has_existing_coverage"
            render={({ field }) => (
              <SegmentedControl
                options={YES_NO}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>
      </PPSectionCard>

      {hasCoverage === "yes" && (
        <div className="mt-5 space-y-3">
          {errors.policies && !Array.isArray(errors.policies) && (
            <p className="text-sm text-[var(--color-error)] mb-1">
              {(errors.policies as { message?: string }).message}
            </p>
          )}

          {fields.map((field, idx) => (
            <PolicyCard
              key={field.id}
              idx={idx}
              fieldId={field.id}
              isOpen={openIdx === idx}
              onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
              onRemove={() => handleRemove(idx)}
              control={control}
              register={register}
              setValue={setValue}
              watch={watch}
              insuredNames={insuredNames}
              isNewPolicy={newPolicyIndices.has(idx)}
              selectedObjectiveLabels={selectedObjectiveLabels}
            />
          ))}

          {fields.length < MAX_POLICIES && (
            <button
              type="button"
              onClick={handleAddPolicy}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-lg border-2 border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-colors"
            >
              <Plus size={15} />
              Add policy
            </button>
          )}
          {fields.length >= MAX_POLICIES && (
            <p className="text-xs text-center text-[var(--color-text-muted)] py-2">
              Maximum of {MAX_POLICIES} policies reached.
            </p>
          )}
        </div>
      )}

      <PPStepFooter />
    </form>
  );
}
