/**
 * ============================================================================
 * POLICYPLAN — DATA CONTRACT  (v2.0.0, clean-room)
 * New-business life insurance best-interest intake, recommendation, and
 * evidence file. Part of the Insurance Planner AI Professional platform.
 * ============================================================================
 *
 * CLEAN-ROOM NOTICE
 * This contract is authored independently from any single carrier's or
 * distributor's proprietary questionnaire. It is built from the regulatory
 * and industry-standard best-interest process, not from any branded form:
 *   - NY DFS Reg 187 (11 NYCRR 224): gather suitability info, analyze the
 *     consumer's needs and objectives, document and communicate the basis,
 *     disclose before application. Financial-ability-to-fund gate at 224.4(g).
 *   - NAIC Suitability/Best-Interest Model #275: obtain consumer profile
 *     information BEFORE making a recommendation; reasonable basis; care,
 *     disclosure, conflict, documentation obligations.
 *   - SEC Reg BI / FINRA 2111: investor profile incl. liquidity needs.
 *   - CFP Board Practice Standards (7-step): gather circumstances + goals +
 *     risk tolerance, analyze, THEN develop the recommendation.
 * Field selection, wording, taxonomy, ordering, and the priority model are
 * this platform's own expression of those public requirements.
 *
 * ORDER (needs-first). Product specifications come AFTER the full profile,
 * because every authority above requires the profile to be gathered and
 * analyzed before the recommendation:
 *   1 insured & owner  ->  2 objectives  ->  3 financial  ->  4 existing
 *   coverage  ->  5 risk & preferences  ->  6 policy specifications  ->
 *   7 notes & attestation.
 *
 * DESIGN RULES:
 *   - Payload carries CODES and RAW VALUES only. Enriched narrative is joined
 *     server-side from Supabase, keyed on these codes.
 *   - Totals and design emphasis are DERIVED, never input. One function each,
 *     called by both the form and the server, so a value never disagrees with
 *     itself. Design priorities are INFERRED from the profile, not ranked by
 *     the client (see inferDesignEmphasis).
 *   - Enums are stable snake_case codes; client-facing labels are a separate
 *     copy layer.
 *
 * Requires: zod ^3.23
 */

import { z } from "zod";

export const POLICYPLAN_SCHEMA_VERSION = "2.0.0";

/* ----------------------------------------------------------------------------
 * Reusable primitives
 * ------------------------------------------------------------------------- */

const money = z.number().nonnegative().optional();
const years = z.number().int().nonnegative().max(100).optional();
const percent = z.number().min(0).max(100).optional();
const age = z.number().int().min(0).max(120);
export const yesNo = z.enum(["yes", "no"]);

/* ============================================================================
 * REGION 1 — INSURED & OWNER  (who)
 * ========================================================================== */

export const genderEnum = z.enum(["male", "female"]);
export const businessTypeEnum = z.enum([
  "c_corp",
  "s_corp",
  "llc",
  "limited_partnership",
  "sole_proprietorship",
]);
export const trustTypeEnum = z.enum(["irrevocable", "revocable"]);
export const ownershipEnum = z.enum(["individual", "business", "trust"]);

export const insuredSchema = z.object({
  name: z.string().min(1),
  dob: z.string().date().optional(),
  gender: genderEnum.optional(),
  nicotine_use: yesNo.optional(),
});

export const insuredOwnerSchema = z
  .object({
    insureds: z.array(insuredSchema).min(1).max(2), // single or joint/survivorship
    policy_owner: z.string().optional(),
    state_of_ownership: z.string().length(2).optional(),
    ownership_type: ownershipEnum.default("individual"),
    business_type: businessTypeEnum.optional(),
    trust_type: trustTypeEnum.optional(),
    grantor_trust: yesNo.optional(),
    gst_exempt: yesNo.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.ownership_type === "business" && !v.business_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["business_type"],
        message: "business_type is required when ownership_type is 'business'.",
      });
    }
    if (v.ownership_type === "trust" && !v.trust_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["trust_type"],
        message: "trust_type is required when ownership_type is 'trust'.",
      });
    }
  });

/* ============================================================================
 * REGION 2 — OBJECTIVES  (the need — leads the substantive flow)
 * Independently authored taxonomy of standard planning purposes, organized by
 * a needs-based grouping. Multi-select, with exactly one primary.
 * ========================================================================== */

export const objectiveEnum = z.enum([
  // Income & family protection
  "income_replacement",
  "mortgage_debt_payoff",
  "education_funding",
  "final_expenses",
  // Wealth accumulation & access
  "cash_accumulation",
  "supplemental_retirement_income",
  "long_term_care_funding",
  // Estate & legacy
  "estate_tax_liquidity",
  "wealth_transfer",
  "estate_equalization",
  "charitable_giving",
  // Business
  "business_succession_buy_sell",
  "key_person_protection",
  "executive_benefit",
]);

export const objectivesSchema = z
  .object({
    selected: z.array(objectiveEnum).min(1),
    primary: objectiveEnum,
  })
  .superRefine((v, ctx) => {
    if (!v.selected.includes(v.primary)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["primary"],
        message: "The primary objective must be one of the selected objectives.",
      });
    }
    if (new Set(v.selected).size !== v.selected.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selected"],
        message: "Objectives must be unique.",
      });
    }
  });

/* ============================================================================
 * REGION 3 — FINANCIAL PROFILE  (capacity)
 * Three peer columns. Joint is entered independently, not summed. Totals
 * derived. Governing capacity metric for the Reg 187 224.4(g) ability-to-fund
 * gate is LIQUID net worth (see deriveFundingCapacity).
 * ========================================================================== */

export const financialColumnSchema = z.object({
  annual_income: money,
  income_tax_rate: percent,
  cash_cds_securities: money,
  qualified_plans: money,
  business_interests: money,
  real_estate: money,
  residence: money,
  other_assets: money,
  mortgage_amount: money,
  revolving_debt: money,
  other_liability_amount: money,
});

export const financialSchema = z.object({
  expected_source_of_premium: z.string().optional(),
  columns: z.object({
    client_1: financialColumnSchema,
    client_2: financialColumnSchema.optional(),
    joint: financialColumnSchema.optional(),
  }),
});

export function deriveFinancialTotals(col: FinancialColumn) {
  const n = (v: number | undefined) => v ?? 0;
  const totalLiquidAssets = n(col.cash_cds_securities) + n(col.qualified_plans);
  const totalOtherAssets =
    n(col.business_interests) +
    n(col.real_estate) +
    n(col.residence) +
    n(col.other_assets);
  const totalAssets = totalLiquidAssets + totalOtherAssets;
  const totalLiabilities =
    n(col.mortgage_amount) +
    n(col.revolving_debt) +
    n(col.other_liability_amount);
  return {
    total_liquid_assets: totalLiquidAssets,
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    net_worth: totalAssets - totalLiabilities,
    liquid_net_worth: totalLiquidAssets - totalLiabilities,
  };
}

/**
 * Governing metric for the ability-to-fund gate is liquid net worth, with
 * total net worth retained as context. Basis: Reg 187 224.4(g) financial
 * ability to meet the policy's commitments; Reg BI / FINRA 2111 liquidity
 * needs as a distinct factor; SEC 17a-3 net worth convention excludes the
 * primary residence (liquid net worth honors that by construction).
 */
export const CAPACITY_BASIS = "liquid_net_worth" as const;

export function deriveFundingCapacity(col: FinancialColumn) {
  const t = deriveFinancialTotals(col);
  const n = (v: number | undefined) => v ?? 0;
  return {
    primary_capacity: t.liquid_net_worth,
    primary_capacity_basis: CAPACITY_BASIS,
    secondary_context: {
      net_worth: t.net_worth,
      annual_income: n(col.annual_income),
    },
    residence_excluded_from_capacity: n(col.residence),
  };
}

/* ============================================================================
 * REGION 4 — EXISTING COVERAGE  (holdings + replacement)
 * Up to three in-force policies. Replacement intent captured because Reg 187
 * treats replacement as a distinct best-interest consideration.
 * ========================================================================== */

export const policyTypeEnum = z.enum([
  "term",
  "whole_life",
  "universal_life",
  "indexed_ul",
  "variable_ul",
  "guaranteed_ul",
  "other",
]);

export const existingPolicySchema = z.object({
  insurance_company: z.string().optional(),
  policy_number: z.string().optional(),
  insured: z.string().optional(),
  policy_owner: z.string().optional(),
  year_issued: z.number().int().min(1900).max(2100).optional(),
  death_benefit: money,
  gross_cash_value: money,
  policy_loan_balance: money,
  cash_surrender_value: money,
  premium_amount: money,
  policy_type: policyTypeEnum.optional(),
  purpose_of_policy: z.string().optional(),
  remaining_premium_years: years,
  // Reg 187 replacement consideration
  under_replacement_consideration: yesNo.optional(),
});

export const existingCoverageSchema = z
  .object({
    has_existing_coverage: yesNo,
    policies: z.array(existingPolicySchema).max(3).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.has_existing_coverage === "yes" && v.policies.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["policies"],
        message: "List at least one policy when existing coverage is 'yes'.",
      });
    }
  });

/* ============================================================================
 * REGION 5 — RISK & PREFERENCES  (posture, before specs)
 * Independently authored set covering the regulatory factors: financial
 * experience, tolerance for value variability, guarantee-vs-upside preference,
 * willingness to accept non-guaranteed elements (Reg 187 224.3(g)), premium
 * funding commitment, cash-value access need, and complexity tolerance.
 * ========================================================================== */

export const riskPreferencesSchema = z.object({
  // Experience with financial / insurance products
  financial_experience: z.enum(["limited", "moderate", "extensive"]),
  // Tolerance for year-to-year variability in policy values
  value_variability_tolerance: z.enum([
    "prefer_stability",
    "balanced",
    "accept_variability",
  ]),
  // Guaranteed outcomes vs. non-guaranteed upside
  guarantee_vs_upside: z.enum([
    "strongly_prefer_guarantees",
    "lean_guarantees",
    "lean_upside",
    "strongly_prefer_upside",
  ]),
  // Reg 187 224.3(g): willingness to accept non-guaranteed elements
  // (variability in premium, cash value, death benefit, fees)
  nonguaranteed_elements: z.enum([
    "accept",
    "accept_with_limits",
    "prefer_to_avoid",
  ]),
  // Willingness and ability to fund a higher premium than illustrated if
  // needed to keep coverage in force (the funding-commitment factor)
  premium_funding_commitment: z.enum([
    "able_and_willing",
    "willing_if_necessary",
    "unable_or_unwilling",
  ]),
  // Expected need to access cash value, and when
  cash_value_access_need: z.enum([
    "none_expected",
    "long_term",
    "medium_term",
    "near_term",
  ]),
  // Comfort with product complexity / transparency
  complexity_tolerance: z.enum(["prefer_simple", "comfortable_with_complexity"]),
});

/* ============================================================================
 * REGION 6 — POLICY SPECIFICATIONS  (the design target, AFTER the profile)
 * Dual-mode duration: type an age OR pick a scale point, modeled as a
 * discriminated union so both can never be set.
 * ========================================================================== */

export const deathBenefitScaleEnum = z.enum([
  "10_years",
  "20_years",
  "30_years",
  "life_expectancy",
  "age_100",
  "beyond_age_100",
]);
export const premiumScaleEnum = z.enum([
  "1_year",
  "5_years",
  "10_years",
  "20_years",
  "life_expectancy",
  "all_years",
]);

export const deathBenefitDurationSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("age"), age }),
  z.object({ mode: z.literal("scale"), scale_point: deathBenefitScaleEnum }),
]);
export const premiumDurationSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("age"), age }),
  z.object({ mode: z.literal("scale"), scale_point: premiumScaleEnum }),
]);

export const policySpecsSchema = z.object({
  desired_death_benefit: money,
  death_benefit_duration: deathBenefitDurationSchema.optional(),
  desired_premium: money,
  premium_duration: premiumDurationSchema.optional(),
  desired_cash_value_accumulation: z
    .object({ amount: money, at_age: age.optional(), year: z.number().int().min(1).max(100).optional() })
    .optional(),
  desired_annual_distribution: z
    .object({ amount: money, start_age: age.optional(), end_age: age.optional() })
    .optional(),
});

/* ============================================================================
 * REGION 7 — NOTES & ATTESTATION
 * Reworded best-interest attestation (own expression). `confirmed` is a hard
 * literal-true gate: the payload cannot validate without it.
 * ========================================================================== */

export const attestationSchema = z.object({
  confirmed: z.literal(true),
  owner_signature: z.string().min(1),
  signed_date: z.string().date(),
  signer_title: z.string().optional(),
});

export const ATTESTATION_TEXT =
  "I certify that the information I have provided is accurate and complete to " +
  "the best of my knowledge, and that I have not withheld any facts or " +
  "circumstances that could reasonably affect a best-interest recommendation " +
  "for life insurance coverage.";

/* ============================================================================
 * TOP-LEVEL INTAKE PAYLOAD  (keys ordered to the needs-first flow)
 * ========================================================================== */

export const policyPlanIntakeSchema = z.object({
  schema_version: z.literal(POLICYPLAN_SCHEMA_VERSION).default(POLICYPLAN_SCHEMA_VERSION),
  intake_id: z.string().uuid().optional(),
  submitted_at: z.string().datetime().optional(),

  insured_owner: insuredOwnerSchema, // 1
  objectives: objectivesSchema, // 2
  financial: financialSchema, // 3
  existing_coverage: existingCoverageSchema, // 4
  risk_preferences: riskPreferencesSchema, // 5
  policy_specs: policySpecsSchema, // 6
  notes: z.string().optional(),
  attestation: attestationSchema, // 7
});

/* ----------------------------------------------------------------------------
 * INFERRED DESIGN EMPHASIS  (Option 1: priorities are inferred, not ranked)
 * A transparent, rule-based starter that derives design emphasis from the
 * regulatory inputs already collected, with the driving inputs recorded for
 * the audit trail. The server-side signal layer (DCB analog) extends this;
 * form and server call the same function so emphasis is computed one way.
 * ------------------------------------------------------------------------- */

export type EmphasisLevel = "high" | "moderate" | "low";

export function inferDesignEmphasis(intake: {
  objectives: Objectives;
  risk_preferences: RiskPreferences;
  policy_specs?: PolicySpecs;
}) {
  const rp = intake.risk_preferences;
  const drivers: Record<string, string[]> = {
    guarantee_protection: [],
    growth_orientation: [],
    cash_access: [],
    cost_sensitivity: [],
  };

  // Guarantee / downside protection
  let guard = 0;
  if (rp.guarantee_vs_upside === "strongly_prefer_guarantees") { guard += 2; drivers.guarantee_protection.push("guarantee_vs_upside=strongly_prefer_guarantees"); }
  else if (rp.guarantee_vs_upside === "lean_guarantees") { guard += 1; drivers.guarantee_protection.push("guarantee_vs_upside=lean_guarantees"); }
  if (rp.nonguaranteed_elements === "prefer_to_avoid") { guard += 2; drivers.guarantee_protection.push("nonguaranteed_elements=prefer_to_avoid"); }
  else if (rp.nonguaranteed_elements === "accept_with_limits") { guard += 1; drivers.guarantee_protection.push("nonguaranteed_elements=accept_with_limits"); }
  if (rp.value_variability_tolerance === "prefer_stability") { guard += 1; drivers.guarantee_protection.push("value_variability_tolerance=prefer_stability"); }

  // Growth orientation
  let growth = 0;
  if (rp.guarantee_vs_upside === "strongly_prefer_upside") { growth += 2; drivers.growth_orientation.push("guarantee_vs_upside=strongly_prefer_upside"); }
  else if (rp.guarantee_vs_upside === "lean_upside") { growth += 1; drivers.growth_orientation.push("guarantee_vs_upside=lean_upside"); }
  if (rp.value_variability_tolerance === "accept_variability") { growth += 1; drivers.growth_orientation.push("value_variability_tolerance=accept_variability"); }
  if (intake.objectives.selected.includes("cash_accumulation") || intake.objectives.selected.includes("supplemental_retirement_income")) { growth += 1; drivers.growth_orientation.push("accumulation objective selected"); }

  // Cash-value access
  let access = 0;
  if (rp.cash_value_access_need === "near_term") { access += 2; drivers.cash_access.push("cash_value_access_need=near_term"); }
  else if (rp.cash_value_access_need === "medium_term") { access += 1; drivers.cash_access.push("cash_value_access_need=medium_term"); }
  if (intake.objectives.selected.includes("supplemental_retirement_income") || intake.objectives.selected.includes("long_term_care_funding")) { access += 1; drivers.cash_access.push("access-oriented objective selected"); }

  // Cost sensitivity (ability/willingness to fund)
  let cost = 0;
  if (rp.premium_funding_commitment === "unable_or_unwilling") { cost += 2; drivers.cost_sensitivity.push("premium_funding_commitment=unable_or_unwilling"); }
  else if (rp.premium_funding_commitment === "willing_if_necessary") { cost += 1; drivers.cost_sensitivity.push("premium_funding_commitment=willing_if_necessary"); }

  const level = (score: number): EmphasisLevel => (score >= 2 ? "high" : score === 1 ? "moderate" : "low");
  return {
    guarantee_protection: level(guard),
    growth_orientation: level(growth),
    cash_access: level(access),
    cost_sensitivity: level(cost),
    drivers,
  };
}

/* ============================================================================
 * OUTPUT CONTRACT  (what the pipeline produces / the compliance file holds)
 * Encodes the Reg 187 output requirements: communicate the basis, present
 * favorable AND unfavorable considerations, deliver before application, and
 * capture advisor review. Never the client's input — this is generated.
 * ========================================================================== */

export const suitabilityFlagSchema = z.object({
  code: z.string(),
  description: z.string(),
  severity: z.enum(["info", "note", "warning", "material"]),
  requirement: z.string().optional(), // which regulatory requirement it supports
});

export const recommendationOutputSchema = z.object({
  recommendation_id: z.string().uuid(),
  intake_id: z.string().uuid(),
  schema_version: z.literal(POLICYPLAN_SCHEMA_VERSION),
  library_version: z.string(), // signal-library version stamp for reproducibility
  generated_at: z.string().datetime(),

  // Layer 1 — client-facing summary (Reg 187: reasonable summary, both sides)
  recommendation_summary: z.string(),
  favorable_considerations: z.array(z.string()),
  unfavorable_considerations: z.array(z.string()),
  basis_for_recommendation: z.string(), // the "why", per NAIC/Reg 187

  // Derived context
  inferred_emphasis: z.object({
    guarantee_protection: z.enum(["high", "moderate", "low"]),
    growth_orientation: z.enum(["high", "moderate", "low"]),
    cash_access: z.enum(["high", "moderate", "low"]),
    cost_sensitivity: z.enum(["high", "moderate", "low"]),
  }),
  suitability_flags: z.array(suitabilityFlagSchema).default([]),

  // Timing (Reg 187: disclosure before the consumer applies)
  delivered_before_application: z.boolean(),

  // Human decision-maker of record
  advisor_review: z.object({
    approved: z.boolean(),
    advisor_name: z.string().optional(),
    reviewed_at: z.string().datetime().optional(),
  }),
});

/* ----------------------------------------------------------------------------
 * Inferred types
 * ------------------------------------------------------------------------- */

export type PolicyPlanIntake = z.infer<typeof policyPlanIntakeSchema>;
export type InsuredOwner = z.infer<typeof insuredOwnerSchema>;
export type Objectives = z.infer<typeof objectivesSchema>;
export type Financial = z.infer<typeof financialSchema>;
export type FinancialColumn = z.infer<typeof financialColumnSchema>;
export type ExistingCoverage = z.infer<typeof existingCoverageSchema>;
export type RiskPreferences = z.infer<typeof riskPreferencesSchema>;
export type PolicySpecs = z.infer<typeof policySpecsSchema>;
export type Attestation = z.infer<typeof attestationSchema>;
export type Objective = z.infer<typeof objectiveEnum>;
export type RecommendationOutput = z.infer<typeof recommendationOutputSchema>;

/* ----------------------------------------------------------------------------
 * Client-facing labels (copy layer)
 * ------------------------------------------------------------------------- */

export const OBJECTIVE_LABELS: Record<Objective, string> = {
  income_replacement: "Income replacement",
  mortgage_debt_payoff: "Mortgage or debt payoff",
  education_funding: "Education funding",
  final_expenses: "Final expenses",
  cash_accumulation: "Cash value accumulation",
  supplemental_retirement_income: "Supplemental retirement income",
  long_term_care_funding: "Long-term care funding",
  estate_tax_liquidity: "Estate tax liquidity",
  wealth_transfer: "Wealth transfer",
  estate_equalization: "Estate equalization",
  charitable_giving: "Charitable giving",
  business_succession_buy_sell: "Business succession / buy-sell",
  key_person_protection: "Key person protection",
  executive_benefit: "Executive benefit",
};

export const OBJECTIVE_GROUPS: Record<string, Objective[]> = {
  "Income & family protection": ["income_replacement", "mortgage_debt_payoff", "education_funding", "final_expenses"],
  "Wealth accumulation & access": ["cash_accumulation", "supplemental_retirement_income", "long_term_care_funding"],
  "Estate & legacy": ["estate_tax_liquidity", "wealth_transfer", "estate_equalization", "charitable_giving"],
  "Business": ["business_succession_buy_sell", "key_person_protection", "executive_benefit"],
};
