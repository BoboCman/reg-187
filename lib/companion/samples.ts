/**
 * FICTIONAL demonstration fixtures for /sample-companion and the test suite.
 *
 * Every person, carrier, product and number here is invented. The page text
 * and the extractor-shaped data are generated from the same ledger rows, so
 * the evidence builder verifies them exactly as it would a real illustration.
 *
 * Never import this module from the n8n prompts or the live analysis path:
 * sample data must not reach a model or a real case.
 */
import type { ClientBrief, WriterOutput } from "./contracts";
import type { StoryWriterOutput } from "./story";

export const SAMPLE_CARRIER = "Example Mutual Life Insurance Company";

type Row = { year: number; age: number; premium: number; cvG: number | null; svG: number | null; dbG: number | null; cvC: number; svC: number; dbC: number; dist?: number };

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

function ledger(spec: {
  issueAge: number;
  lastAge: number;
  face: number;
  premium: (y: number) => number;
  rateC: number;
  rateG: number;
  coi: number;
  coiGrowth?: number; // compound yearly growth of the cost of insurance (default: linear 7.5%)
  surrender: (y: number) => number;
  guaranteeEndYear: number | null; // no-lapse guarantee keeps the guaranteed DB through this year
  dividends?: boolean;
  distribution?: (y: number) => number; // illustrated policy loans taken from the current-basis values
}): Row[] {
  const rows: Row[] = [];
  let cvC = 0;
  let cvG = 0;
  let gLapsed = false;
  for (let y = 1; spec.issueAge + y - 1 <= spec.lastAge; y++) {
    const age = spec.issueAge + y - 1;
    const prem = spec.premium(y);
    const charge = spec.face * spec.coi * (spec.coiGrowth ? Math.pow(1 + spec.coiGrowth, y - 1) : 1 + 0.075 * (y - 1)) + 120;
    const dist = spec.distribution ? spec.distribution(y) : 0;
    cvC = Math.max(0, (cvC + prem * 0.9 - charge * 0.8 - dist) * (1 + spec.rateC));
    cvG = Math.max(0, (cvG + prem * 0.86 - charge * 1.25) * (1 + spec.rateG));
    const sc = spec.surrender(y);
    const inGuarantee = spec.guaranteeEndYear != null && y <= spec.guaranteeEndYear;
    if (!inGuarantee && cvG <= 0 && y > 1) gLapsed = true;
    rows.push({
      year: y,
      age,
      premium: prem,
      cvG: gLapsed ? null : Math.round(cvG),
      svG: gLapsed ? null : Math.max(0, Math.round(cvG - sc)),
      dbG: gLapsed ? null : spec.face,
      cvC: Math.round(cvC),
      svC: Math.max(0, Math.round(cvC - sc)),
      dbC: spec.dividends ? Math.round(spec.face + cvC * 0.35) : spec.face,
      ...(spec.distribution ? { dist } : {}),
    });
  }
  return rows;
}

function ledgerPages(rows: Row[], header: string, footer: string, startPage: number, perPage = 40): string[] {
  const pages: string[] = [];
  for (let i = 0; i < rows.length; i += perPage) {
    const chunk = rows.slice(i, i + perPage);
    const body = chunk
      .map((r) =>
        [r.year, r.age, fmt(r.premium), ...(r.dist != null ? [fmt(r.dist)] : []), r.cvG == null ? "Lapse" : fmt(r.cvG), r.svG == null ? "Lapse" : fmt(r.svG), r.dbG == null ? "Lapse" : fmt(r.dbG), fmt(r.cvC), fmt(r.svC), fmt(r.dbC)].join(" "),
      )
      .join(" ");
    pages.push(`${header} Tabular Detail GUARANTEED NON-GUARANTEED Annual Premium Outlay${chunk.some((r) => r.dist != null) ? " Policy Loan" : ""} Policy Value Net Surrender Value Net Death Benefit Yr Age ${body} ${footer} Page ${startPage + pages.length}`);
  }
  return pages;
}

function atlasRows(rows: Row[]) {
  return rows.map((r) => ({
    year: r.year,
    age: r.age,
    premium: r.premium,
    ...(r.dist != null ? { loan: r.dist } : {}),
    cv_guaranteed: r.cvG,
    sv_guaranteed: r.svG,
    db_guaranteed: r.dbG,
    cv_current: r.cvC,
    sv_current: r.svC,
    db_current: r.dbC,
    valid: true,
    ...(r.dbG == null ? { lapsed_cells: ["cv_guaranteed", "sv_guaranteed", "db_guaranteed"] } : {}),
  }));
}

export type SampleCase = {
  key: string;
  title: string;
  summary: string;
  pagesText: string;
  pageCount: number;
  fingerprint: string;
  atlas1: Record<string, unknown>;
  atlas2Registry: { id: string; kind: string; family: string; text: string; sourcePageLabel: string }[];
  brief: ClientBrief;
  writer: WriterOutput;
};

function assemble(pages: string[]) {
  return pages.map((t, i) => `--- PAGE ${i + 1} ---\n${t}`).join("\n");
}

/* ── 1 · Protection-focused guaranteed UL, single life ────────────────── */

function gul(): SampleCase {
  const face = 750_000;
  const premium = 9_840;
  const rows = ledger({ issueAge: 52, lastAge: 121, face, premium: () => premium, rateC: 0.035, rateG: 0.02, coi: 0.0031, surrender: (y) => (y <= 12 ? Math.round(18_400 * (1 - (y - 1) / 12)) : 0), guaranteeEndYear: 70 });
  const hdr = "Example Guaranteed UL Insured: [REDACTED NAME] Male, Age 52, Preferred Non-Tobacco Initial Annual Premium: $9,840 Initial Death Benefit: $750,000";
  const ftr = "Basic Illustration Prepared 3/14/2026 Form EX-GUL-26 FICTIONAL SAMPLE";
  const pages = [
    `${hdr} Policy Summary Example Mutual Life Insurance Company Example Guaranteed UL is a flexible premium adjustable life insurance policy (universal life). Specified Amount $750,000.00 Death Benefit Option Level Planned Premium $9,840.00 Annual Frequency Premiums Payable Through Age 121 Riders: Accelerated Death Benefit Rider Waiver of Monthly Deduction Rider ${ftr} Page 1`,
    `${hdr} Guaranteed Coverage Benefit The Guaranteed Coverage Benefit keeps the policy from lapsing through the insured's age 121, even if the net cash surrender value is not enough to pay the monthly deductions, provided the planned premium is paid on or before each due date. Paying less than the planned premium, paying late, or taking any loan or partial withdrawal will shorten the guarantee period and may end it. ${ftr} Page 2`,
    `${hdr} Interest and Charges The guaranteed columns use the guaranteed minimum interest rate of 2.00% (2.00%) and the maximum charges. The non-guaranteed columns assume the current interest rate of 3.50% (3.50%) and current charges continue unchanged. Surrender charges apply in policy years 1 through 12; the year 1 surrender charge is $18,400. ${ftr} Page 3`,
    ...ledgerPages(rows, hdr, ftr, 4),
  ];
  const atlas1 = atlasCommon({
    carrier: SAMPLE_CARRIER,
    product: "Example Guaranteed UL",
    type: "UL",
    subtype: "flexible premium adjustable life insurance policy (universal life)",
    issueAge: 52,
    issueClass: "Preferred Non-Tobacco",
    date: "2026-03-14",
    face,
    premium,
    rows,
    ledgerPages: "4-5",
    guarantee: { label: "Guaranteed Coverage Benefit", end_age: 121, end_year: 70, pages: "2", conditions: ["The planned premium must be paid on or before each due date.", "Paying less, paying late, or taking any loan or partial withdrawal shortens or ends the guarantee."] },
    rateC: 3.5,
    rateG: 2,
    scEnd: 12,
    sc1: 18_400,
    riders: ["Accelerated Death Benefit Rider", "Waiver of Monthly Deduction Rider"],
  });
  return {
    key: "guaranteed-ul",
    title: "Protection-focused guaranteed UL",
    summary: "Single life, level premium, guarantee to a stated age.",
    pagesText: assemble(pages),
    pageCount: pages.length,
    fingerprint: "a1".repeat(32),
    atlas1,
    atlas2Registry: [{ id: "E1", kind: "quote", family: "guaranteeMechanics", sourcePageLabel: "2", text: "The Guaranteed Coverage Benefit keeps the policy from lapsing through the insured's age 121, even if the net cash surrender value is not enough to pay the monthly deductions, provided the planned premium is paid on or before each due date." }],
    brief: {
      version: "companion-brief.v1",
      primary_objective: "family_protection",
      coverage_need_basis: "advisor_analysis",
      coverage_need_amount: 750_000,
      target_horizon: { type: "lifetime" },
      funding_comfort: "expected",
      top_priority: "guarantees",
      existing_policy_connection: "no",
      followups: { guarantee_central: "guarantee_central" },
      declarant_role: "producer_reporting_client_statements",
    },
    writer: {
      schema: "companion_writer.v1",
      blocks: [
        { block_id: "b.objective", body: "You told your advisor the main purpose of this coverage is {{f.brief.primary_objective}}. The proposal from {{f.insurer}} is built around a level death benefit that is kept in force by on-time premiums rather than by cash value growth.", fact_ids: ["f.brief.primary_objective", "f.insurer"], client_ready: true },
        { block_id: "b.mechanism_benefit", body: "{{f.product_name}} is universal life insurance. It pays the death benefit to your beneficiaries when the insured dies, with a {{f.death_benefit_option}} death benefit option.", fact_ids: ["f.product_name", "f.death_benefit_option"], client_ready: true },
        { block_id: "b.mechanism_funding", body: "The illustration assumes a planned outlay of {{f.planned_premium_outlay}} each year through age {{f.last_premium_age}}. It is a planned amount, not a required premium.", fact_ids: ["f.planned_premium_outlay", "f.last_premium_age"], client_ready: true },
        { block_id: "b.guaranteed", body: "The {{f.guarantee_name}} keeps the policy from lapsing through age {{f.guarantee_end_age}}, but only if each planned premium is paid on time and no loans or withdrawals are taken.", fact_ids: ["f.guarantee_name", "f.guarantee_end_age"], client_ready: true },
        { block_id: "b.illustrated", body: "Cash values in the illustration assume an interest rate of {{f.illustrated_rate}} and current charges continue. They are not guaranteed and can be higher or lower; cash value is a secondary feature of this design.", fact_ids: ["f.illustrated_rate"], client_ready: true },
        { block_id: "b.consider_1", body: "The guarantee to age {{f.guarantee_end_age}} holds only if {{f.planned_premium_outlay}} is paid on time every year. A late or skipped payment, a loan or a withdrawal can shorten it, and restoring it may cost more.", fact_ids: ["f.guarantee_end_age", "f.planned_premium_outlay"], client_ready: true },
        { block_id: "b.consider_2", body: "The illustration assumes the planned outlay continues for {{f.premium_payment_years}} years, through age {{f.last_premium_age}}. Treat it as a long-term commitment, and ask your advisor what happens if funding changes.", fact_ids: ["f.premium_payment_years", "f.last_premium_age"], client_ready: true },
      ],
      internal_review: [],
      length_flag: "fits",
    },
  };
}

/* ── 2 · Accumulation-oriented IUL, single life ───────────────────────── */

function iul(): SampleCase {
  const face = 500_000;
  const premium = 15_000;
  const rows = ledger({ issueAge: 40, lastAge: 120, face, premium: () => premium, rateC: 0.0625, rateG: 0.0, coi: 0.0021, coiGrowth: 0.09, surrender: (y) => (y <= 10 ? Math.round(31_500 * (1 - (y - 1) / 10)) : 0), guaranteeEndYear: 10 });
  const hdr = "Example Indexed UL Insured: [REDACTED NAME] Female, Age 40, Preferred Non-Tobacco Initial Annual Premium: $15,000 Initial Death Benefit: $500,000";
  const ftr = "Basic Illustration Prepared 6/2/2026 Form EX-IUL-26 FICTIONAL SAMPLE";
  const pages = [
    `${hdr} Policy Summary Example Mutual Life Insurance Company Example Indexed UL is a flexible premium adjustable life insurance policy with index-linked interest options. Specified Amount $500,000.00 Death Benefit Option Level Planned Premium $15,000.00 Annual Frequency Riders: Accelerated Death Benefit Rider ${ftr} Page 1`,
    `${hdr} No-Lapse Guarantee The No-Lapse Guarantee keeps the policy in force through the insured's age 49 if the cumulative premiums paid, less any loans and withdrawals, are at least the cumulative no-lapse premium. After age 49 the policy stays in force only while the net surrender value covers the monthly deductions. ${ftr} Page 2`,
    `${hdr} Index Crediting The illustrated rate of 6.25% (6.25%) is not guaranteed. The guaranteed columns assume a 0.00% (0.00%) index credit and maximum charges. Surrender charges apply in policy years 1 through 10; the year 1 surrender charge is $31,500. Loans and withdrawals are not illustrated. ${ftr} Page 3`,
    ...ledgerPages(rows, hdr, ftr, 4),
  ];
  const atlas1 = atlasCommon({
    carrier: SAMPLE_CARRIER,
    product: "Example Indexed UL",
    type: "IUL",
    subtype: "flexible premium adjustable life insurance policy with index-linked interest options",
    issueAge: 40,
    issueClass: "Preferred Non-Tobacco",
    date: "2026-06-02",
    face,
    premium,
    rows,
    ledgerPages: "4-6",
    guarantee: { label: "No-Lapse Guarantee", end_age: 49, end_year: 10, pages: "2", conditions: ["Cumulative premiums paid, less loans and withdrawals, must be at least the cumulative no-lapse premium.", "After the guarantee period the policy stays in force only while net surrender value covers monthly deductions."] },
    rateC: 6.25,
    rateG: 0,
    scEnd: 10,
    sc1: 31_500,
    riders: ["Accelerated Death Benefit Rider"],
  });
  return {
    key: "indexed-ul",
    title: "Accumulation-oriented IUL",
    summary: "Single life, cash value focus, short guarantee, illustrated values do the work.",
    pagesText: assemble(pages),
    pageCount: pages.length,
    fingerprint: "b2".repeat(32),
    atlas1,
    atlas2Registry: [{ id: "E1", kind: "quote", family: "guaranteeMechanics", sourcePageLabel: "2", text: "The No-Lapse Guarantee keeps the policy in force through the insured's age 49 if the cumulative premiums paid, less any loans and withdrawals, are at least the cumulative no-lapse premium." }],
    brief: {
      version: "companion-brief.v1",
      primary_objective: "cash_accumulation",
      secondary_objective: "family_protection",
      coverage_need_basis: "client_target",
      coverage_need_amount: 500_000,
      target_horizon: { type: "lifetime" },
      funding_comfort: "uncertain",
      top_priority: "growth",
      secondary_priority: "cash_access",
      existing_policy_connection: "no",
      followups: { access_start: "after_10_years", access_need: "desired" },
      declarant_role: "producer_reporting_client_statements",
    },
    writer: {
      schema: "companion_writer.v1",
      blocks: [
        { block_id: "b.objective", body: "You told your advisor the main goal is {{f.brief.primary_objective}}, with {{f.brief.secondary_objective}} as a second goal. This design from {{f.insurer}} puts more premium into cash value than the death benefit alone needs.", fact_ids: ["f.brief.primary_objective", "f.brief.secondary_objective", "f.insurer"], client_ready: true },
        { block_id: "b.mechanism_benefit", body: "{{f.product_name}} is indexed universal life insurance. Interest is linked to a market index, and the death benefit is paid to your beneficiaries when the insured dies.", fact_ids: ["f.product_name"], client_ready: true },
        { block_id: "b.mechanism_funding", body: "The illustration assumes a planned outlay of {{f.planned_premium_outlay}} a year through age {{f.last_premium_age}}. This is a planned amount, not a required premium.", fact_ids: ["f.planned_premium_outlay", "f.last_premium_age"], client_ready: true },
        { block_id: "b.guaranteed", body: "The {{f.guarantee_name}} keeps coverage in force through age {{f.guarantee_end_age}} only if premiums paid stay at or above the required minimum. On guaranteed charges and rates, coverage is shown to age {{f.guaranteed_scenario_coverage_through_age}}.", fact_ids: ["f.guarantee_name", "f.guarantee_end_age", "f.guaranteed_scenario_coverage_through_age"], client_ready: true },
        { block_id: "b.illustrated", body: "The illustrated values assume an index-linked rate of {{f.illustrated_rate}} every year and current charges. They are not guaranteed; actual crediting can be higher or lower, including zero in some years.", fact_ids: ["f.illustrated_rate"], client_ready: true },
        { block_id: "b.consider_1", body: "You told your advisor funding is not yet certain. The illustration assumes {{f.planned_premium_outlay}} is paid every year through age {{f.last_premium_age}}; paying less can lower the values and shorten coverage.", fact_ids: ["f.planned_premium_outlay", "f.last_premium_age"], client_ready: true },
        { block_id: "b.consider_2", body: "Net surrender value in year five is illustrated at {{f.ledger.y5.sv_current}}, against {{f.ledger.y5.cumulative_outlay}} paid in. Surrender charges apply through year {{f.surrender_charge_end_year}}, so early access to cash is limited.", fact_ids: ["f.ledger.y5.sv_current", "f.ledger.y5.cumulative_outlay", "f.surrender_charge_end_year"], client_ready: true },
        { block_id: "b.consider_3", body: "The guarantee ends at age {{f.guarantee_end_age}}, and on guaranteed assumptions coverage is shown only to age {{f.guaranteed_scenario_coverage_through_age}}. Coverage to age {{f.illustrated_coverage_through_age}} depends on non-guaranteed values if the illustrated rate holds.", fact_ids: ["f.guarantee_end_age", "f.guaranteed_scenario_coverage_through_age", "f.illustrated_coverage_through_age"], client_ready: true },
      ],
      internal_review: [],
      length_flag: "fits",
    },
  };
}

/* ── 3 · Survivorship estate-liquidity GUL, two lives, trust-owned ────── */

function sgul(): SampleCase {
  const face = 4_000_000;
  const premium = 38_600;
  const rows = ledger({ issueAge: 64, lastAge: 121, face, premium: (y) => (y <= 25 ? premium : 0), rateC: 0.04, rateG: 0.02, coi: 0.0016, surrender: (y) => (y <= 15 ? Math.round(96_000 * (1 - (y - 1) / 15)) : 0), guaranteeEndYear: 58 });
  const hdr = "Example Survivorship GUL Insureds: [REDACTED NAME] Male, Age 67, Preferred; [REDACTED NAME] Female, Age 64, Preferred Initial Annual Premium: $38,600 Initial Death Benefit: $4,000,000 Ages shown are the younger insured's age";
  const ftr = "Basic Illustration Prepared 9/21/2026 Form EX-SUL-26 FICTIONAL SAMPLE";
  const pages = [
    `${hdr} Policy Summary Example Mutual Life Insurance Company Example Survivorship GUL is a survivorship (second-to-die) flexible premium universal life insurance policy. The death benefit is payable on the death of the second insured. Specified Amount $4,000,000.00 Death Benefit Option Level Planned Premium $38,600.00 Annual Frequency for 25 years Owner: Irrevocable trust Riders: Policy Split Option Rider ${ftr} Page 1`,
    `${hdr} Survivorship Guarantee The Survivorship Guarantee keeps the policy from lapsing through the younger insured's age 121, provided the planned premium is paid on or before each due date for 25 years. Any premium shortfall, late payment, loan or withdrawal reduces the guarantee period. ${ftr} Page 2`,
    `${hdr} Interest and Charges Guaranteed columns use 2.00% (2.00%) and maximum charges; non-guaranteed columns assume 4.00% (4.00%) and current charges. Surrender charges apply in policy years 1 through 15; the year 1 surrender charge is $96,000. ${ftr} Page 3`,
    ...ledgerPages(rows, hdr, ftr, 4),
  ];
  const atlas1 = atlasCommon({
    carrier: SAMPLE_CARRIER,
    product: "Example Survivorship GUL",
    type: "UL",
    subtype: "survivorship (second-to-die) flexible premium universal life insurance policy",
    issueAge: null,
    issueClass: "Preferred",
    date: "2026-09-21",
    face,
    premium,
    rows,
    ledgerPages: "4-5",
    guarantee: { label: "Survivorship Guarantee", end_age: 121, end_year: 58, pages: "2", conditions: ["The planned premium must be paid on or before each due date for 25 years.", "Any shortfall, late payment, loan or withdrawal reduces the guarantee period."] },
    rateC: 4,
    rateG: 2,
    scEnd: 15,
    sc1: 96_000,
    riders: ["Policy Split Option Rider"],
    survivorship: { ages: [67, 64], basis: "younger insured attained age" },
  });
  return {
    key: "survivorship",
    title: "Survivorship estate liquidity",
    summary: "Two lives, trust-owned, 25-year funding, guarantee tied to the younger insured.",
    pagesText: assemble(pages),
    pageCount: pages.length,
    fingerprint: "c3".repeat(32),
    atlas1,
    atlas2Registry: [{ id: "E1", kind: "quote", family: "guaranteeMechanics", sourcePageLabel: "2", text: "The Survivorship Guarantee keeps the policy from lapsing through the younger insured's age 121, provided the planned premium is paid on or before each due date for 25 years." }],
    brief: {
      version: "companion-brief.v1",
      primary_objective: "estate_liquidity",
      objective_holder: "owner_trust",
      coverage_need_basis: "advisor_analysis",
      coverage_need_amount: 4_000_000,
      target_horizon: { type: "second_death" },
      funding_comfort: "expected",
      top_priority: "guarantees",
      existing_policy_connection: "no",
      followups: { owner_role_note: "Irrevocable trust is the proposed owner and beneficiary." },
      declarant_role: "producer_reporting_client_statements",
    },
    writer: {
      schema: "companion_writer.v1",
      blocks: [
        { block_id: "b.objective", body: "You told your advisor the purpose is {{f.brief.primary_objective}}, so that cash is available when it is needed. The proposal from {{f.insurer}} is designed around one death benefit, paid after both of you have died.", fact_ids: ["f.brief.primary_objective", "f.insurer"], client_ready: true },
        { block_id: "b.mechanism_benefit", body: "{{f.product_name}} is survivorship universal life insurance. It pays nothing at the first death; the death benefit is paid at the second death, to the policy's beneficiary.", fact_ids: ["f.product_name"], client_ready: true },
        { block_id: "b.mechanism_funding", body: "The illustration assumes a planned outlay of {{f.planned_premium_outlay}} a year for {{f.premium_payment_years}} years, then no further outlays. Charges continue after outlays stop.", fact_ids: ["f.planned_premium_outlay", "f.premium_payment_years"], client_ready: true },
        { block_id: "b.guaranteed", body: "The {{f.guarantee_name}} keeps the policy from lapsing through the younger insured's age {{f.guarantee_end_age}}, provided every planned premium is paid on time and no loans or withdrawals are taken.", fact_ids: ["f.guarantee_name", "f.guarantee_end_age"], client_ready: true },
        { block_id: "b.illustrated", body: "Cash values assume an interest rate of {{f.illustrated_rate}} and current charges continue. They are not guaranteed, and this design does not rely on them to keep coverage in force while the guarantee conditions are met.", fact_ids: ["f.illustrated_rate"], client_ready: true },
        { block_id: "b.consider_1", body: "The guarantee to age {{f.guarantee_end_age}} depends on paying {{f.planned_premium_outlay}} on time for the full payment period. A late or short payment can shorten it, and restoring it may require a larger payment.", fact_ids: ["f.guarantee_end_age", "f.planned_premium_outlay"], client_ready: true },
        { block_id: "b.consider_2", body: "Who owns the policy, who receives the benefit, and any estate or tax effects are outside this companion. Confirm the trust arrangements with your attorney or tax adviser.", fact_ids: [], client_ready: true },
        { block_id: "b.consider_3", body: "The illustration assumes {{f.planned_premium_outlay}} a year for {{f.premium_payment_years}} years. The trust's funding needs to continue for that whole period; ask your advisor what happens if it changes.", fact_ids: ["f.planned_premium_outlay", "f.premium_payment_years"], client_ready: true },
      ],
      internal_review: [],
      length_flag: "fits",
    },
  };
}

function atlasCommon(a: {
  carrier: string;
  product: string;
  type: string;
  subtype: string;
  issueAge: number | null;
  issueClass: string;
  date: string;
  face: number;
  premium: number;
  rows: Row[];
  ledgerPages: string;
  guarantee: { label: string; end_age: number; end_year: number; pages: string; conditions: string[] };
  rateC: number;
  rateG: number;
  scEnd: number;
  sc1: number;
  riders: string[];
  survivorship?: { ages: [number, number]; basis: string };
}) {
  const positive = a.rows.filter((r) => r.premium > 0);
  return {
    _metadata: { parser_version: "fixture", atlas_prompt_version: "fixture", truncated: false, validation: { missing_critical_fields: [] }, diagnostics: { scenario_completeness: { notes: [] } } },
    provenance: {
      carrier: a.carrier,
      product: a.product,
      illustration_type: "New Issue",
      policy_years_in_force: 0,
      illustration_date: a.date,
      issue_age: a.issueAge,
      stated_issue_age: a.issueAge,
      issue_class: a.issueClass,
      multi_life: a.survivorship ? "Yes" : "No",
      insured_count: a.survivorship ? 2 : 1,
      first_insured_stated_issue_age: a.survivorship?.ages[0] ?? null,
      second_insured_stated_issue_age: a.survivorship?.ages[1] ?? null,
    },
    chassis: {
      type: a.type,
      subtype: a.subtype,
      db_option: "Level",
      face_amount: a.face,
      specified_amount: a.face,
      coverage_components: [{ index: 1, label: "Base Coverage", amount: a.face, role: "base", included_in_face: "Yes", pages: "1" }],
      coverage_reconciliation: "Reconciled",
      no_lapse_guarantee: "Yes",
      coverage_guarantees: [{ index: 1, label: a.guarantee.label, period: "Fixed-Term", end_age: a.guarantee.end_age, end_year: a.guarantee.end_year, conditions: a.guarantee.conditions.join(" "), pages: a.guarantee.pages }],
    },
    nlg: {
      type: "Fixed-Term",
      end_age: a.guarantee.end_age,
      end_year: a.guarantee.end_year,
      age_basis: a.survivorship ? a.survivorship.basis : "Single Insured",
      condition_1: a.guarantee.conditions[0],
      condition_2: a.guarantee.conditions[1],
      coverage_scope: "Full face",
    },
    premiums: { scheduled: a.premium, annualized: a.premium, mode: "Annual", stop_year: positive[positive.length - 1]?.year ?? null },
    ledger: { context: { age_basis: a.survivorship ? a.survivorship.basis : "Single Insured" } },
    ledger_table: {
      columns: ["year", "age", "premium", ...(a.rows.some((r) => r.dist != null) ? ["loan"] : []), "cv_guaranteed", "sv_guaranteed", "db_guaranteed", "cv_current", "sv_current", "db_current"],
      rows: atlasRows(a.rows),
      complete: "Yes",
      truncated: false,
      pages: a.ledgerPages,
      issues: [],
    },
    scenarios: { primary_rate: a.rateC, guaranteed_rate: a.rateG, alternate_rate: null },
    surrender: { charge_end_year: a.scEnd, schedule: `Charges by year: 1 ${a.sc1}` },
    riders: { included_array: a.riders },
    distributions: a.rows.some((r) => (r.dist ?? 0) > 0) ? { illustrated: "Yes", notes: "Policy loans are illustrated as planned income." } : { illustrated: "No", notes: "No loans or withdrawals illustrated." },
    compliance: { MEC_status: "Not a MEC" },
  };
}

export const SAMPLE_CASES: SampleCase[] = [gul(), iul(), sgul()];

/* ── 4 · Story sample: IUL funded to 64, planned income from 66 ───────── */

export type StorySample = Omit<SampleCase, "brief" | "writer"> & { story: StoryWriterOutput; goals: ("retirement_income" | "legacy" | "accumulation")[] };

export function apartmentSample(): StorySample {
  const face = 750_000;
  const premium = 24_000;
  const rows = ledger({
    issueAge: 45,
    lastAge: 120,
    face,
    premium: (y) => (y <= 20 ? premium : 0),
    rateC: 0.062,
    rateG: 0.0,
    coi: 0.0016,
    coiGrowth: 0.085,
    surrender: (y) => (y <= 10 ? Math.round(42_000 * (1 - (y - 1) / 10)) : 0),
    guaranteeEndYear: 10,
    distribution: (y) => (y >= 22 && y <= 41 ? 38_000 : 0),
  });
  const hdr = "Example Indexed UL Insured: [REDACTED NAME] Male, Age 45, Preferred Non-Tobacco Initial Annual Premium: $24,000 Initial Death Benefit: $750,000";
  const ftr = "Basic Illustration Prepared 10/8/2026 Form EX-IUL-26 FICTIONAL SAMPLE";
  const pages = [
    `${hdr} Policy Summary Example Mutual Life Insurance Company Example Indexed UL is a flexible premium adjustable life insurance policy with index-linked interest options. Specified Amount $750,000.00 Death Benefit Option Level Planned Premium $24,000.00 Annual Frequency for 20 years Riders: Accelerated Death Benefit Rider for Chronic Illness, Overloan Protection Rider ${ftr} Page 1`,
    `${hdr} No-Lapse Guarantee The No-Lapse Guarantee keeps the policy in force through the insured's age 54 if the cumulative premiums paid, less any loans and withdrawals, are at least the cumulative no-lapse premium. Planned income is illustrated as policy loans of $38,000 a year from age 66 through age 85. ${ftr} Page 2`,
    `${hdr} Index Crediting The illustrated rate of 6.20% (6.20%) is not guaranteed. The guaranteed columns assume a 0.00% (0.00%) index credit and maximum charges. Surrender charges apply in policy years 1 through 10; the year 1 surrender charge is $42,000. ${ftr} Page 3`,
    ...ledgerPages(rows, hdr, ftr, 4),
  ];
  const atlas1 = atlasCommon({
    carrier: SAMPLE_CARRIER,
    product: "Example Indexed UL",
    type: "IUL",
    subtype: "flexible premium adjustable life insurance policy with index-linked interest options",
    issueAge: 45,
    issueClass: "Preferred Non-Tobacco",
    date: "2026-10-08",
    face,
    premium,
    rows,
    ledgerPages: "4-5",
    guarantee: { label: "No-Lapse Guarantee", end_age: 54, end_year: 10, pages: "2", conditions: ["Cumulative premiums paid, less loans and withdrawals, must be at least the cumulative no-lapse premium.", "After the guarantee period the policy stays in force only while net surrender value covers monthly deductions."] },
    rateC: 6.2,
    rateG: 0,
    scEnd: 10,
    sc1: 42_000,
    riders: ["Accelerated Death Benefit Rider for Chronic Illness", "Overloan Protection Rider"],
  });
  return {
    key: "apartment-iul",
    title: "Apartment story: IUL with planned income",
    summary: "Single life, premiums for 20 years, planned income from 66.",
    pagesText: assemble(pages),
    pageCount: pages.length,
    fingerprint: "d4".repeat(32),
    atlas1,
    atlas2Registry: [{ id: "E1", kind: "quote", family: "guaranteeMechanics", sourcePageLabel: "2", text: "The No-Lapse Guarantee keeps the policy in force through the insured's age 54 if the cumulative premiums paid, less any loans and withdrawals, are at least the cumulative no-lapse premium." }],
    goals: ["retirement_income", "legacy"],
    story: {
      schema: "policyplan_story.v1",
      story: {
        where_you_start: "Construction starts in year 1. The first ten years carry the surrender charge and the highest costs, while premiums build the foundation for income from age 66.",
        benefits: [
          { key: "growth", note: "Interest linked to an index, with a 0% floor" },
          { key: "access", note: "Planned income from age 66, through policy loans" },
          { key: "legacy", note: "A $750K death benefit for your beneficiaries" },
          { key: "living_benefits", note: "Access part of the death benefit if chronically ill" },
        ],
      },
      design: {
        headline: "Premiums for 20 years build the policy, then planned income from age 66 is illustrated.",
        takeaway: "The illustrated values depend on the illustrated rate and current charges continuing. On the guaranteed basis the values are much lower, so review funding and the income plan together each year.",
      },
      riders: [
        { name: "Accelerated Death Benefit Rider for Chronic Illness", note: "Lets you access part of the death benefit if chronically ill." },
        { name: "Overloan Protection Rider", note: "Can help keep coverage in force when loans are large, if its conditions are met." },
      ],
    },
  };
}

export function sampleByKey(key: string | null | undefined): SampleCase {
  return SAMPLE_CASES.find((s) => s.key === key) ?? SAMPLE_CASES[0];
}
