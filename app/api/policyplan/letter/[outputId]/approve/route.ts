import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { letterSchema, letterToMarkdown } from "@/lib/policyplan/letter";
import { ATTESTATION_STATEMENT, loadLetterForUser } from "@/lib/policyplan/letter-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  letter: letterSchema, // the advisor's edited letter
  notes: z.record(z.string().max(2000)).default({}), // tension code -> producer note
  attestation: z.object({ confirmed: z.literal(true), name: z.string().trim().min(2).max(120) }),
});

/**
 * Producer sign-off: saves the edited letter, a note on every flagged
 * tension, and the attestation, then freezes the output as `final`.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ outputId: string }> }) {
  const { outputId } = await params;
  const ctx = await loadLetterForUser(outputId);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (ctx.output.status !== "draft") {
    return NextResponse.json({ error: "not_draft", status: ctx.output.status }, { status: 409 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload", issues: parsed.error.issues.slice(0, 5) }, { status: 422 });
  }
  const { notes, attestation } = parsed.data;

  // Tensions come from the stored draft (computed by the workflow), never from the client.
  const tensions = ctx.letter.tensions;
  const missing = tensions.filter((t) => !(notes[t.code] ?? "").trim()).map((t) => t.code);
  if (missing.length) {
    return NextResponse.json({ error: "notes_required", missing }, { status: 422 });
  }

  const letter = { ...parsed.data.letter, tensions, policy_snapshot: ctx.letter.policy_snapshot };
  const now = new Date().toISOString();
  const content_hash = createHash("sha256").update(JSON.stringify(letter)).digest("hex");

  const { error } = await ctx.supabase
    .from("policyplan_outputs")
    .update({
      status: "final",
      letter,
      advisor_letter: letterToMarkdown(letter),
      flag_resolutions: tensions.map((t) => ({
        code: t.code,
        resolution_text: notes[t.code].trim(),
        resolved_by: ctx.user.id,
        resolved_at: now,
      })),
      adopted_by: ctx.user.id,
      adopted_at: now,
      adoption_confirmation: `${ATTESTATION_STATEMENT} — ${attestation.name}`,
      content_hash,
      meta: { ...((ctx.output.meta as object) ?? {}), approved_by_name: attestation.name },
    })
    .eq("id", outputId)
    .eq("status", "draft");
  if (error) {
    console.error("[letter/approve] update failed:", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  await ctx.supabase.from("policyplan_intakes").update({ status: "adopted" }).eq("id", ctx.output.intake_id);

  return NextResponse.json({ ok: true, status: "final", content_hash });
}
