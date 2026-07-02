import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// UUID v4 pattern — basic validation before hitting the database.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  // ── 1. Authenticate ──────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── 2. Validate input ────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const intake_id =
    body !== null &&
    typeof body === "object" &&
    "intake_id" in body &&
    typeof (body as Record<string, unknown>).intake_id === "string"
      ? (body as Record<string, string>).intake_id
      : null;

  if (!intake_id || !UUID_RE.test(intake_id)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // ── 3. Verify ownership and gate on resolved status ───────────────────────
  const { data: intakeRow } = await supabase
    .from("policyplan_intakes")
    .select(
      "id, advisor_id, status, payload, emphasis, suitability_flags, flag_resolutions, liquid_net_worth"
    )
    .eq("id", intake_id)
    .eq("advisor_id", user.id)
    .maybeSingle();

  if (!intakeRow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Gate: only allow generation for cases in 'resolved' status.
  if (intakeRow.status !== "resolved") {
    return NextResponse.json(
      { error: "not_resolved", message: "Case must be resolved before generating." },
      { status: 409 }
    );
  }

  // ── 4. Create pending output row (copying frozen snapshot) ────────────────
  const { data: outputRow, error: insertError } = await supabase
    .from("policyplan_outputs")
    .insert({
      intake_id,
      advisor_id: user.id,
      status: "pending",
      emphasis: intakeRow.emphasis,
      suitability_flags: intakeRow.suitability_flags,
      flag_resolutions: intakeRow.flag_resolutions,
    })
    .select("id")
    .single();

  if (insertError || !outputRow) {
    console.error("[policyplan/generate] Failed to insert output row:", insertError?.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const output_id = outputRow.id as string;

  // ── 5. Build payload — stored snapshot, not a recomputation ──────────────
  const payload = intakeRow.payload as Record<string, unknown>;
  const liquid_net_worth = intakeRow.liquid_net_worth;

  const webhookBody = {
    ...payload,
    output_id,
    intake_id,
    advisor_id: user.id,
    // Frozen snapshot — read once at submit, never recomputed
    emphasis: intakeRow.emphasis,
    suitability_flags: intakeRow.suitability_flags,
    flag_resolutions: intakeRow.flag_resolutions,
    liquid_net_worth,
  };

  // ── 6. Fire n8n webhook ───────────────────────────────────────────────────
  const webhookUrl = process.env.N8N_POLICYPLAN_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_POLICYPLAN_WEBHOOK_SECRET;

  if (!webhookUrl || !webhookSecret) {
    await supabase
      .from("policyplan_outputs")
      .update({ status: "error", meta: { reason: "webhook_not_configured" } })
      .eq("id", output_id);
    console.error("[policyplan/generate] N8N_POLICYPLAN_WEBHOOK_URL or N8N_POLICYPLAN_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "generation_trigger_failed" }, { status: 502 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "policyplan-auth": webhookSecret,
      },
      body: JSON.stringify(webhookBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!n8nResponse.ok) {
      throw new Error(`n8n returned HTTP ${n8nResponse.status}`);
    }
  } catch (err) {
    const reason =
      err instanceof Error ? err.message : "unknown_trigger_error";
    console.error("[policyplan/generate] Webhook trigger failed:", reason);

    await supabase
      .from("policyplan_outputs")
      .update({ status: "error", meta: { reason: "trigger_failed" } })
      .eq("id", output_id);

    return NextResponse.json({ error: "generation_trigger_failed" }, { status: 502 });
  }

  // ── 7. Return accepted ───────────────────────────────────────────────────
  return NextResponse.json({ status: "generating", output_id }, { status: 200 });
}
