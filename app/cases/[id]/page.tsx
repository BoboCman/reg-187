import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { policyPlanIntakeSchema } from "@/lib/policyplan/schema";
import { CaseWorkspace } from "@/components/policyplan/CaseWorkspace";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return {
    title: `Case ${id.slice(0, 8)}… — PolicyPlan`,
  };
}

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the intake row including stored frozen snapshot columns.
  const { data: row, error } = await supabase
    .from("policyplan_intakes")
    .select(
      "id, created_at, payload, status, emphasis, suitability_flags, flag_resolutions, version, supersedes_intake_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  // Parse payload.
  const parsed = policyPlanIntakeSchema.safeParse(row.payload);
  if (!parsed.success) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <p className="text-sm text-[var(--color-error)]">
          This case record could not be parsed. It may have been created with an
          older schema version.
        </p>
      </div>
    );
  }

  // Mark the intake in_review when an advisor opens a submitted case.
  if (row.status === "submitted") {
    await supabase
      .from("policyplan_intakes")
      .update({ status: "in_review" })
      .eq("id", id)
      .eq("advisor_id", user.id);
  }

  // The effective status for display — if we just moved it, show in_review.
  const effectiveStatus = row.status === "submitted" ? "in_review" : row.status;

  // Most recent output row for this case.
  const { data: outputRow } = await supabase
    .from("policyplan_outputs")
    .select(
      "id, status, advisor_letter, client_summary, suitability_flags, flag_resolutions, adopted_by, adopted_at, adoption_confirmation, completed_at, meta"
    )
    .eq("intake_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <CaseWorkspace
      intakeId={row.id}
      intake={parsed.data}
      intakeStatus={effectiveStatus ?? "in_review"}
      storedEmphasis={row.emphasis ?? null}
      storedFlags={row.suitability_flags ?? null}
      storedResolutions={row.flag_resolutions ?? null}
      intakeVersion={row.version ?? 1}
      createdAt={row.created_at}
      outputRow={outputRow ?? null}
    />
  );
}
