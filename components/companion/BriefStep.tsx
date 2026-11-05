"use client";
import { useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { briefMissing, type ClientBrief } from "@/lib/companion/contracts";
import { cn } from "@/lib/utils";
import { api, errorMessage, type CaseView } from "./api";

type Opt<T extends string> = [T, string];

function Choice<T extends string>({ value, options, onChange, name }: { value: T | null | undefined; options: Opt<T>[]; onChange: (v: T) => void; name: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
      {options.map(([k, l]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          onClick={() => onChange(k)}
          className={cn(
            "min-h-9 rounded-lg px-3 py-1.5 text-left text-sm ring-1 ring-inset transition-colors",
            value === k ? "bg-[var(--color-accent)] text-white ring-[var(--color-accent)]" : "bg-[var(--color-surface)] text-[var(--color-text-primary)] ring-[var(--color-border)] hover:bg-[var(--color-readonly-bg)]",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function Q({ n, title, hint, children, missing }: { n: string; title: string; hint?: string; children: React.ReactNode; missing?: boolean }) {
  return (
    <section className={cn("rounded-xl border bg-[var(--color-surface)] p-5 space-y-3", missing ? "border-amber-300" : "border-[var(--color-border)]")}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{n}</p>
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h3>
        {hint && <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const OBJECTIVES: Opt<NonNullable<ClientBrief["primary_objective"]>>[] = [
  ["family_protection", "Protect family or beneficiaries"],
  ["lifetime_coverage", "Coverage for life"],
  ["estate_liquidity", "Estate liquidity or wealth transfer"],
  ["business_continuity", "Business continuity or key person"],
  ["cash_accumulation", "Build cash value"],
  ["supplemental_income", "Supplemental future income"],
  ["other", "Something else"],
];
const PRIORITIES: Opt<NonNullable<ClientBrief["top_priority"]>>[] = [
  ["guarantees", "Guarantees"],
  ["flexibility", "Premium flexibility"],
  ["cash_access", "Access to cash"],
  ["growth", "Growth potential"],
  ["low_outlay", "Lower outlay"],
  ["other", "Other"],
];

/** Step 2: the client objective, in six questions plus follow-ups only when they apply. */
export function BriefStep({ view, onChange }: { view: CaseView; onChange: () => void }) {
  const [b, setB] = useState<ClientBrief>(view.brief);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const missing = useMemo(() => briefMissing(b), [b]);
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<ClientBrief>) => {
    setSaved(false);
    setB((x) => ({ ...x, ...patch }));
  };
  const fu = (patch: Partial<ClientBrief["followups"]>) => set({ followups: { ...b.followups, ...patch } });
  const pc = view.evidence?.product_class;
  const has = (id: string) => view.evidence?.facts.some((f) => f.fact_id === id && f.status === "verified" && f.value != null && f.value !== false && !(Array.isArray(f.value) && !f.value.length));
  const accessQ = b.primary_objective === "cash_accumulation" || b.primary_objective === "supplemental_income" || b.top_priority === "cash_access" || has("f.distributions_illustrated");
  const guaranteeQ = pc === "IUL" || pc === "VUL" || pc === "UL" || b.top_priority === "guarantees";
  const ownerQ = b.objective_holder === "owner_trust" || b.objective_holder === "owner_business";
  const riderQ = has("f.riders_included");
  const changedAfterDraft = !!view.output && ["draft", "final"].includes(view.output.status);
  const miss = (k: string) => tried && missing.some((m) => m.startsWith(k));

  async function save() {
    setTried(true);
    setBusy(true);
    setErr(null);
    try {
      const body: ClientBrief = {
        ...b,
        coverage_need_amount: b.coverage_need_basis === "not_yet_determined" ? null : b.coverage_need_amount ?? null,
        followups: {
          ...(accessQ ? { access_start: b.followups.access_start ?? null, access_need: b.followups.access_need ?? null } : {}),
          ...(guaranteeQ ? { guarantee_central: b.followups.guarantee_central ?? null } : {}),
          ...(ownerQ ? { owner_role_note: b.followups.owner_role_note ?? null } : {}),
          ...(riderQ ? { rider_matters: b.followups.rider_matters ?? null } : {}),
        },
      };
      await api(`/api/companion/cases/${view.id}/brief`, "PUT", body);
      setSaved(true);
      onChange();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const field = "h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)]";

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Record what the client told you. These are your notes of the client&apos;s statements; the companion quotes them as &ldquo;You told your advisor…&rdquo;. &ldquo;Not discussed&rdquo; is a valid answer.
      </p>

      <Q n="Question 1" title="What is the coverage mainly for?" missing={miss("primary_objective")}>
        <Choice name="Primary purpose" value={b.primary_objective} options={OBJECTIVES} onChange={(v) => set({ primary_objective: v })} />
        {b.primary_objective === "other" && <input className={field} maxLength={160} placeholder="In a few words" value={b.primary_objective_other ?? ""} onChange={(e) => set({ primary_objective_other: e.target.value })} />}
        <label className="block text-sm">
          <span className="text-[var(--color-text-secondary)]">Second purpose (optional)</span>
          <select className={cn(field, "mt-1")} value={b.secondary_objective ?? ""} onChange={(e) => set({ secondary_objective: (e.target.value || null) as ClientBrief["secondary_objective"] })}>
            <option value="">None</option>
            {OBJECTIVES.filter(([k]) => k !== b.primary_objective && k !== "other").map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-[var(--color-text-secondary)]">Whose objective is it?</span>
          <select className={cn(field, "mt-1")} value={b.objective_holder ?? ""} onChange={(e) => set({ objective_holder: (e.target.value || null) as ClientBrief["objective_holder"] })}>
            <option value="">Not specified</option>
            <option value="insured">The insured</option>
            <option value="owner_trust">A trust that will own the policy</option>
            <option value="owner_business">A business that will own the policy</option>
            <option value="family">The family</option>
            <option value="not_discussed">Not discussed</option>
          </select>
        </label>
        {ownerQ && <input className={field} maxLength={200} placeholder="Owner's role, without names (e.g. irrevocable trust as owner and beneficiary)" value={b.followups.owner_role_note ?? ""} onChange={(e) => fu({ owner_role_note: e.target.value })} />}
      </Q>

      <Q n="Question 2" title="How was the amount of coverage set?" missing={miss("coverage_need")}>
        <Choice
          name="Coverage basis"
          value={b.coverage_need_basis}
          options={[
            ["advisor_analysis", "From a needs analysis"],
            ["client_target", "Client's own target"],
            ["existing_plan", "From an existing plan"],
            ["not_yet_determined", "Not yet determined"],
          ]}
          onChange={(v) => set({ coverage_need_basis: v })}
        />
        {b.coverage_need_basis && b.coverage_need_basis !== "not_yet_determined" && (
          <label className="block text-sm sm:max-w-xs">
            <span className="text-[var(--color-text-secondary)]">Amount the client needs</span>
            <input
              className={cn(field, "mt-1")}
              inputMode="numeric"
              placeholder="$"
              value={b.coverage_need_amount ? b.coverage_need_amount.toLocaleString("en-US") : ""}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                set({ coverage_need_amount: n > 0 ? n : null });
              }}
            />
          </label>
        )}
      </Q>

      <Q n="Question 3" title="How long does the coverage need to last?" missing={miss("target_horizon")}>
        <Choice
          name="Horizon"
          value={b.target_horizon?.type}
          options={[
            ["lifetime", "For life"],
            ["age", "To a certain age"],
            ["years", "For a number of years"],
            ...(view.evidence?.insured_structure === "survivorship" ? ([["second_death", "Until the second death"]] as Opt<"second_death">[]) : []),
            ["unknown", "Not discussed"],
          ]}
          onChange={(v) => set({ target_horizon: { type: v, value: v === "age" || v === "years" ? b.target_horizon?.value ?? null : null } })}
        />
        {(b.target_horizon?.type === "age" || b.target_horizon?.type === "years") && (
          <input
            className={cn(field, "sm:max-w-[160px]")}
            inputMode="numeric"
            placeholder={b.target_horizon.type === "age" ? "Age" : "Years"}
            value={b.target_horizon.value ?? ""}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/[^0-9]/g, ""));
              set({ target_horizon: { type: b.target_horizon!.type, value: n > 0 && n <= 121 ? n : null } });
            }}
          />
        )}
      </Q>

      <Q n="Question 4" title="How comfortable is the client with the planned premiums?" missing={miss("funding_comfort")}>
        <Choice
          name="Funding"
          value={b.funding_comfort}
          options={[
            ["expected", "Expects to pay as illustrated"],
            ["uncertain", "Not yet certain"],
            ["requires_source", "Depends on another source of money"],
            ["not_discussed", "Not discussed"],
            ["other", "Other"],
          ]}
          onChange={(v) => set({ funding_comfort: v })}
        />
        {(b.funding_comfort === "requires_source" || b.funding_comfort === "other" || b.funding_comfort === "uncertain") && (
          <input className={field} maxLength={300} placeholder="Short note, no names or account numbers" value={b.funding_notes ?? ""} onChange={(e) => set({ funding_notes: e.target.value })} />
        )}
      </Q>

      <Q n="Question 5" title="What matters most in this policy?" missing={miss("top_priority")}>
        <Choice name="Top priority" value={b.top_priority} options={PRIORITIES} onChange={(v) => set({ top_priority: v })} />
        <label className="block text-sm sm:max-w-xs">
          <span className="text-[var(--color-text-secondary)]">Second (optional)</span>
          <select className={cn(field, "mt-1")} value={b.secondary_priority ?? ""} onChange={(e) => set({ secondary_priority: (e.target.value || null) as ClientBrief["secondary_priority"] })}>
            <option value="">None</option>
            {PRIORITIES.filter(([k]) => k !== b.top_priority).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </Q>

      <Q n="Question 6" title="Does this replace, reduce or get funded from an existing policy?" missing={miss("existing_policy")}>
        <Choice
          name="Existing policy"
          value={b.existing_policy_connection}
          options={[
            ["no", "No"],
            ["yes", "Yes"],
            ["unsure", "Not sure"],
          ]}
          onChange={(v) => set({ existing_policy_connection: v })}
        />
        {b.existing_policy_connection === "yes" && <p className="text-sm text-amber-800">The companion will note that the existing coverage needs its own review. It does not compare the two policies.</p>}
      </Q>

      {(accessQ || guaranteeQ || riderQ) && (
        <Q n="Follow-up" title="A few details for this design">
          {accessQ && (
            <>
              <p className="text-sm text-[var(--color-text-secondary)]">When might the client want to use the cash value?</p>
              <Choice
                name="Access start"
                value={b.followups.access_start}
                options={[
                  ["within_10_years", "Within 10 years"],
                  ["after_10_years", "After 10 years"],
                  ["not_planned", "Not planned"],
                  ["not_discussed", "Not discussed"],
                ]}
                onChange={(v) => fu({ access_start: v })}
              />
            </>
          )}
          {guaranteeQ && (
            <>
              <p className="text-sm text-[var(--color-text-secondary)]">Is the guarantee or the accumulation more central to the client?</p>
              <Choice
                name="Guarantee central"
                value={b.followups.guarantee_central}
                options={[
                  ["guarantee_central", "The guarantee"],
                  ["accumulation_central", "The accumulation"],
                  ["both", "Both"],
                  ["not_discussed", "Not discussed"],
                ]}
                onChange={(v) => fu({ guarantee_central: v })}
              />
            </>
          )}
          {riderQ && (
            <>
              <p className="text-sm text-[var(--color-text-secondary)]">Do the riders on this illustration matter to the client?</p>
              <Choice
                name="Riders"
                value={b.followups.rider_matters}
                options={[
                  ["yes", "Yes"],
                  ["no", "No"],
                  ["not_discussed", "Not discussed"],
                ]}
                onChange={(v) => fu({ rider_matters: v })}
              />
            </>
          )}
        </Q>
      )}

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2">
        <label className="block text-sm">
          <span className="text-[var(--color-text-secondary)]">Anything else the client said that matters (optional)</span>
          <textarea className={cn(field, "mt-1 h-20 py-2")} maxLength={500} value={b.other_notes ?? ""} onChange={(e) => set({ other_notes: e.target.value })} />
        </label>
        <p className="text-xs text-[var(--color-text-muted)]">Do not include names, account numbers or health details. This note is screened before drafting and never printed as is.</p>
      </section>

      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      {changedAfterDraft && <p className="text-sm text-amber-800">Changing answers after a draft exists starts a new revision. Any earlier approval is superseded and kept in the history.</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">{missing.length ? `${missing.length} answer${missing.length === 1 ? "" : "s"} still needed` : saved ? <span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Saved</span> : "All six answered"}</p>
        <button type="button" disabled={busy} onClick={save} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save client objective
        </button>
      </div>
    </div>
  );
}
