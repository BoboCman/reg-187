/**
 * PolicyPlan — Demo sample case
 *
 * Fabricated survivorship estate-liquidity case engineered to trigger the
 * suitability-tension detector on the confirmation screen:
 *   guarantee_vs_upside      = strongly_prefer_guarantees   → guard +2
 *   nonguaranteed_elements   = prefer_to_avoid              → guard +2
 *   value_variability        = prefer_stability             → guard +1   → guarantee_protection HIGH
 *   premium_funding_commitment = unable_or_unwilling        → cost  +2   → cost_sensitivity HIGH
 *   death_benefit_duration   = beyond_age_100               → triggers tension flag
 */

import type { PolicyPlanIntake } from "@/lib/policyplan/schema";

export const PP_SAMPLE_CASE: PolicyPlanIntake = {
  schema_version: "2.0.0",
  intake_id: "00000000-0000-0000-0000-000000000001",

  insured_owner: {
    insureds: [
      {
        name: "Eleanor R. Whitfield",
        dob: "1958-04-12",
        gender: "female",
        nicotine_use: "no",
      },
      {
        name: "Thomas G. Whitfield",
        dob: "1955-09-28",
        gender: "male",
        nicotine_use: "no",
      },
    ],
    policy_owner: "The Whitfield Family Irrevocable Trust",
    state_of_ownership: "NY",
    ownership_type: "trust",
    trust_type: "irrevocable",
    grantor_trust: "yes",
    gst_exempt: "yes",
  },

  objectives: {
    selected: ["estate_tax_liquidity", "wealth_transfer", "estate_equalization"],
    primary: "estate_tax_liquidity",
  },

  financial: {
    expected_source_of_premium: "Annual exclusion gifts to trust (Crummey)",
    columns: {
      client_1: {
        annual_income: 420000,
        income_tax_rate: 37,
        cash_cds_securities: 1850000,
        qualified_plans: 920000,
        business_interests: 0,
        real_estate: 680000,
        residence: 1400000,
        other_assets: 0,
        mortgage_amount: 0,
        revolving_debt: 22000,
        other_liability_amount: 0,
      },
      client_2: {
        annual_income: 185000,
        income_tax_rate: 35,
        cash_cds_securities: 740000,
        qualified_plans: 510000,
        business_interests: 0,
        real_estate: 0,
        residence: 0,
        other_assets: 0,
        mortgage_amount: 0,
        revolving_debt: 0,
        other_liability_amount: 0,
      },
    },
  },

  existing_coverage: {
    has_existing_coverage: "yes",
    policies: [
      {
        insurance_company: "Northwestern Mutual",
        policy_number: "NM-8841205",
        insured: "Eleanor R. Whitfield",
        policy_owner: "Eleanor R. Whitfield",
        year_issued: 2006,
        death_benefit: 1000000,
        gross_cash_value: 318000,
        cash_surrender_value: 298000,
        policy_loan_balance: 0,
        premium_amount: 14200,
        policy_type: "whole_life",
        purpose_of_policy: "Estate liquidity — individual policy",
        under_replacement_consideration: "no",
      },
    ],
  },

  // Engineered to produce: guarantee_protection=HIGH, cost_sensitivity=HIGH
  risk_preferences: {
    financial_experience: "moderate",
    value_variability_tolerance: "prefer_stability",
    guarantee_vs_upside: "strongly_prefer_guarantees",
    nonguaranteed_elements: "prefer_to_avoid",
    premium_funding_commitment: "unable_or_unwilling",
    cash_value_access_need: "none_expected",
    complexity_tolerance: "prefer_simple",
  },

  // Engineered to trigger the tension: beyond_age_100 + high guarantee + high cost
  policy_specs: {
    desired_death_benefit: 5000000,
    death_benefit_duration: { mode: "scale", scale_point: "beyond_age_100" },
    desired_premium: 62000,
    premium_duration: { mode: "scale", scale_point: "10_years" },
  },

  notes:
    "Clients are seeking a survivorship (second-to-die) policy to provide liquidity " +
    "for a projected federal estate tax liability. Trust is the applicant and beneficiary. " +
    "Advisor should confirm annual exclusion gifting schedule with estate counsel.",

  attestation: {
    confirmed: true,
    owner_signature: "Eleanor R. Whitfield",
    signed_date: new Date().toISOString().slice(0, 10),
    signer_title: "Trustee",
  },
};
