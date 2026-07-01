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
// Main export: detectSuitabilityTensions
// Pass the validated intake and the already-computed emphasis object.
// Returns a SuitabilityFlag[] ready for the output contract's suitability_flags
// array and for direct rendering on the confirmation screen.
// -----------------------------------------------------------------------------
export function detectSuitabilityTensions(
  intake: PolicyPlanIntake,
  emphasis: {
    guarantee_protection: "high" | "moderate" | "low";
    cost_sensitivity: "high" | "moderate" | "low";
    drivers: Record<string, string[]>;
  }
): SuitabilityFlag[] {
  const flags: SuitabilityFlag[] = [];
  ruleGuaranteeCostDurationTension(intake, emphasis, flags);
  // Additional rules: add calls here
  return flags;
}
