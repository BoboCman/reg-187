import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { callbackSchema, letterToMarkdown } from "@/lib/policyplan/letter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function secretMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * n8n posts the finished 187 letter (or a failure) here.
 * Auth: header `policyplan-callback-auth` must equal POLICYPLAN_CALLBACK_SECRET.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.POLICYPLAN_CALLBACK_SECRET;
  if (!expected) {
    console.error("[policyplan/callback] POLICYPLAN_CALLBACK_SECRET not set");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!secretMatches(request.headers.get("policyplan-callback-auth"), expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    console.error("[policyplan/callback] SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = callbackSchema.safeParse(raw);
  if (!parsed.success) {
    // Record the failure on the row when we can identify it, so the case
    // doesn't sit in "pending" forever.
    const outputId =
      raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).output_id === "string"
        ? ((raw as Record<string, string>).output_id)
        : null;
    if (outputId) {
      await supabase
        .from("policyplan_outputs")
        .update({
          status: "error",
          meta: { reason: "invalid_callback", issues: parsed.error.issues.slice(0, 10) },
        })
        .eq("id", outputId)
        .eq("status", "pending");
    }
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.issues.slice(0, 10) },
      { status: 422 }
    );
  }

  const body = parsed.data;

  const { data: row } = await supabase
    .from("policyplan_outputs")
    .select("id, status")
    .eq("id", body.output_id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.status !== "pending") {
    return NextResponse.json({ error: "already_completed", status: row.status }, { status: 409 });
  }

  const update =
    body.status === "draft"
      ? {
          status: "draft",
          completed_at: new Date().toISOString(),
          letter: body.letter,
          advisor_letter: letterToMarkdown(body.letter),
          extraction: body.extraction ?? null,
          qa: body.qa ?? null,
          workflow_version: body.workflow_version ?? null,
        }
      : {
          status: "error",
          completed_at: new Date().toISOString(),
          workflow_version: body.workflow_version ?? null,
          meta: { reason: "workflow_error", detail: body.error },
        };

  const { error } = await supabase
    .from("policyplan_outputs")
    .update(update)
    .eq("id", body.output_id);

  if (error) {
    console.error("[policyplan/callback] update failed:", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, output_id: body.output_id, status: update.status });
}
