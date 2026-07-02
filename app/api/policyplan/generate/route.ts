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

  // ── 3. Verify ownership ──────────────────────────────────────────────────
  const { data: intakeRow } = await supabase
    .from("policyplan_intakes")
    .select("id, advisor_id, payload")
    .eq("id", intake_id)
    .eq("advisor_id", user.id)
    .maybeSingle();

  // Return 404 regardless of whether the row exists for another advisor.
  if (!intakeRow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // ── 4. Create pending output row ─────────────────────────────────────────
  const { data: outputRow, error: insertError } = await supabase
    .from("policyplan_outputs")
    .insert({
      intake_id,
      advisor_id: user.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !outputRow) {
    console.error("[policyplan/generate] Failed to insert output row:", insertError?.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const output_id = outputRow.id as string;

  // ── 5. Fire n8n webhook (server-to-server, fire-and-forget) ──────────────
  const webhookUrl = process.env.N8N_POLICYPLAN_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_POLICYPLAN_WEBHOOK_SECRET;

  if (!webhookUrl || !webhookSecret) {
    // Env vars not configured — mark row as error immediately.
    await supabase
      .from("policyplan_outputs")
      .update({ status: "error", meta: { reason: "webhook_not_configured" } })
      .eq("id", output_id);
    console.error("[policyplan/generate] N8N_POLICYPLAN_WEBHOOK_URL or N8N_POLICYPLAN_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "generation_trigger_failed" }, { status: 502 });
  }

  const webhookBody = {
    ...(intakeRow.payload as Record<string, unknown>),
    output_id,
    intake_id,
    advisor_id: user.id,
  };

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

    // Never log the secret — only log the sanitised reason.
    await supabase
      .from("policyplan_outputs")
      .update({ status: "error", meta: { reason: "trigger_failed" } })
      .eq("id", output_id);

    return NextResponse.json({ error: "generation_trigger_failed" }, { status: 502 });
  }

  // ── 6. Return accepted ───────────────────────────────────────────────────
  return NextResponse.json({ status: "generating", output_id }, { status: 200 });
}
