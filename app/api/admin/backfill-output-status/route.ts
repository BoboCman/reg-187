/**
 * ONE-TIME admin route — backfill policyplan_outputs rows that have
 * status = 'complete' (written by n8n before the node was corrected)
 * to status = 'draft' so CaseWorkspace can advance to the Adopt stage.
 *
 * DELETE THIS FILE once the migration has been applied and n8n has been
 * updated to write status = 'draft'.
 *
 * Usage: POST /api/admin/backfill-output-status
 * Auth:  Supabase session (service-role internally); caller must be signed in.
 * Returns: { updated: number }
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  // Require a valid authenticated session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Patch every 'complete' output row owned by this advisor to 'draft'.
  const { data, error } = await supabase
    .from("policyplan_outputs")
    .update({ status: "draft" })
    .eq("status", "complete")
    .eq("advisor_id", user.id)
    .select("id");

  if (error) {
    console.error("[backfill-output-status] update error:", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ updated: data?.length ?? 0 });
}
