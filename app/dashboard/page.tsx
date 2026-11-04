import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient, type CaseRow, type LetterStage } from "@/components/policyplan/DashboardClient";

export const metadata = {
  title: "Letters — PolicyPlan",
  description: "Your Reg 187 recommendation letters.",
};

type OutputRow = {
  id: string;
  intake_id: string;
  status: string | null;
  created_at: string;
  completed_at: string | null;
  adopted_at: string | null;
  advisor_letter: string | null;
  snapshot: Record<string, unknown> | null;
  has_letter: string | null;
};

function stage(intakeStatus: string, out: OutputRow | undefined): LetterStage {
  if (out?.status === "final" || (!out && intakeStatus === "adopted")) return "approved";
  if (out?.status === "pending") return "writing";
  if (out?.status === "error") return "attention";
  if (out && (out.has_letter || out.advisor_letter)) return "review";
  return "not_started";
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: rows, error }, { data: outputs }, { data: branding }] = await Promise.all([
    supabase
      .from("policyplan_intakes")
      .select("id, created_at, primary_objective, payload, status, illustration")
      .neq("status", "superseded")
      .order("created_at", { ascending: false }),
    supabase
      .from("policyplan_outputs")
      .select("id, intake_id, status, created_at, completed_at, adopted_at, advisor_letter, snapshot:letter->policy_snapshot, has_letter:letter->>salutation")
      .order("created_at", { ascending: false }),
    supabase.from("advisor_branding").select("advisor_name, firm_name, logo_base64").eq("advisor_id", user.id).maybeSingle(),
  ]);

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <p className="text-sm text-[var(--color-error)]">Failed to load your letters: {error.message}</p>
      </div>
    );
  }

  // Latest output per intake (outputs are ordered newest first).
  const latest = new Map<string, OutputRow>();
  for (const o of (outputs ?? []) as OutputRow[]) if (!latest.has(o.intake_id)) latest.set(o.intake_id, o);

  const cases: CaseRow[] = (rows ?? []).map((row) => {
    const out = latest.get(row.id);
    const insureds = (row.payload?.insured_owner?.insureds ?? []) as Array<{ name?: string }>;
    const snap = (out?.snapshot ?? {}) as Record<string, unknown>;
    const ill = (row.illustration ?? null) as { filename?: string } | null;
    const updated = [row.created_at, out?.created_at, out?.completed_at, out?.adopted_at].filter(Boolean).sort().pop() as string;
    return {
      id: row.id,
      created_at: row.created_at,
      updated_at: updated,
      client: insureds.map((i) => (i.name ?? "").trim()).filter(Boolean).join(" & ") || "Unnamed client",
      primary_objective: row.primary_objective ?? row.payload?.objectives?.primary ?? "",
      stage: stage(row.status ?? "submitted", out),
      output_id: out?.id ?? null,
      carrier: str(snap.carrier),
      product: str(snap.product),
      face_amount: numOrNull(snap.face_amount),
      annual_premium: numOrNull(snap.annual_premium),
      illustration_file: str(ill?.filename),
    };
  });

  const advisorName = str(branding?.advisor_name);
  return (
    <DashboardClient
      cases={cases}
      firstName={advisorName ? advisorName.split(/\s+/)[0] : null}
      hasLetterhead={!!(branding && (branding.firm_name || branding.logo_base64))}
    />
  );
}
