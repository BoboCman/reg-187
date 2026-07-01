"use client";
import React from "react";
import {
  inferDesignEmphasis,
  deriveFinancialTotals,
  OBJECTIVE_LABELS,
  type PolicyPlanIntake,
  type EmphasisLevel,
} from "@/lib/policyplan/schema";
import { detectSuitabilityTensions } from "@/lib/policyplan/rules";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Internal primitives (also exported for use in PPConfirmationScreen)
// ---------------------------------------------------------------------------
export function EmphasisBadge({ level }: { level: EmphasisLevel }) {
  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide",
        level === "high" &&
          "bg-[var(--color-accent-light)] text-[var(--color-accent)]",
        level === "moderate" &&
          "bg-[var(--color-success-light)] text-[var(--color-success)]",
        level === "low" &&
          "bg-[var(--color-readonly-bg)] text-[var(--color-text-muted)]"
      )}
    >
      {level}
    </span>
  );
}

export function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-[var(--color-border)] last:border-0">
      <span className="text-sm text-[var(--color-text-muted)] shrink-0">
        {label}
      </span>
      <span className="text-sm font-medium text-[var(--color-text-primary)] text-right">
        {value}
      </span>
    </div>
  );
}

export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PPCaseReview — pure display, no wizard context, no form state.
// Used by both PPConfirmationScreen (post-submit) and the read-only detail view.
// ---------------------------------------------------------------------------
export function PPCaseReview({
  intake,
  caseId,
}: {
  intake: PolicyPlanIntake;
  caseId?: string | null;
}) {
  const emphasis = inferDesignEmphasis({
    objectives: intake.objectives,
    risk_preferences: intake.risk_preferences,
    policy_specs: intake.policy_specs,
  });

  const col1 = intake.financial?.columns?.client_1;
  const totals = col1 ? deriveFinancialTotals(col1) : null;

  const dbDuration = intake.policy_specs?.death_benefit_duration;
  const premDuration = intake.policy_specs?.premium_duration;

  const dbLabel =
    dbDuration?.mode === "age"
      ? `Attained age ${dbDuration.age}`
      : dbDuration?.mode === "scale"
      ? (DB_SCALE_LABELS[dbDuration.scale_point] ?? dbDuration.scale_point)
      : "—";

  const premLabel =
    premDuration?.mode === "age"
      ? `Attained age ${premDuration.age}`
      : premDuration?.mode === "scale"
      ? (PREMIUM_SCALE_LABELS[premDuration.scale_point] ?? premDuration.scale_point)
      : "—";

  // Tension flags — shared rule module, not inline
  const suitabilityFlags = detectSuitabilityTensions(intake, emphasis);

  const insuredNames = intake.insured_owner.insureds
    .map((i) => i.name)
    .filter(Boolean)
    .join(" & ");

  return (
    <div className="space-y-5">
      {/* Case ID chip */}
      {caseId && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)] font-mono bg-[var(--color-readonly-bg)] px-2.5 py-1 rounded border border-[var(--color-border)]">
            Case {caseId}
          </span>
          {insuredNames && (
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              {insuredNames}
            </span>
          )}
        </div>
      )}

      {/* Suitability tension callouts */}
      {suitabilityFlags.map((flag) => (
        <div
          key={flag.code}
          className="rounded-lg border border-amber-300 bg-[var(--color-warning-light)] px-5 py-4"
        >
          <p className="text-sm font-semibold text-[var(--color-warning)] mb-1">
            Advisor review required — design tension detected
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {flag.description}
          </p>
          {flag.requirement && (
            <p className="text-xs text-[var(--color-text-muted)] mt-2 font-mono">
              §{flag.requirement}
            </p>
          )}
        </div>
      ))}

      {/* Insured & owner */}
      <SectionCard title="Insured and owner">
        {intake.insured_owner.insureds.map((ins, i) => (
          <div key={i} className={i > 0 ? "mt-3 pt-3 border-t border-[var(--color-border)]" : ""}>
            <Row
              label={
                intake.insured_owner.insureds.length > 1
                  ? `Insured ${i + 1}`
                  : "Insured"
              }
              value={ins.name}
            />
            {ins.dob && <Row label="Date of birth" value={ins.dob} />}
            {ins.gender && <Row label="Gender" value={ins.gender} />}
            {ins.nicotine_use && (
              <Row label="Nicotine use" value={ins.nicotine_use} />
            )}
          </div>
        ))}
        {intake.insured_owner.policy_owner && (
          <Row label="Policy owner" value={intake.insured_owner.policy_owner} />
        )}
        <Row label="Ownership type" value={intake.insured_owner.ownership_type} />
        {intake.insured_owner.trust_type && (
          <Row label="Trust type" value={intake.insured_owner.trust_type} />
        )}
        {intake.insured_owner.state_of_ownership && (
          <Row label="State" value={intake.insured_owner.state_of_ownership} />
        )}
      </SectionCard>

      {/* Objectives */}
      <SectionCard title="Objectives">
        <Row
          label="Primary"
          value={OBJECTIVE_LABELS[intake.objectives.primary]}
        />
        {intake.objectives.selected.filter(
          (o) => o !== intake.objectives.primary
        ).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {intake.objectives.selected
              .filter((o) => o !== intake.objectives.primary)
              .map((o) => (
                <span
                  key={o}
                  className="px-3 py-1 rounded-full border border-[var(--color-border-strong)] text-xs text-[var(--color-text-secondary)] bg-[var(--color-background)]"
                >
                  {OBJECTIVE_LABELS[o]}
                </span>
              ))}
          </div>
        )}
      </SectionCard>

      {/* Financial summary */}
      {totals && (
        <SectionCard title="Financial summary — Client 1">
          <Row
            label="Annual income"
            value={
              col1?.annual_income != null
                ? `$${Math.round(col1.annual_income).toLocaleString("en-US")}`
                : "—"
            }
          />
          <Row
            label="Total liquid assets"
            value={`$${Math.round(totals.total_liquid_assets).toLocaleString("en-US")}`}
          />
          <Row
            label="Total assets"
            value={`$${Math.round(totals.total_assets).toLocaleString("en-US")}`}
          />
          <Row
            label="Total liabilities"
            value={`$${Math.round(totals.total_liabilities).toLocaleString("en-US")}`}
          />
          <Row
            label="Net worth"
            value={`$${Math.round(totals.net_worth).toLocaleString("en-US")}`}
          />
          <Row
            label="Liquid net worth (funding capacity)"
            value={
              <span className="font-semibold text-[var(--color-text-primary)]">
                ${Math.round(totals.liquid_net_worth).toLocaleString("en-US")}
              </span>
            }
          />
          {intake.financial?.expected_source_of_premium && (
            <Row
              label="Premium source"
              value={intake.financial.expected_source_of_premium}
            />
          )}
        </SectionCard>
      )}

      {/* Policy specifications */}
      <SectionCard title="Policy specifications">
        {intake.policy_specs?.desired_death_benefit != null && (
          <Row
            label="Target death benefit"
            value={`$${Math.round(intake.policy_specs.desired_death_benefit).toLocaleString("en-US")}`}
          />
        )}
        <Row label="Coverage duration" value={dbLabel} />
        {intake.policy_specs?.desired_premium != null && (
          <Row
            label="Target annual premium"
            value={`$${Math.round(intake.policy_specs.desired_premium).toLocaleString("en-US")}`}
          />
        )}
        <Row label="Premium payment period" value={premLabel} />
      </SectionCard>

      {/* Inferred design emphasis */}
      <SectionCard title="Inferred design emphasis">
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Derived from the client profile — not entered by the client. Phase 2
          will use these signals to score and rank product designs.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              ["Guarantee protection", "guarantee_protection"],
              ["Growth orientation", "growth_orientation"],
              ["Cash access priority", "cash_access"],
              ["Cost sensitivity", "cost_sensitivity"],
            ] as [string, keyof typeof emphasis][]
          ).map(([label, key]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded border border-[var(--color-border)] px-4 py-3"
            >
              <span className="text-sm text-[var(--color-text-secondary)]">
                {label}
              </span>
              <EmphasisBadge level={emphasis[key] as EmphasisLevel} />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Phase 2 placeholder */}
      <SectionCard title="Recommendation — Phase 2 placeholder">
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          The analysis and recommendation layer will be populated by the
          server-side pipeline in Phase 2.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--color-success)] uppercase tracking-wide mb-2">
              Favorable considerations
            </p>
            <ul className="space-y-1">
              {[
                "Permanent coverage matches estate-planning horizon",
                "Guaranteed death benefit aligns with client preference",
                "ILIT structure supports estate tax efficiency",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]"
                >
                  <span className="mt-0.5 text-[var(--color-success)]">+</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--color-warning)] uppercase tracking-wide mb-2">
              Unfavorable considerations
            </p>
            <ul className="space-y-1">
              {[
                "Premium commitment may exceed stated funding capacity",
                "Survivorship GUL with beyond-100 coverage commands a higher outlay",
                "Inflexibility of guaranteed product limits future adjustment",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]"
                >
                  <span className="mt-0.5 text-[var(--color-warning)]">–</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Attestation */}
      <SectionCard title="Attestation">
        <Row label="Signed by" value={intake.attestation.owner_signature} />
        <Row label="Date" value={intake.attestation.signed_date} />
        {intake.attestation.signer_title && (
          <Row
            label="Title / capacity"
            value={intake.attestation.signer_title}
          />
        )}
      </SectionCard>
    </div>
  );
}
