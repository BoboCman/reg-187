import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanionDashboard, type CompanionRow, type LegacyRow } from "@/components/companion/CompanionDashboard";

export const metadata = {
  title: "Companions — PolicyPlan",
  description: "Your Illustration Companions and earlier Reg 187 letters.",
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS limits every query to this advisor's own rows.
  const [{ data: companions, error }, { data: legacy }, { data: legacyOutputs }, { data: branding }] = await Promise.all([
    supabase
      .from("policyplan_intakes")
      .select("id, created_at, updated_at, companion_phase, companion_revision, case_meta, summary:extraction->summary")
      .eq("case_type", "illustration_companion")
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("policyplan_intakes")
      .select("id, created_at, status, payload")
      .eq("case_type", "reg187_letter")
      .neq("status", "superseded")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("policyplan_outputs").select("id, intake_id, status, created_at").eq("case_type", "reg187_letter").order("created_at", { ascending: false }),
    supabase.from("advisor_branding").select("advisor_name, firm_name, logo_base64").eq("advisor_id", user.id).maybeSingle(),
  ]);

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-6">
        <p className="text-sm text-[var(--color-error)]">Failed to load your cases: {error.message}</p>
      </div>
    );
  }

  const rows: CompanionRow[] = (companions ?? []).map((c) => {
    const s = (c.summary ?? {}) as Record<string, unknown>;
    const meta = (c.case_meta ?? {}) as Record<string, unknown>;
    return {
      id: c.id,
      updated_at: c.updated_at ?? c.created_at,
      phase: (c.companion_phase as string) ?? "created",
      revision: c.companion_revision ?? 1,
      label: str(meta.case_label),
      jurisdiction: str(meta.sales_jurisdiction),
      insurer: str(s.insurer),
      product: str(s.product_name),
      product_class: str(s.product_class),
      death_benefit: num(s.death_benefit),
      planned_outlay: num(s.planned_outlay),
    };
  });

  const latest = new Map<string, { id: string; status: string }>();
  for (const o of legacyOutputs ?? []) if (!latest.has(o.intake_id)) latest.set(o.intake_id, { id: o.id, status: o.status ?? "pending" });
  const letters: LegacyRow[] = (legacy ?? []).map((r) => {
    const insureds = ((r.payload as { insured_owner?: { insureds?: { name?: string }[] } })?.insured_owner?.insureds ?? []) as { name?: string }[];
    const out = latest.get(r.id);
    return {
      id: r.id,
      created_at: r.created_at,
      client: insureds.map((i) => (i.name ?? "").trim()).filter(Boolean).join(" & ") || "Unnamed client",
      status: out?.status === "final" || r.status === "adopted" ? "Approved" : out?.status === "draft" ? "Draft" : out?.status === "error" ? "Needs attention" : "Not finished",
      output_id: out?.status === "final" ? out.id : null,
    };
  });

  const advisorName = str(branding?.advisor_name);
  return (
    <CompanionDashboard
      companions={rows}
      letters={letters}
      firstName={advisorName ? advisorName.split(/\s+/)[0] : null}
      hasLetterhead={!!(branding && (branding.firm_name || branding.logo_base64))}
      legacyEnabled={process.env.NEXT_PUBLIC_LEGACY_REG187_ENABLED === "true"}
    />
  );
}
