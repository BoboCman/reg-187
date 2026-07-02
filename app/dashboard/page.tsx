import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  inferDesignEmphasis,
  policyPlanIntakeSchema,
} from "@/lib/policyplan/schema";
import { detectSuitabilityTensions } from "@/lib/policyplan/rules";
import {
  DashboardClient,
  type CaseRow,
} from "@/components/policyplan/DashboardClient";

export const metadata = {
  title: "Cases — PolicyPlan",
  description: "Your submitted PolicyPlan intake cases.",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // Confirm session — middleware should have redirected, but guard here too.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Query the advisor's own rows (RLS: advisor_id = auth.uid()).
  const { data: rows, error } = await supabase
    .from("policyplan_intakes")
    .select("id, created_at, primary_objective, ownership_type, payload, status, emphasis, suitability_flags")
    .neq("status", "superseded")
    .order("created_at", { ascending: false });

  if (error) {
    // Surface a non-crashing error state rather than throwing.
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <p className="text-sm text-[var(--color-error)]">
          Failed to load cases: {error.message}
        </p>
      </div>
    );
  }

  // Parse each payload. Prefer stored suitability_flags (frozen at submit);
  // fall back to live computation for legacy rows that predate the Step 1 migration.
  const cases: CaseRow[] = (rows ?? []).map((row) => {
    const parsed = policyPlanIntakeSchema.safeParse(row.payload);

    if (!parsed.success) {
      const insuredDisplay =
        typeof row.payload?.insured_owner?.insureds?.[0]?.name === "string"
          ? (row.payload.insured_owner.insureds as Array<{ name: string }>)
              .map((i) => i.name)
              .filter(Boolean)
              .join(" & ")
          : "Unknown";

      return {
        id: row.id,
        created_at: row.created_at,
        primary_objective: row.primary_objective ?? "",
        ownership_type: row.ownership_type ?? "",
        insured_display: insuredDisplay,
        flags: [],
        status: row.status ?? "submitted",
      };
    }

    const intake = parsed.data;
    const insuredDisplay = intake.insured_owner.insureds
      .map((i) => i.name)
      .filter(Boolean)
      .join(" & ");

    // Use stored frozen snapshot when available; compute live for legacy rows.
    const flags = Array.isArray(row.suitability_flags) && row.suitability_flags.length >= 0
      ? row.suitability_flags
      : (() => {
          const emphasis = inferDesignEmphasis({
            objectives: intake.objectives,
            risk_preferences: intake.risk_preferences,
            policy_specs: intake.policy_specs,
          });
          return detectSuitabilityTensions(intake, emphasis);
        })();

    return {
      id: row.id,
      created_at: row.created_at,
      primary_objective: intake.objectives.primary,
      ownership_type: intake.insured_owner.ownership_type,
      insured_display: insuredDisplay,
      flags,
      status: row.status ?? "submitted",
    };
  });

  return <DashboardClient cases={cases} />;
}
