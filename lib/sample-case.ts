import type { LidqIntake } from "@/lib/lidq-schema";
import { today } from "@/lib/utils";

/**
 * Fabricated sample case engineered around a suitability tension:
 *  - Premium level ranked 1 (most important design priority)
 *  - Death benefit duration: beyond_age_100 (longest possible)
 *  - Q8 (willing to assume risk of significantly higher premiums): strongly_disagree
 * These three signals conflict — the advisor wants the longest coverage at the
 * lowest premium, but the applicant is unwilling to bear premium risk.
 */
export const SAMPLE_CASE: LidqIntake = {
  schema_version: "0.1.0",

  insured_info: {
    clients: [
      {
        name: "Margaret A. Holloway",
        dob: "1962-04-17",
        gender: "female",
        nicotine_use: "no",
      },
      {
        name: "Robert J. Holloway",
        dob: "1959-11-03",
        gender: "male",
        nicotine_use: "no",
      },
    ],
    policy_owner: "The Holloway Family Irrevocable Trust",
    state_of_ownership: "NY",
    ownership_type: "trust",
    trust_type: "irrevocable",
    grantor_trust: "yes",
    gst_exempt: "yes",
  },

  financial: {
    expected_source_of_premium: "Annual gift from trust corpus (Crummey notice)",
    columns: {
      client_1: {
        annual_income: 320000,
        income_tax_rate: 37,
        cash_cds_securities: 850000,
        qualified_plans: 1200000,
        business_interests: 0,
        real_estate: 0,
        residence: 2400000,
        other_assets: 75000,
        mortgage_amount: 420000,
        mortgage_duration_years: 18,
        revolving_debt: 12000,
        other_liability_amount: 0,
        other_liability_duration_years: 0,
      },
      client_2: {
        annual_income: 195000,
        income_tax_rate: 35,
        cash_cds_securities: 620000,
        qualified_plans: 980000,
        business_interests: 1500000,
        real_estate: 0,
        residence: 0,
        other_assets: 30000,
        mortgage_amount: 0,
        mortgage_duration_years: 0,
        revolving_debt: 8500,
        other_liability_amount: 0,
        other_liability_duration_years: 0,
      },
      joint: {
        annual_income: 0,
        income_tax_rate: 0,
        cash_cds_securities: 180000,
        qualified_plans: 0,
        business_interests: 0,
        real_estate: 650000,
        residence: 0,
        other_assets: 0,
        mortgage_amount: 310000,
        mortgage_duration_years: 22,
        revolving_debt: 0,
        other_liability_amount: 0,
        other_liability_duration_years: 0,
      },
    },
    financial_goals_and_objectives:
      "Preserve estate value for three adult children. Estate currently exposed to federal transfer tax. Goal is to use policy proceeds to fund estate taxes at second death without forcing asset liquidation.",
  },

  existing_insurance: {
    has_existing_insurance: "yes",
    policies: [
      {
        insurance_company: "Guardian Life",
        policy_number: "GL-4471892",
        insured: "Margaret A. Holloway",
        policy_owner: "The Holloway Family Irrevocable Trust",
        year_issued: 2008,
        death_benefit: 1000000,
        gross_cash_value: 284000,
        policy_loan_balance: 0,
        cash_surrender_value: 271000,
        premium_amount: 18500,
        next_premium_due_date: "2026-03-01",
        policy_type: "whole_life",
        purpose_of_policy: "Estate liquidity — original ILIT policy",
        premium_source: "Annual Crummey gift",
        remaining_premium_years: 12,
      },
    ],
  },

  objectives: {
    selected: ["estate_liquidity", "estate_equalization", "tax_deferred_savings"],
    primary: "estate_liquidity",
  },

  new_policy_specs: {
    desired_death_benefit: 5000000,
    death_benefit_duration: {
      mode: "scale",
      scale_point: "beyond_age_100",
    },
    desired_premium: 85000,
    premium_duration: {
      mode: "scale",
      scale_point: "10_years",
    },
    desired_cash_value_accumulation: {
      amount: 500000,
      at_age: 80,
      year: 20,
    },
    desired_annual_distribution: {
      amount: 0,
      start_age: undefined,
      end_age: undefined,
    },
  },

  design_priorities: {
    safety: 2,
    flexibility: 3,
    equity: 4,
    certainty: 5,
    premium_level: 1, // ranked most important — tension point
  },

  risk_tolerance: {
    q1_investment_knowledge: "medium",
    q2_investment_focus: "fixed_income",
    q3_inflation_concern: "high",
    q4_cash_value_access_horizon: "never",
    q5_accept_return_variation: "disagree",
    q6_pay_more_for_certainty: "strongly_agree",
    q7_pay_more_for_ltc: "agree",
    q8_accept_higher_premium_risk: "strongly_disagree", // tension point
    q9_accept_opaque_crediting: "disagree",
    q10_accept_higher_fees_for_upside: "disagree",
  },

  notes:
    "Existing ILIT policy (Guardian GL-4471892) is in good standing. Combined survivorship design preferred to minimize premium outlay. Consider second-to-die guaranteed UL or whole life with 10-pay structure. Confirm current estate valuation with CPA before finalizing death benefit.",

  attestation: {
    confirmed: true,
    owner_signature: "Margaret A. Holloway, Trustee",
    signed_date: today(),
    signer_title: "Trustee",
  },
};
