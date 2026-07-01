/**
 * ============================================================================
 * LIDQ DIGITAL INTAKE — CANONICAL DATA CONTRACT  (v0.1.0)
 * The Life Insurance Design Questionnaire (Valmark v01.2020NY), digital form.
 * ============================================================================
 *
 * This file is the SINGLE SOURCE OF TRUTH for the LIDQ intake payload.
 *   • v0 builds the form + client-side validation against these schemas.
 *   • Supabase columns mirror these shapes (generated, not hand-modeled).
 *   • The n8n / DCB analog consumes a LidqIntake object as its webhook body.
 *
 * DESIGN RULES (mirrors the PolicyMatch house style):
 *   • The intake payload carries CODES and RAW VALUES only. No enriched
 *     narrative text lives here — enriched text is joined server-side from
 *     Supabase by the signal layer, keyed on these codes.
 *   • Totals are DERIVED, never a source of truth. `deriveFinancialTotals`
 *     is the one function both the form and the server call, so a total can
 *     never disagree with itself. (This is the "no wrong total in front of
 *     Larry" guarantee.)
 *   • Every enum value is a stable snake_case code. Client-facing labels are
 *     a separate concern (LABELS map at the bottom), so we can restyle copy
 *     without touching the contract or the data.
 *
 * Requires: zod ^3.23
 */

import { z } from "zod";

export const LIDQ_SCHEMA_VERSION = "0.1.0";

/* ----------------------------------------------------------------------------
 * Reusable primitives
 * ------------------------------------------------------------------------- */

/** Non-negative currency amount. Empty inputs coerce to undefined upstream. */
const money = z.number().nonnegative().optional();
/** Whole-year duration (e.g. remaining premium years, mortgage term). */
const years = z.number().int().nonnegative().max(100).optional();
/** Marginal tax rate as a percent, 0–100. */
const percent = z.number().min(0).max(100).optional();
/** An age used for policy horizons. 0–120 covers issue through maturity. */
const age = z.number().int().min(0).max(120);

/* ============================================================================
 * REGION 1 — INSURED INFORMATION  (page 1)
 * ========================================================================== */

export const genderEnum = z.enum(["male", "female"]);
export const yesNo = z.enum(["yes", "no"]);

export const businessTypeEnum = z.enum([
  "c_corp",
  "s_corp",
  "llc",
  "limited_partnership",
  "sole_proprietorship",
]);

export const trustTypeEnum = z.enum(["irrevocable", "revocable"]);

export const insuredSchema = z.object({
  name: z.string().min(1),
  dob: z.string().date().optional(), // ISO YYYY-MM-DD
  gender: genderEnum.optional(),
  nicotine_use: yesNo.optional(),
});

export const ownershipEnum = z.enum(["individual", "business", "trust"]);

export const insuredInfoSchema = z
  .object({
    // The LIDQ supports up to two insureds (joint / survivorship cases).
    clients: z.array(insuredSchema).min(1).max(2),
    policy_owner: z.string().optional(),
    state_of_ownership: z.string().length(2).optional(), // 2-letter US state
    ownership_type: ownershipEnum.default("individual"),

    // Only when ownership_type === "business"
    business_type: businessTypeEnum.optional(),

    // Only when ownership_type === "trust"
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
 * REGION 2 — FINANCIAL INFORMATION  (page 1)
 * Three peer columns: Client 1, Client 2, Joint. Joint is entered
 * INDEPENDENTLY (jointly-owned assets), it is NOT the sum of the individual
 * columns. Totals within a column are derived (see deriveFinancialTotals).
 * ========================================================================== */

export const financialColumnSchema = z.object({
  annual_income: money,
  income_tax_rate: percent,

  // Liquid assets
  cash_cds_securities: money,
  qualified_plans: money,

  // Other assets
  business_interests: money,
  real_estate: money,
  residence: money,
  other_assets: money,

  // Liabilities (mortgage + other carry a duration in years)
  mortgage_amount: money,
  mortgage_duration_years: years,
  revolving_debt: money,
  other_liability_amount: money,
  other_liability_duration_years: years,
});

export const financialSchema = z.object({
  expected_source_of_premium: z.string().optional(),
  columns: z.object({
    client_1: financialColumnSchema,
    client_2: financialColumnSchema.optional(), // absent in single-insured cases
    joint: financialColumnSchema.optional(),
  }),
  financial_goals_and_objectives: z.string().optional(), // free text
});

/**
 * Derived totals for one financial column. This is the ONLY place the math
 * lives. The form displays these live; the server recomputes with the same
 * function on ingest. Formula confirmed against the LIDQ line grouping:
 *   Total Liquid Assets = cash/CDs/securities + qualified plans
 *   Total Assets        = Total Liquid Assets + business + real estate
 *                         + residence + other
 *   Total Liabilities   = mortgage + revolving + other liability
 *   Net Worth           = Total Assets - Total Liabilities
 *   Liquid Net Worth    = Total Liquid Assets - Total Liabilities
 *
 * "TOTAL ASSETS" = all assets (liquid + other); this is plain accounting and
 * matches the form's own "NET WORTH (Assets - Liabilities)" line, which must
 * net against everything. This arithmetic is retained unchanged.
 *
 * WHICH NUMBER GOVERNS SUITABILITY (regulation-informed, see deriveFundingCapacity):
 * Total net worth is retained as financial-situation context, but it is NOT the
 * affordability driver. The governing capacity metric for the funding-ability
 * gate is LIQUID net worth (with income). Basis:
 *   - Reg 187 (11 NYCRR 224.4(g)): recommend only with a reasonable basis that
 *     the consumer has the financial ability to meet the policy's commitments.
 *   - Reg 187 suitability info: "financial resources that will be used to fund
 *     the policy" — an ability-to-pay / liquidity concept.
 *   - Reg BI / FINRA 2111: "liquidity needs" is a distinct enumerated profile
 *     factor; SEC care guidance narrows away from illiquid, long-horizon
 *     instruments for high-liquidity-need clients.
 *   - SEC 17a-3 record-keeping defines net worth EXCLUDING the primary
 *     residence; liquid net worth already honors that by construction.
 */
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
 * Which balance-sheet figure the suitability/affordability logic keys off.
 * Regulation-informed decision (see deriveFinancialTotals note for citations):
 * the funding-ability gate is a liquidity question, so `liquid_net_worth` is
 * PRIMARY and `net_worth` is SECONDARY context. The DCB analog consumes this
 * so the funding-ability signal is computed one way, every time.
 */
export const CAPACITY_BASIS = "liquid_net_worth" as const;

export function deriveFundingCapacity(col: FinancialColumn) {
  const t = deriveFinancialTotals(col);
  const n = (v: number | undefined) => v ?? 0;
  return {
    // Governing metric for the Reg 187 224.4(g) ability-to-fund gate.
    primary_capacity: t.liquid_net_worth,
    primary_capacity_basis: CAPACITY_BASIS,
    // Retained context only — never the affordability determinant.
    secondary_context: {
      net_worth: t.net_worth,
      annual_income: n(col.annual_income),
    },
    // Residence is excluded from capacity by construction (SEC 17a-3
    // convention); surfaced so the audit layer can state it explicitly.
    residence_excluded_from_capacity: n(col.residence),
  };
}

/* ============================================================================
 * REGION 3 — EXISTING LIFE INSURANCE  (page 2)
 * Up to three policies. Manual repeater for the demo; ATLAS can front-door
 * this later off the critical path (upload illustration -> auto-fill).
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
  next_premium_due_date: z.string().date().optional(),
  policy_type: policyTypeEnum.optional(),
  purpose_of_policy: z.string().optional(),
  premium_source: z.string().optional(),
  remaining_premium_years: years,
});

export const existingInsuranceSchema = z
  .object({
    has_existing_insurance: yesNo,
    policies: z.array(existingPolicySchema).max(3).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.has_existing_insurance === "yes" && v.policies.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["policies"],
        message: "List at least one policy when existing insurance is 'yes'.",
      });
    }
  });

/* ============================================================================
 * REGION 4 — PURPOSE OF NEW POLICY / OBJECTIVES  (page 2)
 * 13 objectives across three groups. Multi-select, with exactly one primary.
 * ========================================================================== */

export const objectiveEnum = z.enum([
  // PERSONAL (8)
  "survivor_income",
  "tax_deferred_savings",
  "retirement_supplement",
  "long_term_care_planning",
  "asset_diversification",
  "asset_value_hedge",
  "estate_liquidity",
  "estate_equalization",
  // BUSINESS (3)
  "business_continuity_buy_sell",
  "business_continuity_key_person",
  "executive_benefit",
  // CHARITABLE (2)
  "enhanced_charitable_gifts",
  "asset_replacement",
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
 * REGION 5 — NEW POLICY SPECIFICATIONS  (page 3)
 * The signature dual-mode duration controls: the advisor either types an AGE
 * or picks a labeled SCALE point. Modeled as a discriminated union so an age
 * and a scale point can never both be set.
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

export const newPolicySpecsSchema = z.object({
  desired_death_benefit: money,
  death_benefit_duration: deathBenefitDurationSchema.optional(),

  desired_premium: money,
  premium_duration: premiumDurationSchema.optional(),

  desired_cash_value_accumulation: z
    .object({
      amount: money,
      at_age: age.optional(),
      year: z.number().int().min(1).max(100).optional(), // policy year
    })
    .optional(),

  desired_annual_distribution: z
    .object({
      amount: money,
      start_age: age.optional(),
      end_age: age.optional(),
    })
    .optional(),
});

/* ============================================================================
 * REGION 6 — DESIGN PRIORITIES  (page 3)
 * Forced 1–5 ranking. Must be a permutation: each rank used exactly once.
 * ========================================================================== */

export const designElementEnum = z.enum([
  "safety",
  "flexibility",
  "equity",
  "certainty",
  "premium_level",
]);

const rank = z.number().int().min(1).max(5);

export const designPrioritiesSchema = z
  .object({
    safety: rank,
    flexibility: rank,
    equity: rank,
    certainty: rank,
    premium_level: rank,
  })
  .superRefine((v, ctx) => {
    const ranks = Object.values(v);
    if (new Set(ranks).size !== 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Design priorities must be a unique 1–5 ranking (no ties).",
      });
    }
  });

/* ============================================================================
 * REGION 7 — RISK TOLERANCE  (page 4)
 * Q1–Q4 categorical (varying option counts). Q5–Q10 four-point agree/disagree.
 * ========================================================================== */

export const highToLowEnum = z.enum(["very_high", "high", "medium", "low"]);
export const agreeEnum = z.enum([
  "strongly_agree",
  "agree",
  "disagree",
  "strongly_disagree",
]);

export const riskToleranceSchema = z.object({
  q1_investment_knowledge: highToLowEnum, // very high / high / medium / low
  q2_investment_focus: z.enum([
    "tangible_assets",
    "equities",
    "fixed_income",
    "bank_cds_money_market",
  ]),
  q3_inflation_concern: highToLowEnum,
  q4_cash_value_access_horizon: z.enum([
    "never",
    "more_than_16_years",
    "10_to_16_years",
    "6_to_9_years",
    "less_than_6_years",
  ]),
  q5_accept_return_variation: agreeEnum,
  q6_pay_more_for_certainty: agreeEnum,
  q7_pay_more_for_ltc: agreeEnum,
  q8_accept_higher_premium_risk: agreeEnum,
  q9_accept_opaque_crediting: agreeEnum,
  q10_accept_higher_fees_for_upside: agreeEnum,
});

/* ============================================================================
 * REGION 8 — ATTESTATION & SIGNATURE  (page 4)
 * The Reg 187 suitability attestation. `confirmed` is a hard gate: literal
 * true, so the payload cannot validate without an affirmative attestation.
 * ========================================================================== */

export const attestationSchema = z.object({
  confirmed: z.literal(true), // must be checked to submit
  owner_signature: z.string().min(1), // typed name (e-sign) for the demo
  signed_date: z.string().date(), // ISO YYYY-MM-DD
  signer_title: z.string().optional(), // if owner is a trust/business
});

/* ============================================================================
 * TOP-LEVEL PAYLOAD
 * ========================================================================== */

export const lidqIntakeSchema = z.object({
  schema_version: z.literal(LIDQ_SCHEMA_VERSION).default(LIDQ_SCHEMA_VERSION),
  analysis_id: z.string().uuid().optional(), // assigned server-side
  submitted_at: z.string().datetime().optional(),

  insured_info: insuredInfoSchema,
  financial: financialSchema,
  existing_insurance: existingInsuranceSchema,
  objectives: objectivesSchema,
  new_policy_specs: newPolicySpecsSchema,
  design_priorities: designPrioritiesSchema,
  risk_tolerance: riskToleranceSchema,
  notes: z.string().optional(),
  attestation: attestationSchema,
});

/* ----------------------------------------------------------------------------
 * Inferred types (v0 imports these; no duplicate hand-written interfaces)
 * ------------------------------------------------------------------------- */

export type LidqIntake = z.infer<typeof lidqIntakeSchema>;
export type InsuredInfo = z.infer<typeof insuredInfoSchema>;
export type Financial = z.infer<typeof financialSchema>;
export type FinancialColumn = z.infer<typeof financialColumnSchema>;
export type ExistingInsurance = z.infer<typeof existingInsuranceSchema>;
export type Objectives = z.infer<typeof objectivesSchema>;
export type NewPolicySpecs = z.infer<typeof newPolicySpecsSchema>;
export type DesignPriorities = z.infer<typeof designPrioritiesSchema>;
export type RiskTolerance = z.infer<typeof riskToleranceSchema>;
export type Attestation = z.infer<typeof attestationSchema>;
export type Objective = z.infer<typeof objectiveEnum>;
export type DesignElement = z.infer<typeof designElementEnum>;

/* ----------------------------------------------------------------------------
 * Client-facing labels (copy layer — restyle without touching the contract).
 * Kept minimal here; the full label + enriched-text set lives in Supabase.
 * ------------------------------------------------------------------------- */

export const OBJECTIVE_LABELS: Record<Objective, string> = {
  survivor_income: "Survivor Income",
  tax_deferred_savings: "Tax-Deferred Savings",
  retirement_supplement: "Retirement Supplement",
  long_term_care_planning: "Long-Term Care Planning",
  asset_diversification: "Asset Diversification",
  asset_value_hedge: "Asset Value Hedge",
  estate_liquidity: "Estate Liquidity",
  estate_equalization: "Estate Equalization",
  business_continuity_buy_sell: "Business Continuity — Buy-Sell Funding",
  business_continuity_key_person: "Business Continuity — Key Person",
  executive_benefit: "Executive Benefit",
  enhanced_charitable_gifts: "Enhanced Charitable Gifts",
  asset_replacement: "Asset Replacement",
};

export const DESIGN_ELEMENT_LABELS: Record<DesignElement, string> = {
  safety: "Safety",
  flexibility: "Flexibility",
  equity: "Equity",
  certainty: "Certainty",
  premium_level: "Premium Level",
};
