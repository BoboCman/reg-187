"use client";
import type { LidqIntake } from "@/lib/lidq-schema";
import {
  OBJECTIVE_LABELS,
  DESIGN_ELEMENT_LABELS,
  deriveFinancialTotals,
} from "@/lib/lidq-schema";
import { formatMoney } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

interface Props {
  intake: LidqIntake;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[var(--color-border)] last:border-0">
      <span className="text-sm text-[var(--color-text-muted)] shrink-0">{label}</span>
      <span className="text-sm text-[var(--color-text-primary)] text-right font-medium">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
      <div className="px-6 py-3 bg-[var(--color-background)] border-b border-[var(--color-border)]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {title}
        </h2>
      </div>
      <div className="px-6 py-2">{children}</div>
    </div>
  );
}

function rankLabel(r: number) {
  const s: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };
  return s[r] ?? String(r);
}

export function ConfirmationScreen({ intake }: Props) {
  const { insured_info, financial, objectives, new_policy_specs, design_priorities, risk_tolerance, attestation } = intake;

  const client1Totals = deriveFinancialTotals(financial.columns.client_1);
  const sortedPriorities = (Object.entries(design_priorities) as [string, number][])
    .sort((a, b) => a[1] - b[1]);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Success banner */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-[var(--color-success-light)] border-2 border-[var(--color-success)] flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-[var(--color-success)]" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            LIDQ submitted
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)] max-w-md">
            The intake questionnaire has been validated and recorded in memory. Persistence will be wired in phase 2.
          </p>
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Signed by <strong>{attestation.owner_signature}</strong> on {attestation.signed_date}
          </p>
        </div>

        <div className="space-y-5">
          {/* Insured */}
          <Section title="Insured information">
            {insured_info.clients.map((c, i) => (
              <Row
                key={i}
                label={`Client ${i + 1}`}
                value={`${c.name}${c.dob ? ` — ${c.dob}` : ""}${c.gender ? `, ${c.gender}` : ""}`}
              />
            ))}
            <Row label="Ownership" value={insured_info.ownership_type} />
            {insured_info.policy_owner && (
              <Row label="Policy owner" value={insured_info.policy_owner} />
            )}
          </Section>

          {/* Financial summary */}
          <Section title="Financial summary (client 1)">
            <Row label="Annual income" value={`$${formatMoney(financial.columns.client_1.annual_income)}`} />
            <Row label="Total assets" value={`$${formatMoney(client1Totals.total_assets)}`} />
            <Row label="Total liabilities" value={`$${formatMoney(client1Totals.total_liabilities)}`} />
            <Row label="Net worth" value={`$${formatMoney(client1Totals.net_worth)}`} />
            <Row label="Liquid net worth" value={`$${formatMoney(client1Totals.liquid_net_worth)}`} />
          </Section>

          {/* Objectives */}
          <Section title="Objectives">
            <Row
              label="Primary"
              value={OBJECTIVE_LABELS[objectives.primary]}
            />
            <Row
              label="All selected"
              value={objectives.selected.map((o) => OBJECTIVE_LABELS[o]).join(", ")}
            />
          </Section>

          {/* Policy specs */}
          <Section title="New policy specifications">
            {new_policy_specs.desired_death_benefit && (
              <Row label="Death benefit" value={`$${formatMoney(new_policy_specs.desired_death_benefit)}`} />
            )}
            {new_policy_specs.death_benefit_duration && (
              <Row
                label="Duration"
                value={
                  new_policy_specs.death_benefit_duration.mode === "scale"
                    ? new_policy_specs.death_benefit_duration.scale_point.replace(/_/g, " ")
                    : `Age ${new_policy_specs.death_benefit_duration.age}`
                }
              />
            )}
            {new_policy_specs.desired_premium && (
              <Row label="Desired premium" value={`$${formatMoney(new_policy_specs.desired_premium)}`} />
            )}
            {new_policy_specs.premium_duration && (
              <Row
                label="Premium duration"
                value={
                  new_policy_specs.premium_duration.mode === "scale"
                    ? new_policy_specs.premium_duration.scale_point.replace(/_/g, " ")
                    : `Age ${new_policy_specs.premium_duration.age}`
                }
              />
            )}
          </Section>

          {/* Design priorities */}
          <Section title="Design priorities">
            {sortedPriorities.map(([el, rank]) => (
              <Row
                key={el}
                label={rankLabel(rank)}
                value={DESIGN_ELEMENT_LABELS[el as keyof typeof DESIGN_ELEMENT_LABELS]}
              />
            ))}
          </Section>

          {/* Suitability tension callout */}
          {design_priorities.premium_level === 1 &&
            new_policy_specs.death_benefit_duration?.mode === "scale" &&
            new_policy_specs.death_benefit_duration.scale_point === "beyond_age_100" &&
            risk_tolerance.q8_accept_higher_premium_risk === "strongly_disagree" && (
              <div className="rounded-lg bg-[var(--color-warning-light)] border border-[var(--color-warning)] p-5">
                <p className="text-sm font-semibold text-[var(--color-warning)] mb-1">
                  Suitability tension flagged
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Premium level is the top design priority, the desired coverage extends beyond age 100,
                  and the client strongly disagrees with accepting higher premium risk. This combination
                  signals a design tension that requires advisor review before product selection.
                </p>
              </div>
            )}

          {/* Schema version */}
          <p className="text-xs text-center text-[var(--color-text-muted)]">
            Schema version {intake.schema_version} · LIDQ digital intake phase 1
          </p>
        </div>
      </div>
    </div>
  );
}
