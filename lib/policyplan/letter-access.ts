import { createClient } from "@/lib/supabase/server";
import { letterSchema, type Letter } from "@/lib/policyplan/letter";
import type { LetterBranding } from "@/lib/policyplan/letter-html";

export const ATTESTATION_STATEMENT =
  "I reviewed this letter and the client information it is based on. It states my recommendation and my " +
  "reasonable basis for believing the recommended policy is in the client's best interest, including the " +
  "unfavorable considerations, as required by 11 NYCRR 224.";

/** Loads an output the signed-in advisor owns, with its letter, intake names and branding. */
export async function loadLetterForUser(outputId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401 };

  const { data: out } = await supabase
    .from("policyplan_outputs")
    .select("id, intake_id, advisor_id, status, letter, flag_resolutions, adopted_by, adopted_at, adoption_confirmation, content_hash, completed_at, meta")
    .eq("id", outputId)
    .eq("advisor_id", user.id)
    .maybeSingle();
  if (!out) return { error: "not_found" as const, status: 404 };

  const parsed = letterSchema.safeParse(out.letter);
  if (!parsed.success) return { error: "no_letter" as const, status: 409 };

  const { data: intake } = await supabase
    .from("policyplan_intakes")
    .select("id, payload")
    .eq("id", out.intake_id)
    .maybeSingle();

  const { data: branding } = await supabase
    .from("advisor_branding")
    .select("*")
    .eq("advisor_id", user.id)
    .maybeSingle();

  const names: string[] = ((intake?.payload as { insured_owner?: { insureds?: { name?: string }[] } } | null)
    ?.insured_owner?.insureds ?? [])
    .map((i) => (i.name ?? "").trim())
    .filter(Boolean);

  const meta = (out.meta ?? {}) as { approved_by_name?: string };

  return {
    supabase,
    user,
    output: out,
    letter: parsed.data as Letter,
    branding: (branding ?? null) as LetterBranding | null,
    preparedFor: names.join(" and ") || null,
    approvedByName: meta.approved_by_name ?? null,
  };
}

export function safeFileName(s: string) {
  return (
    s.normalize("NFKD").replace(/[^a-zA-Z0-9 -]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "Client"
  );
}
