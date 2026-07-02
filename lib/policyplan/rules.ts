/**
 * =============================================================================
 * POLICYPLAN — SUITABILITY TENSION RULES  (shared rule module)
 * Runs identically on the client (confirmation screen) and server (n8n pipeline
 * / Phase 2 recommendation engine).  Every rule emits a SuitabilityFlag that
 * conforms to suitabilityFlagSchema so it can be stored in the output contract.
 *
 * Adding a new rule: add a function that pushes to `flags` and call it inside
 * detectSuitabilityTensions.  The detector is the single point of truth — the
 * confirmation screen and the pipeline both import from here.
 * =============================================================================
 */

import type { PolicyPlanIntake, PolicySpecs } from "./schema";
import { deriveFundingCapacity } from "./schema";

export type SuitabilityFlag = {
  code: string;
  description: string;
  severity: "info" | "note" | "warning" | "material";
  requirement?: string;
};

// -----------------------------------------------------------------------------
// Helper: does the chosen coverage duration reach or exceed lifetime?
// Covers scale-point selections for age_100 / beyond_age_100 and age-mode
// entries at or beyond 100.
//
// life_expectancy is intentionally excluded: life expectancy varies by insured
// and must not be treated as automatically reaching lifetime.  If a rule needs
// to handle life_expectancy, add it as a separate, explicitly-named condition
// in that rule rather than routing it through this helper.
// -----------------------------------------------------------------------------
export function durationReachesLifetime(
  duration: PolicySpecs["death_benefit_duration"]
): boolean {
  if (!duration) return false;
  if (duration.mode === "scale") {
    return (
      duration.scale_point === "age_100" ||
      duration.scale_point === "beyond_age_100"
    );
  }
  // age mode: treat ≥ 100 as lifetime
  return duration.mode === "age" && duration.age >= 100;
}

// Helper: does the chosen duration strictly extend beyond age 100?
function durationBeyondAge100(
  duration: PolicySpecs["death_benefit_duration"]
): boolean {
  if (!duration) return false;
  if (duration.mode === "scale") {
    return duration.scale_point === "beyond_age_100";
  }
  return duration.mode === "age" && duration.age > 100;
}

// -----------------------------------------------------------------------------
// Driver-to-phrase maps — narrate from what actually fired
// Add new driver keys here when the scoring function gains new inputs; the
// phrase maps are separate from the rule logic so copy can evolve independently.
// -----------------------------------------------------------------------------
const GUARANTEE_DRIVER_PHRASES: Record<string, string> = {
  "guarantee_vs_upside=strongly_prefer_guarantees":
    "a strong stated preference for guaranteed outcomes over non-guaranteed upside",
  "guarantee_vs_upside=lean_guarantees":
    "a stated lean toward guaranteed outcomes",
  "nonguaranteed_elements=prefer_to_avoid":
    "a preference to avoid non-guaranteed policy elements such as variable premiums, credited rates, or non-guaranteed fees",
  "nonguaranteed_elements=accept_with_limits":
    "a willingness to accept non-guaranteed elements only with limits",
  "value_variability_tolerance=prefer_stability":
    "a preference for stable policy values over year-to-year variability",
};

const COST_DRIVER_PHRASES: Record<string, string> = {
  "premium_funding_commitment=unable_or_unwilling":
    "an inability or unwillingness to fund a higher premium if the policy requires it to remain in force",
  // Forward-compatible: add new cost driver keys here as the scoring function gains inputs
};

function buildTensionBody(
  guaranteeDrivers: string[],
  costDrivers: string[],
  durationLabel: string
): string {
  const guarPhrases = guaranteeDrivers
    .map((d) => GUARANTEE_DRIVER_PHRASES[d])
    .filter(Boolean);
  const costPhrases = costDrivers
    .map((d) => COST_DRIVER_PHRASES[d])
    .filter(Boolean);

  const guarText =
    guarPhrases.length > 0
      ? guarPhrases.join("; ")
      : "a preference for coverage guarantees";

  const costText =
    costPhrases.length > 0
      ? costPhrases.join("; ")
      : "limited premium funding flexibility";

  return (
    `The client's profile reflects ${guarText}. ` +
    `At the same time, the profile records ${costText}. ` +
    `The target coverage duration is ${durationLabel}, which typically requires a permanent ` +
    `policy with a higher and longer-term premium commitment. ` +
    `Review whether the funding expectations and the coverage duration are consistent before proceeding.`
  );
}

// -----------------------------------------------------------------------------
// Rule: GUARANTEE_COST_DURATION_TENSION
// Fires when guarantee preference is high, cost sensitivity is high, and the
// target coverage duration extends beyond age 100.
// -----------------------------------------------------------------------------
function ruleGuaranteeCostDurationTension(
  intake: PolicyPlanIntake,
  emphasis: {
    guarantee_protection: "high" | "moderate" | "low";
    cost_sensitivity: "high" | "moderate" | "low";
    drivers: Record<string, string[]>;
  },
  flags: SuitabilityFlag[]
) {
  const dbDuration = intake.policy_specs?.death_benefit_duration;

  if (
    emphasis.guarantee_protection === "high" &&
    emphasis.cost_sensitivity === "high" &&
    durationBeyondAge100(dbDuration)
  ) {
    const durationLabel =
      dbDuration?.mode === "scale"
        ? "beyond age 100"
        : dbDuration?.mode === "age"
        ? `attained age ${dbDuration.age}`
        : "beyond age 100";

    // Boundary note: fires on beyond_age_100 (scale) and age > 100 (age mode).
    // age_100 / exactly age 100 deliberately excluded — a standard GUL guarantee
    // to 100 is not the more aggressive beyond-100 commitment this rule targets.
    flags.push({
      code: "GUARANTEE_COST_DURATION_TENSION",
      description: buildTensionBody(
        emphasis.drivers.guarantee_protection,
        emphasis.drivers.cost_sensitivity,
        durationLabel
      ),
      severity: "material",
      requirement: "224.4(g)",
    });
  }
}

// -----------------------------------------------------------------------------
// Helper: sum household liquid net worth across all present financial columns.
// Sums client_1, client_2, and joint so joint cases are not understated.
// Returns null when no financial columns are present (prevents false negatives).
// -----------------------------------------------------------------------------
function householdLiquidNetWorth(intake: PolicyPlanIntake): number | null {
  const cols = intake.financial?.columns;
  if (!cols) return null;
  const present = [cols.client_1, cols.client_2, cols.joint].filter(
    (c): c is NonNullable<typeof c> => c != null
  );
  if (present.length === 0) return null;
  return present.reduce(
    (sum, c) => sum + deriveFundingCapacity(c).primary_capacity,
    0
  );
}

// -----------------------------------------------------------------------------
// Rule: GUARANTEE_VS_NONGUARANTEED_RELIANCE
// Fires when the client leans toward guarantees / prefers to avoid
// non-guaranteed elements, yet has set a cash-value or income target that
// depends on non-guaranteed policy performance.
// -----------------------------------------------------------------------------
function ruleGuaranteeVsNonguaranteedReliance(
  intake: PolicyPlanIntake,
  _emphasis: unknown,
  flags: SuitabilityFlag[]
) {
  const rp = intake.risk_preferences;
  const specs = intake.policy_specs;

  const guaranteeSignal =
    rp.guarantee_vs_upside === "strongly_prefer_guarantees" ||
    rp.guarantee_vs_upside === "lean_guarantees" ||
    rp.nonguaranteed_elements === "prefer_to_avoid";

  // Check that the sub-object exists AND has at least one meaningful value.
  // After the Step 6 onValid cleanup, empty sub-objects become undefined, but
  // guard here as well so a partially-cleared object `{ amount: undefined }`
  // does not produce a false positive.
  const hasAccumTarget =
    specs?.desired_cash_value_accumulation != null &&
    (specs.desired_cash_value_accumulation.amount != null ||
      specs.desired_cash_value_accumulation.at_age != null ||
      specs.desired_cash_value_accumulation.year != null);
  const hasDistTarget =
    specs?.desired_annual_distribution != null &&
    (specs.desired_annual_distribution.amount != null ||
      specs.desired_annual_distribution.start_age != null ||
      specs.desired_annual_distribution.end_age != null);
  const hasTarget = hasAccumTarget || hasDistTarget;

  if (!guaranteeSignal || !hasTarget) return;

  // Derive the exact preference phrase from what actually fired
  const prefPhrases: string[] = [];
  if (rp.nonguaranteed_elements === "prefer_to_avoid") {
    prefPhrases.push("a stated preference to avoid non-guaranteed policy elements");
  }
  if (rp.guarantee_vs_upside === "strongly_prefer_guarantees") {
    prefPhrases.push("a strong stated preference for guaranteed outcomes");
  } else if (rp.guarantee_vs_upside === "lean_guarantees") {
    prefPhrases.push("a stated lean toward guaranteed outcomes");
  }

  // Derive the exact target phrase from what was set
  const targetPhrases: string[] = [];
  if (hasAccumTarget) targetPhrases.push("a cash value accumulation target");
  if (hasDistTarget) targetPhrases.push("an annual distribution target");

  const prefText = prefPhrases.join("; ");
  const targetText = targetPhrases.join(" and ");

  const severity =
    rp.nonguaranteed_elements === "prefer_to_avoid" ? "material" : "warning";

  flags.push({
    code: "GUARANTEE_VS_NONGUARANTEED_RELIANCE",
    description:
      `The client's answers indicate ${prefText}, yet the file also sets ${targetText}, ` +
      `which generally depends on non-guaranteed policy performance. ` +
      `The producer should reconcile these positions and document that the client understands ` +
      `these target values are not guaranteed and may vary.`,
    severity,
    requirement: "224.3(g) / 224.4(b)(3)(i)",
  });
}

// -----------------------------------------------------------------------------
// Rule: SIMPLICITY_VS_COMPLEXITY
// Fires when the client prefers straightforward products yet is oriented toward
// non-guaranteed upside — a coherence/disclosure tension between two stated answers.
// -----------------------------------------------------------------------------
function ruleSimplicityVsComplexity(
  intake: PolicyPlanIntake,
  emphasis: {
    growth_orientation: "high" | "moderate" | "low";
    [key: string]: unknown;
  },
  flags: SuitabilityFlag[]
) {
  const rp = intake.risk_preferences;

  if (rp.complexity_tolerance !== "prefer_simple") return;

  const upsideLean =
    rp.guarantee_vs_upside === "lean_upside" ||
    rp.guarantee_vs_upside === "strongly_prefer_upside";
  const growthHigh = emphasis.growth_orientation === "high";

  if (!upsideLean && !growthHigh) return;

  // Derive the upside phrase from what actually fired
  let upsidePhrase: string;
  if (rp.guarantee_vs_upside === "strongly_prefer_upside") {
    upsidePhrase = "a strong stated preference for non-guaranteed upside potential";
  } else if (rp.guarantee_vs_upside === "lean_upside") {
    upsidePhrase = "a stated lean toward non-guaranteed upside potential";
  } else {
    upsidePhrase = "a growth-oriented profile";
  }

  flags.push({
    code: "SIMPLICITY_VS_COMPLEXITY",
    description:
      `The client stated a preference for straightforward products while also indicating ` +
      `${upsidePhrase}. Upside-oriented designs generally involve greater complexity — ` +
      `indexed crediting strategies, participation rates, caps, or other non-transparent ` +
      `elements. The producer should document that the client understands the complexity of ` +
      `any upside-oriented design under consideration, notwithstanding the stated preference ` +
      `for simplicity.`,
    severity: "warning",
    requirement: "224.4(b)(3)(i)",
  });
}

// -----------------------------------------------------------------------------
// Rule: AFFORDABILITY_FLOOR
// Fires when the desired annual premium meets or exceeds the client's reported
// household liquid net worth, or when liquid net worth is zero or negative.
// Silent when either value is absent — no false negatives, no noise.
// -----------------------------------------------------------------------------
function ruleAffordabilityFloor(
  intake: PolicyPlanIntake,
  _emphasis: unknown,
  flags: SuitabilityFlag[]
) {
  const premium = intake.policy_specs?.desired_premium;
  const lnw = householdLiquidNetWorth(intake);

  // Silent when either input is missing
  if (lnw == null || premium == null) return;

  // Only fire when the numbers on their face do not support the premium
  if (lnw > 0 && premium < lnw) return;

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const lnwPhrase =
    lnw <= 0
      ? `the client's reported household liquid net worth is ${fmt(lnw)} (zero or negative)`
      : `the desired annual premium of ${fmt(premium)} meets or exceeds the client's reported ` +
        `household liquid net worth of ${fmt(lnw)}`;

  flags.push({
    code: "AFFORDABILITY_FLOOR",
    description:
      `${lnwPhrase.charAt(0).toUpperCase() + lnwPhrase.slice(1)}. ` +
      `On the information provided, the premium does not appear supportable from liquid ` +
      `resources. The producer should confirm and document the funding source for the premium ` +
      `and whether it is durable (for example, recurring income versus a one-time source).`,
    severity: "material",
    requirement: "224.4(g)",
  });
}

// -----------------------------------------------------------------------------
// Main export: detectSuitabilityTensions
// Pass the validated intake and the already-computed emphasis object.
// Returns a SuitabilityFlag[] ready for the output contract's suitability_flags
// array and for direct rendering on the confirmation screen.
// -----------------------------------------------------------------------------
export function detectSuitabilityTensions(
  intake: PolicyPlanIntake,
  emphasis: {
    guarantee_protection: "high" | "moderate" | "low";
    growth_orientation: "high" | "moderate" | "low";
    cost_sensitivity: "high" | "moderate" | "low";
    drivers: Record<string, string[]>;
  }
): SuitabilityFlag[] {
  const flags: SuitabilityFlag[] = [];
  ruleGuaranteeCostDurationTension(intake, emphasis, flags);
  ruleGuaranteeVsNonguaranteedReliance(intake, emphasis, flags);
  ruleSimplicityVsComplexity(intake, emphasis, flags);
  ruleAffordabilityFloor(intake, emphasis, flags);
  return flags;
}
