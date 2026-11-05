/**
 * Deterministic objective-to-design rules (companion-rules.v1).
 * Produces structured observations from verified facts + the client brief.
 * No scores, no suitability labels, no product judgement.
 */
import {
  VERSIONS,
  type ClientBrief,
  type EvidencePacket,
  type ExtractedFact,
  type Observation,
} from "./contracts";

export const RULES_VERSION = VERSIONS.rules;

const OBJECTIVE_LABEL: Record<string, string> = {
  family_protection: "protecting family or beneficiaries",
  lifetime_coverage: "coverage for life",
  estate_liquidity: "estate liquidity or wealth transfer",
  business_continuity: "business continuity or key-person protection",
  cash_accumulation: "building cash value",
  supplemental_income: "supplemental future income",
  other: "another stated purpose",
};
export const objectiveLabel = (code: string | null | undefined) => (code ? OBJECTIVE_LABEL[code] ?? code : "not stated");

/** Client statements become facts too, so every claim has typed lineage. */
export function declarationFacts(brief: ClientBrief): ExtractedFact[] {
  const out: ExtractedFact[] = [];
  const add = (key: string, label: string, value: ExtractedFact["value"], unit: ExtractedFact["unit"]) =>
    out.push({
      fact_id: `f.brief.${key}`,
      semantic_key: `brief_${key}`,
      label,
      value,
      unit,
      source_refs: [`e.brief.${key}`],
      status: "verified",
      material: true,
    });
  if (brief.primary_objective)
    add("primary_objective", "Primary purpose the client described", brief.primary_objective === "other" ? brief.primary_objective_other ?? "other" : objectiveLabel(brief.primary_objective), "text");
  if (brief.secondary_objective) add("secondary_objective", "Secondary purpose", objectiveLabel(brief.secondary_objective), "text");
  if (brief.coverage_need_amount && brief.coverage_need_basis && brief.coverage_need_basis !== "not_yet_determined")
    add("coverage_need_amount", "Coverage amount the client or advisor identified", brief.coverage_need_amount, "usd");
  if (brief.target_horizon?.type === "age" && brief.target_horizon.value) add("target_age", "Age the coverage needs to reach", brief.target_horizon.value, "age");
  if (brief.target_horizon?.type === "years" && brief.target_horizon.value) add("target_years", "Years the coverage needs to last", brief.target_horizon.value, "years");
  return out;
}

export function declarationRefs(brief: ClientBrief) {
  return declarationFacts(brief).map((f) => ({
    evidence_id: f.source_refs[0],
    source_document_id: null,
    evidence_type: "client_declaration" as const,
    verification_status: "verified" as const,
    measure_identity: f.semantic_key,
    raw_excerpt_redacted: `Producer-entered client objective brief (${VERSIONS.brief}).`,
  }));
}

type F = Map<string, ExtractedFact>;
const ok = (m: F, id: string) => m.get(id)?.status === "verified" && m.get(id)?.value != null;
const val = <T>(m: F, id: string) => m.get(id)?.value as T | undefined;
const refsOf = (m: F, ids: string[]) => ids.flatMap((id) => m.get(id)?.source_refs ?? []);

export function runRules(packet: EvidencePacket, brief: ClientBrief): Observation[] {
  const m: F = new Map([...packet.facts, ...declarationFacts(brief)].map((f) => [f.fact_id, f]));
  const obs: Observation[] = [];
  const pri = brief.top_priority;
  const objective = brief.primary_objective;
  const survivorship = packet.insured_structure === "survivorship";
  const nonGuaranteedProduct = ["IUL", "UL", "VUL", "WL"].includes(packet.product_class);

  const push = (o: Omit<Observation, "source_refs" | "priority_score"> & { boost?: number }) => {
    const { boost = 0, ...rest } = o;
    const sev = { material: 3, moderate: 2, minor: 1 }[o.severity];
    const verified = o.fact_ids.every((id) => !id.startsWith("f.") || ok(m, id) || id.startsWith("f.brief."));
    obs.push({
      ...rest,
      source_refs: [...new Set(refsOf(m, o.fact_ids))].slice(0, 12),
      priority_score: sev * 10 + boost + (verified ? 2 : 0),
    });
  };

  const guarantee = val<boolean>(m, "f.guarantee_present") === true;
  const gEnd = val<number>(m, "f.guarantee_end_age");
  const gConditionsOk = ok(m, "f.guarantee_conditions") && ok(m, "f.guarantee_end_age") && ok(m, "f.guarantee_name");
  const gScen = val<number>(m, "f.guaranteed_scenario_coverage_through_age");
  const illThrough = val<number>(m, "f.illustrated_coverage_through_age");
  const years = val<number>(m, "f.premium_payment_years");
  const throughEnd = val<boolean>(m, "f.premium_outlay_through_final_year") === true;

  // 1 · Guarantee depends on payment conditions
  if (guarantee) {
    push({
      observation_id: "o.guarantee_conditions",
      category: "payment_conditions",
      trigger: "A coverage guarantee is described and it depends on how premiums are paid.",
      related_objective: pri === "guarantees" ? "top_priority:guarantees" : undefined,
      fact_ids: ["f.guarantee_name", "f.guarantee_end_age", "f.guarantee_conditions", "f.planned_premium_outlay"],
      rule_id: "R-GUAR-COND",
      severity: "material",
      status: gConditionsOk ? "supported" : "verification_required",
      external_candidate: gConditionsOk,
      client_heading: "Payment conditions",
      editorial_guidance:
        "Explain that the guarantee to the stated age holds only if the conditions listed in the illustration are met (premium timing and amount, and no loans, withdrawals or death benefit changes other than illustrated). Name the guarantee by its carrier name. Do not call it lifetime or unconditional.",
      review_action: gConditionsOk
        ? "Confirm the guarantee conditions match the carrier's provision page."
        : "Check the guarantee provision, its end age and its conditions on the illustration before sharing.",
      boost: pri === "guarantees" ? 6 : 2,
    });
  }

  // 2 · Horizon versus guarantee / guaranteed-basis coverage
  const h = brief.target_horizon;
  const lastAge = packet.ledger.length ? packet.ledger[packet.ledger.length - 1].age : null;
  // A guarantee that runs to the last illustrated age leaves no "after the guarantee" gap to discuss.
  const guaranteeSpansLedger = gEnd != null && lastAge != null && gEnd >= lastAge;
  if (h && h.type !== "unknown" && !guaranteeSpansLedger) {
    const basisClear = !survivorship || /younger|older|insured_/.test(m.get("f.guarantee_end_age")?.age_basis ?? "");
    if ((h.type === "lifetime" || h.type === "second_death") && guarantee && gEnd != null && !/lifetime/i.test(m.get("f.guarantee_end_age")?.label ?? "")) {
      push({
        observation_id: "o.horizon_beyond_guarantee",
        category: "horizon",
        trigger: "The client wants permanent coverage and the guarantee is described as ending at a stated age.",
        related_objective: `horizon:${h.type}`,
        fact_ids: ["f.guarantee_end_age", "f.illustrated_coverage_through_age", "f.guaranteed_scenario_coverage_through_age"],
        rule_id: "R-HORIZON",
        severity: "material",
        status: ok(m, "f.guarantee_end_age") && basisClear ? "supported" : "verification_required",
        external_candidate: ok(m, "f.guarantee_end_age") && basisClear,
        client_heading: "Coverage after the guarantee",
        editorial_guidance:
          "State that the client described wanting coverage for life, that the guarantee is described to the stated age, and that coverage after that age depends on non-guaranteed values in the illustration. Do not say the policy will or will not last.",
        review_action: basisClear ? "Discuss how coverage after the guarantee end age is supported." : "Confirm which insured's age the guarantee endpoint uses.",
        boost: 5,
      });
    } else if (h.type === "age" && h.value && gEnd != null && ok(m, "f.guarantee_end_age") && basisClear) {
      const beyond = h.value > gEnd;
      push({
        observation_id: beyond ? "o.horizon_beyond_guarantee" : "o.horizon_within_guarantee",
        category: "horizon",
        trigger: beyond ? "The target age is later than the guarantee end age." : "The target age falls within the guarantee period.",
        related_objective: "horizon:age",
        fact_ids: ["f.brief.target_age", "f.guarantee_end_age", "f.guarantee_conditions"],
        rule_id: "R-HORIZON",
        severity: beyond ? "material" : "minor",
        status: "supported",
        external_candidate: beyond,
        client_heading: beyond ? "Coverage after the guarantee" : undefined,
        editorial_guidance: beyond
          ? "State the target age the client gave and that the guarantee is described to an earlier age; coverage between the two depends on non-guaranteed values."
          : "May note the target age is within the guarantee period, always with the guarantee conditions.",
        review_action: beyond ? "Discuss the gap between the target age and the guarantee end age." : "None.",
        boost: beyond ? 5 : 0,
      });
    } else if ((h.type === "lifetime" || h.type === "second_death") && !guarantee && gScen != null && illThrough != null && gScen < illThrough) {
      push({
        observation_id: "o.horizon_beyond_guarantee",
        category: "horizon",
        trigger: "Permanent coverage is the goal and the guaranteed columns end before the illustrated columns.",
        related_objective: `horizon:${h.type}`,
        fact_ids: ["f.guaranteed_scenario_coverage_through_age", "f.illustrated_coverage_through_age"],
        rule_id: "R-HORIZON",
        severity: "material",
        status: ok(m, "f.guaranteed_scenario_coverage_through_age") ? "supported" : "verification_required",
        external_candidate: ok(m, "f.guaranteed_scenario_coverage_through_age"),
        client_heading: "Coverage after guaranteed values end",
        editorial_guidance:
          "Explain that on guaranteed charges and rates the illustration shows coverage to the earlier age, and that later coverage depends on non-guaranteed assumptions.",
        review_action: "Discuss what supports coverage after the guaranteed columns end.",
        boost: 5,
      });
    }
  }

  // 3 · Reliance on non-guaranteed assumptions
  if (nonGuaranteedProduct && gScen != null && illThrough != null && gScen < illThrough) {
    push({
      observation_id: "o.reliance_on_assumptions",
      category: "reliance_on_assumptions",
      trigger: "Guaranteed columns end before the illustrated columns.",
      related_objective: pri === "guarantees" ? "top_priority:guarantees" : pri === "growth" ? "top_priority:growth" : undefined,
      fact_ids: ["f.guaranteed_scenario_coverage_through_age", "f.illustrated_coverage_through_age", "f.illustrated_rate"],
      rule_id: "R-RELIANCE",
      severity: "material",
      status: ok(m, "f.guaranteed_scenario_coverage_through_age") && ok(m, "f.illustrated_rate") ? "supported" : "verification_required",
      external_candidate: ok(m, "f.guaranteed_scenario_coverage_through_age") && ok(m, "f.illustrated_rate"),
      client_heading: "Reliance on assumptions",
      editorial_guidance:
        "Explain plainly that the illustrated values assume the illustrated rate and current charges continue, that they are not guaranteed, and that on guaranteed assumptions the illustration shows coverage to an earlier age. If the client prefers guarantees, note this is worth discussing.",
      review_action: "Make sure the client sees the guaranteed columns, not only the illustrated ones.",
      boost: pri === "guarantees" ? 6 : pri === "growth" ? 3 : 2,
    });
  }

  // 4 · Long funding commitment versus funding comfort
  if (years != null && ok(m, "f.premium_payment_years")) {
    const long = years >= 20 || throughEnd;
    const uneasy = brief.funding_comfort && ["uncertain", "requires_source", "not_discussed"].includes(brief.funding_comfort);
    if (long || uneasy) {
      push({
        observation_id: "o.funding_commitment",
        category: "payment_conditions",
        trigger: uneasy ? "The producer recorded funding as uncertain or not yet discussed." : "The illustration assumes a long run of planned outlays.",
        related_objective: brief.funding_comfort ? `funding:${brief.funding_comfort}` : undefined,
        fact_ids: ["f.planned_premium_outlay", "f.premium_payment_years", ...(ok(m, "f.last_premium_age") ? ["f.last_premium_age"] : [])],
        rule_id: "R-FUNDING",
        severity: uneasy ? "material" : "moderate",
        status: "supported",
        external_candidate: true,
        client_heading: "Funding commitment",
        editorial_guidance: throughEnd
          ? "Explain that the illustration assumes the planned outlay continues every year it shows, and that paying less or stopping can change the values and any guarantee. No affordability statement."
          : "Explain how long the illustration assumes the planned outlay continues and that changes can affect values and any guarantee. No affordability statement.",
        review_action: uneasy ? "Confirm the funding source before sharing." : "None.",
        boost: uneasy ? 6 : pri === "low_outlay" || pri === "flexibility" ? 4 : 1,
      });
    }
  }

  // 5 · Access to cash value
  const wantsCash =
    pri === "cash_access" ||
    brief.secondary_priority === "cash_access" ||
    objective === "cash_accumulation" ||
    objective === "supplemental_income" ||
    brief.followups?.access_need === "needed";
  const sv5 = val<number>(m, "f.ledger.y5.sv_current");
  const cum5 = val<number>(m, "f.ledger.y5.cumulative_outlay");
  const scEnd = val<number>(m, "f.surrender_charge_end_year");
  if (sv5 != null && cum5 != null && ok(m, "f.ledger.y5.sv_current") && ok(m, "f.ledger.y5.cumulative_outlay") && sv5 < cum5) {
    push({
      observation_id: "o.access_to_cash",
      category: "access_to_cash",
      trigger: "Early net surrender values are below total outlay to date.",
      related_objective: wantsCash ? "cash_access" : undefined,
      fact_ids: ["f.ledger.y5.sv_current", "f.ledger.y5.cumulative_outlay", ...(scEnd != null && ok(m, "f.surrender_charge_end_year") ? ["f.surrender_charge_end_year"] : [])],
      rule_id: "R-CASH",
      severity: wantsCash ? "material" : "moderate",
      status: "supported",
      external_candidate: wantsCash || pri === "flexibility",
      client_heading: "Access to cash value",
      editorial_guidance:
        "Explain that in the early years the illustrated net surrender value (what would be paid on surrender after charges) is below the total paid in, and when surrender charges end if provided. Use the year-5 figures as tokens. Do not call it accessible or available cash.",
      review_action: "None.",
      boost: wantsCash ? 6 : 0,
    });
  }

  // 6 · Income objective versus what the illustration shows
  if (objective === "supplemental_income" || brief.secondary_objective === "supplemental_income") {
    const dist = val<boolean | null>(m, "f.distributions_illustrated");
    push({
      observation_id: "o.income_strategy",
      category: "income_strategy",
      trigger: dist ? "Income is a goal and the illustration shows loans or withdrawals." : "Income is a goal and the illustration shows no loans or withdrawals.",
      related_objective: "supplemental_income",
      fact_ids: ["f.distributions_illustrated", ...(dist ? ["f.distribution_schedule"] : [])],
      rule_id: "R-INCOME",
      severity: "material",
      status: dist === false ? "supported" : "verification_required",
      external_candidate: dist === false,
      client_heading: "Future income",
      editorial_guidance:
        dist === false
          ? "Say the illustration does not show any loans or withdrawals, so it does not show future income from the policy; any income plan would need its own illustration. No tax statement."
          : "Internal only: verify the illustrated loan or withdrawal schedule and its effect on values and death benefit.",
      review_action: dist === false ? "Request an illustration that shows the intended income, if that is the plan." : "Check the loan or withdrawal schedule and its effect on coverage.",
      boost: 6,
    });
  }

  // 7 · Coverage amount relationship (factual only)
  const need = brief.coverage_need_amount;
  const idb = val<number>(m, "f.initial_death_benefit");
  if (brief.coverage_need_basis === "not_yet_determined") {
    push({
      observation_id: "o.amount_not_established",
      category: "coverage_amount",
      trigger: "No coverage need amount was established.",
      fact_ids: [],
      rule_id: "R-AMOUNT",
      severity: "minor",
      status: "supported",
      external_candidate: false,
      editorial_guidance: "Never describe the death benefit as sufficient or matched to a need.",
      review_action: "Do not describe the amount as sufficient.",
    });
  } else if (need && idb != null && ok(m, "f.initial_death_benefit") && need > idb) {
    push({
      observation_id: "o.amount_below_need",
      category: "coverage_amount",
      trigger: "The illustrated initial death benefit is lower than the amount the brief records.",
      related_objective: "coverage_need",
      fact_ids: ["f.brief.coverage_need_amount", "f.initial_death_benefit"],
      rule_id: "R-AMOUNT",
      severity: "moderate",
      status: "supported",
      external_candidate: true,
      client_heading: "Coverage amount",
      editorial_guidance: "State both amounts as facts (the amount identified and the illustrated initial death benefit). No adequacy judgement.",
      review_action: "Confirm the intended coverage amount.",
      boost: 4,
    });
  }

  // 8 · Existing coverage connection
  if (brief.existing_policy_connection === "yes" || brief.existing_policy_connection === "unsure") {
    push({
      observation_id: "o.existing_coverage",
      category: "existing_coverage",
      trigger: `The producer answered "${brief.existing_policy_connection}" to replacing, reducing or funding from an existing policy.`,
      fact_ids: [],
      rule_id: "R-EXISTING",
      severity: "material",
      status: "supported",
      external_candidate: true,
      client_heading: "Existing coverage to review",
      editorial_guidance:
        "Neutral: say this proposal may affect an existing policy, that this companion does not compare the two, and that the existing coverage needs its own review, including any required replacement forms. Never say the change is better or worse.",
      review_action: "Complete the separate existing-policy review and any required replacement forms.",
      boost: 8,
    });
  }

  // 9 · Ownership, estate or business purpose
  if (objective === "estate_liquidity" || objective === "business_continuity" || brief.objective_holder === "owner_trust" || brief.objective_holder === "owner_business") {
    push({
      observation_id: "o.ownership_structure",
      category: "ownership_structure",
      trigger: "Estate, trust or business purpose recorded.",
      related_objective: objective ?? undefined,
      fact_ids: ["f.brief.primary_objective"],
      rule_id: "R-OWNERSHIP",
      severity: "moderate",
      status: "supported",
      external_candidate: true,
      client_heading: "Ownership and tax questions",
      editorial_guidance:
        "Say that ownership, beneficiary and any tax or estate effects are outside this companion and should be confirmed with the client's attorney or tax adviser. No tax or legal conclusion.",
      review_action: "Confirm owner, payor and beneficiary arrangements outside this document.",
      boost: 3,
    });
  }

  // 10 · Temporary coverage inside the death benefit
  if (ok(m, "f.term_coverage_amount")) {
    push({
      observation_id: "o.temporary_coverage",
      category: "coverage_components",
      trigger: "Part of the death benefit is term or temporary coverage.",
      fact_ids: ["f.term_coverage_amount", "f.initial_death_benefit"],
      rule_id: "R-TERM-COMPONENT",
      severity: "material",
      status: "supported",
      external_candidate: true,
      client_heading: "Temporary coverage",
      editorial_guidance: "Say part of the illustrated death benefit is term or temporary coverage that may not last as long as the base coverage. Give its amount as a token.",
      review_action: "Check when the temporary coverage ends.",
      boost: 5,
    });
  }

  // 11 · Whole life dividends, VUL market risk
  if (packet.product_class === "WL") {
    push({
      observation_id: "o.dividends_not_guaranteed",
      category: "reliance_on_assumptions",
      trigger: "Whole life illustration with dividends.",
      fact_ids: ["f.dividend_option", "f.illustrated_rate"].filter((id) => m.has(id)),
      rule_id: "R-WL-DIV",
      severity: "material",
      status: ok(m, "f.dividend_option") ? "supported" : "verification_required",
      external_candidate: ok(m, "f.dividend_option"),
      client_heading: "Dividends are not guaranteed",
      editorial_guidance: "Explain that dividends, and any coverage or values they buy, are not guaranteed and can be lower or zero.",
      review_action: "Confirm the dividend option illustrated.",
      boost: 4,
    });
  }
  if (packet.product_class === "VUL") {
    push({
      observation_id: "o.market_risk",
      category: "reliance_on_assumptions",
      trigger: "Variable life: values depend on subaccount performance.",
      fact_ids: ["f.illustrated_rate"],
      rule_id: "R-VUL",
      severity: "material",
      status: "verification_required",
      external_candidate: false,
      editorial_guidance: "Securities-linked; distribution of any companion requires broker-dealer approval.",
      review_action: "Variable life needs separate broker-dealer approval before any client use.",
      boost: 6,
    });
  }

  // 12 · Evidence gaps on material facts
  for (const f of packet.facts) {
    if (!f.material || f.status === "verified") continue;
    if (f.fact_id === "f.guarantee_end_age" && obs.some((o) => o.observation_id === "o.guarantee_conditions")) {
      // already raised through the guarantee observation
    }
    push({
      observation_id: `o.gap_${f.fact_id.replace(/^f\./, "").replace(/\./g, "_")}`,
      category: "evidence_gap",
      trigger: `${f.label}: ${f.status.replace("_", " ")}.`,
      fact_ids: [f.fact_id],
      rule_id: "R-EVIDENCE",
      severity: "material",
      status: "verification_required",
      external_candidate: false,
      editorial_guidance: "Do not mention this fact in client copy.",
      review_action: `Check "${f.label}" on the illustration${f.notes?.length ? ` (${f.notes[0]})` : ""}.`,
    });
  }
  for (const w of packet.extraction_warnings.slice(0, 6)) {
    push({
      observation_id: `o.warn_${obs.length}`,
      category: "evidence_gap",
      trigger: w.slice(0, 160),
      fact_ids: [],
      rule_id: "R-EXTRACTION-WARNING",
      severity: "moderate",
      status: "verification_required",
      external_candidate: false,
      editorial_guidance: "Internal only.",
      review_action: w.slice(0, 300),
    });
  }

  return obs.sort((a, b) => b.priority_score - a.priority_score);
}

/** At most three client-facing considerations, highest priority first. */
export function selectConsiderations(obs: Observation[], max = 3): Observation[] {
  const seen = new Set<string>();
  return obs
    .filter((o) => o.external_candidate && o.status === "supported")
    .filter((o) => {
      const k = o.client_heading ?? o.category;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, max);
}

/** Material items the producer must check before approval. */
export function verificationItems(obs: Observation[]): Observation[] {
  // An existing policy is always the producer's to review, even when the client page mentions it.
  return obs.filter((o) => (o.status === "verification_required" && o.severity !== "minor") || o.category === "existing_coverage");
}
