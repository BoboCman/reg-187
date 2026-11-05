/**
 * Trusted content planner (companion-planner.v1).
 * Chooses page modules by product family and evidence, builds the fact band
 * from verified values, and hands the writer one short brief per block. The
 * writer never picks figures; it may only reference allowed fact tokens.
 */
import {
  VERSIONS,
  type ClientBrief,
  type CompanionPlan,
  type EvidencePacket,
  type ExtractedFact,
  type FactBandItem,
  type Observation,
  type PlannedBlock,
} from "./contracts";
import { formatFactValue } from "./format";
import { screenText } from "./privacy";
import { declarationFacts, selectConsiderations } from "./rules";

type Family = CompanionPlan["design_family"];

export function designFamily(packet: EvidencePacket, brief: ClientBrief): Family {
  if (packet.insured_structure === "survivorship") return "survivorship_estate";
  if (packet.product_class === "WL") return "whole_life";
  if (packet.product_class === "VUL") return "variable";
  if (brief.primary_objective === "supplemental_income") return "income";
  if (brief.primary_objective === "cash_accumulation") return "accumulation";
  return "protection";
}

export function allFacts(packet: EvidencePacket, brief: ClientBrief): Map<string, ExtractedFact> {
  return new Map([...packet.facts, ...declarationFacts(brief)].map((f) => [f.fact_id, f]));
}

const verified = (m: Map<string, ExtractedFact>, id: string) => m.get(id)?.status === "verified" && m.get(id)?.value != null;

function factBand(m: Map<string, ExtractedFact>, packet: EvidencePacket): FactBandItem[] {
  const band: FactBandItem[] = [];
  const survivorship = packet.insured_structure === "survivorship";
  if (verified(m, "f.initial_death_benefit"))
    band.push({
      key: "death_benefit",
      label: "Illustrated initial death benefit",
      fact_ids: ["f.initial_death_benefit"],
      display: formatFactValue(m.get("f.initial_death_benefit")!),
      qualifier: survivorship ? "Paid at the second death" : packet.insured_structure === "joint_first_death" ? "Paid at the first death" : "Paid at the insured's death",
    });
  if (verified(m, "f.planned_premium_outlay")) {
    const mode = verified(m, "f.premium_mode") ? String(m.get("f.premium_mode")!.value).toLowerCase() : null;
    const level = m.get("f.premium_schedule_level")?.value === true;
    band.push({
      key: "outlay",
      label: "Planned premium outlay",
      fact_ids: ["f.planned_premium_outlay", ...(mode ? ["f.premium_mode"] : [])],
      display: `${formatFactValue(m.get("f.planned_premium_outlay")!)} a year`,
      qualifier: level ? `As illustrated${mode && mode !== "annual" ? `, paid ${mode}` : ""}; not a guaranteed premium` : "Year-one amount; the illustrated schedule changes later",
    });
  }
  if (verified(m, "f.premium_payment_years") && m.get("f.premium_schedule_level")?.value === true) {
    const yrs = formatFactValue(m.get("f.premium_payment_years")!);
    const age = verified(m, "f.last_premium_age") ? formatFactValue(m.get("f.last_premium_age")!) : null;
    const throughEnd = m.get("f.premium_outlay_through_final_year")?.value === true;
    band.push({
      key: "payment_period",
      label: "Planned payment period",
      fact_ids: ["f.premium_payment_years", ...(age ? ["f.last_premium_age"] : [])],
      display: age ? `To age ${age}` : `${yrs} years`,
      qualifier: throughEnd
        ? `Every year the illustration shows (${yrs} years)`
        : `${yrs} years of planned outlay${survivorship ? "; ages use the illustration's age basis" : ""}`,
    });
  }
  const g = m.get("f.guarantee_present")?.value === true;
  if (g && verified(m, "f.guarantee_end_age") && verified(m, "f.guarantee_conditions") && verified(m, "f.guarantee_name")) {
    band.push({
      key: "guarantee",
      label: "Coverage guarantee",
      fact_ids: ["f.guarantee_end_age", "f.guarantee_name", "f.guarantee_conditions"],
      display: `To age ${formatFactValue(m.get("f.guarantee_end_age")!)}`,
      qualifier: "Only if premiums and policy activity follow the illustration",
    });
  } else if (verified(m, "f.guaranteed_scenario_coverage_through_age")) {
    band.push({
      key: "guarantee",
      label: "Coverage on guaranteed assumptions",
      fact_ids: ["f.guaranteed_scenario_coverage_through_age"],
      display: `To age ${formatFactValue(m.get("f.guaranteed_scenario_coverage_through_age")!)}`,
      qualifier: "Guaranteed columns, if premiums are paid as illustrated",
    });
  } else {
    band.push({ key: "guarantee", label: "Coverage guarantee", fact_ids: ["f.guarantee_present"], display: "See carrier illustration", qualifier: "Not determined from the illustration text" });
  }
  return band.slice(0, 4);
}

const pick = (m: Map<string, ExtractedFact>, ids: string[]) => ids.filter((id) => verified(m, id));

export function buildPlan(
  packet: EvidencePacket,
  brief: ClientBrief,
  observations: Observation[],
  opts: { numbersEnhanced: boolean; analystPriorities?: string[] } = { numbersEnhanced: false },
): CompanionPlan {
  const m = allFacts(packet, brief);
  const family = designFamily(packet, brief);
  const survivorship = family === "survivorship_estate";
  const guarantee = m.get("f.guarantee_present")?.value === true && verified(m, "f.guarantee_end_age") && verified(m, "f.guarantee_conditions");

  // Analyst may reorder considerations among supported candidates; it cannot add any.
  const ordered = opts.analystPriorities?.length
    ? [...observations].sort((a, b) => {
        const ia = opts.analystPriorities!.indexOf(a.observation_id);
        const ib = opts.analystPriorities!.indexOf(b.observation_id);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || b.priority_score - a.priority_score;
      })
    : observations;
  const allConsiderations = selectConsiderations(ordered, 6);
  const complex =
    survivorship ||
    verified(m, "f.term_coverage_amount") ||
    m.get("f.distributions_illustrated")?.value === true ||
    opts.numbersEnhanced;
  const twoPage = (complex && allConsiderations.length > 3) || opts.numbersEnhanced;
  const page1 = allConsiderations.slice(0, 3);
  const page2 = twoPage ? allConsiderations.slice(3, 6) : [];

  const blocks: PlannedBlock[] = [];
  blocks.push({
    block_id: "b.objective",
    purpose: "objective",
    label: "Why this proposal is being considered",
    guidance:
      "One or two sentences connecting the purpose the client described (attribute it: 'You told your advisor…') to what the proposed design is built around. No endorsement, no suitability or adequacy words.",
    allowed_fact_ids: pick(m, ["f.brief.primary_objective", "f.brief.secondary_objective", "f.brief.target_age", "f.brief.target_years", "f.product_name", "f.insurer"]),
    required_fact_ids: [],
    max_words: 50,
    page: 1,
  });

  const trigger =
    survivorship
      ? "Explain the policy pays its death benefit at the second death, not the first. Name the insurer and product with tokens."
      : packet.insured_structure === "joint_first_death"
        ? "Explain the policy pays at the first death of the insured lives."
        : "Explain the death benefit is paid to the beneficiary when the insured dies, and name the insurer and product with tokens.";
  blocks.push({
    block_id: "b.mechanism_benefit",
    purpose: "mechanism",
    label: survivorship ? "When the benefit is paid" : "What the policy does",
    guidance: `${trigger} One or two sentences. Mention the policy type in plain words (for example indexed universal life).`,
    allowed_fact_ids: pick(m, ["f.insurer", "f.product_name", "f.initial_death_benefit", "f.death_benefit_option"]),
    required_fact_ids: pick(m, ["f.product_name"]),
    max_words: 45,
    page: 1,
  });
  blocks.push({
    block_id: "b.mechanism_funding",
    purpose: "mechanism",
    label: "How it is funded",
    guidance:
      "One or two sentences on the planned outlay and how long the illustration assumes it continues. Call it a planned outlay, not a required or guaranteed premium. No affordability words.",
    allowed_fact_ids: pick(m, ["f.planned_premium_outlay", "f.premium_mode", "f.premium_payment_years", "f.last_premium_age"]),
    required_fact_ids: pick(m, ["f.planned_premium_outlay"]),
    max_words: 45,
    page: 1,
  });
  blocks.push({
    block_id: "b.guaranteed",
    purpose: "guaranteed",
    label: "What is guaranteed",
    guidance: guarantee
      ? "Name the guarantee provision and the age it is described to, then state its conditions in the same sentence or the next one. Must contain a condition word (if, only if, as long as, depends). Never 'for life' or 'unconditional'."
      : "Describe what the guaranteed columns show (coverage to the stated age on guaranteed charges and rates, if premiums are paid as illustrated). If nothing verified, say the guaranteed values are in the carrier illustration.",
    allowed_fact_ids: pick(m, [
      "f.guarantee_name",
      "f.guarantee_end_age",
      "f.guarantee_conditions",
      "f.guaranteed_scenario_coverage_through_age",
      "f.guaranteed_rate",
    ]),
    required_fact_ids: guarantee ? pick(m, ["f.guarantee_name", "f.guarantee_end_age"]) : [],
    max_words: 55,
    page: 1,
  });
  blocks.push({
    block_id: "b.illustrated",
    purpose: "illustrated",
    label: "What is illustrated, not guaranteed",
    guidance:
      family === "whole_life"
        ? "Explain that dividends and anything they buy are not guaranteed, and that illustrated values assume the current dividend scale continues."
        : family === "variable"
          ? "Explain that values depend on subaccount performance and the illustrated return is hypothetical, not a projection or guarantee."
          : "Explain that illustrated values assume the illustrated rate and current charges continue unchanged, and are not guaranteed; actual results can be higher or lower.",
    allowed_fact_ids: pick(m, ["f.illustrated_rate", "f.illustrated_coverage_through_age", "f.alternate_rate", "f.dividend_option"]),
    required_fact_ids: [],
    max_words: 50,
    page: 1,
  });
  const considerationBlock = (o: Observation, i: number, page: 1 | 2): PlannedBlock => ({
    block_id: `b.consider_${page === 1 ? i + 1 : i + 4}`,
    purpose: "consideration",
    label: o.client_heading ?? "Worth discussing",
    guidance: `${o.editorial_guidance} One or two sentences, neutral, specific to this illustration.`,
    allowed_fact_ids: pick(m, o.fact_ids),
    required_fact_ids: [],
    observation_id: o.observation_id,
    max_words: 45,
    page,
  });
  page1.forEach((o, i) => blocks.push(considerationBlock(o, i, 1)));
  page2.forEach((o, i) => blocks.push(considerationBlock(o, i, 2)));

  const milestones = opts.numbersEnhanced
    ? [5, 10, 20]
        .map((y) => ({
          policy_year: y,
          age: packet.ledger.find((r) => r.policy_year === y)?.age ?? null,
          cumulative_outlay_fact: verified(m, `f.ledger.y${y}.cumulative_outlay`) ? `f.ledger.y${y}.cumulative_outlay` : null,
          sv_guaranteed_fact: verified(m, `f.ledger.y${y}.sv_guaranteed`) ? `f.ledger.y${y}.sv_guaranteed` : null,
          db_guaranteed_fact: verified(m, `f.ledger.y${y}.db_guaranteed`) ? `f.ledger.y${y}.db_guaranteed` : null,
          sv_current_fact: verified(m, `f.ledger.y${y}.sv_current`) ? `f.ledger.y${y}.sv_current` : null,
          db_current_fact: verified(m, `f.ledger.y${y}.db_current`) ? `f.ledger.y${y}.db_current` : null,
        }))
        .filter((r) => packet.ledger.some((l) => l.policy_year === r.policy_year))
        // Only rows where every guaranteed AND illustrated figure is verified (equal presentation).
        .filter((r) => r.cumulative_outlay_fact && r.sv_current_fact && r.db_current_fact && r.sv_guaranteed_fact && (r.db_guaranteed_fact || packet.ledger.find((l) => l.policy_year === r.policy_year)?.lapsed_guaranteed))
    : [];

  const band = factBand(m, packet);
  const pageSet = new Set<number>();
  for (const id of [...band.flatMap((b) => b.fact_ids), ...blocks.flatMap((b) => b.allowed_fact_ids)]) {
    for (const r of m.get(id)?.source_refs ?? []) {
      const page = packet.refs.find((x) => x.evidence_id === r)?.page_number;
      if (page) pageSet.add(page);
    }
  }

  return {
    schema_version: VERSIONS.planner,
    design_family: family,
    fact_band: band,
    blocks,
    milestones,
    mode: opts.numbersEnhanced && milestones.length ? "numbers_enhanced" : "explanatory",
    word_budget: { target_min: 180, target_max: 260, hard_max: twoPage ? 420 : 325 },
    two_page: twoPage && (page2.length > 0 || milestones.length > 0),
    source_pages: [...pageSet].sort((a, b) => a - b).slice(0, 20),
  };
}

/** The writer's whole view of the case: block briefs and allowed facts, nothing else. */
export function writerPacket(plan: CompanionPlan, packet: EvidencePacket, brief: ClientBrief, observations: Observation[]) {
  const m = allFacts(packet, modelSafeBrief(brief));
  const ids = new Set(plan.blocks.flatMap((b) => b.allowed_fact_ids));
  return {
    schema: "companion_writer_input.v1",
    design_family: plan.design_family,
    insured_structure: packet.insured_structure,
    product_class: packet.product_class,
    facts: [...ids].map((id) => {
      const f = m.get(id)!;
      return { fact_id: id, label: f.label, display_value: formatFactValue(f), kind: id.startsWith("f.brief.") ? "client_declaration" : "illustration" };
    }),
    client_brief: {
      primary_objective: m.get("f.brief.primary_objective")?.value ?? null,
      top_priority: brief.top_priority,
      funding_comfort: brief.funding_comfort,
      horizon: brief.target_horizon?.type ?? null,
      existing_policy_connection: brief.existing_policy_connection,
    },
    blocks: plan.blocks.map((b) => ({
      block_id: b.block_id,
      label: b.label,
      guidance: b.guidance,
      allowed_fact_ids: b.allowed_fact_ids,
      required_fact_ids: b.required_fact_ids,
      max_words: b.max_words,
      observation: b.observation_id ? observations.find((o) => o.observation_id === b.observation_id)?.trigger ?? null : null,
    })),
    word_budget: plan.word_budget,
  };
}

/** The analyst sees observation candidates by id, and may only reorder or annotate them. */
export function analystPacket(packet: EvidencePacket, brief: ClientBrief, observations: Observation[]) {
  const m = allFacts(packet, modelSafeBrief(brief));
  return {
    schema: "companion_analyst_input.v1",
    product_class: packet.product_class,
    insured_structure: packet.insured_structure,
    facts: [...m.values()].filter((f) => f.status === "verified" && !f.fact_id.startsWith("f.ledger.")).map((f) => ({ fact_id: f.fact_id, label: f.label, display_value: formatFactValue(f) })),
    unverified: [...m.values()].filter((f) => f.status !== "verified" && f.material).map((f) => ({ fact_id: f.fact_id, label: f.label, status: f.status })),
    client_brief: modelSafeBrief(brief),
    candidates: observations.map((o) => ({ observation_id: o.observation_id, category: o.category, trigger: o.trigger, severity: o.severity, status: o.status, external_candidate: o.external_candidate })),
  };
}

/** Free-text notes are screened for identifiers before any model sees them. */
export function modelSafeBrief(brief: ClientBrief): ClientBrief {
  const clean = (s: string | null | undefined) => (s ? screenText(s).text : s);
  return {
    ...brief,
    primary_objective_other: clean(brief.primary_objective_other),
    funding_notes: clean(brief.funding_notes),
    existing_policy_notes: clean(brief.existing_policy_notes),
    other_notes: clean(brief.other_notes),
    followups: { ...brief.followups, owner_role_note: clean(brief.followups?.owner_role_note) },
  };
}
