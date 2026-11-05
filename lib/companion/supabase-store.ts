/**
 * Supabase implementation of CompanionStore and the n8n gateway. Server only:
 * it uses the service-role client because Companion rows are written by the
 * server alone (see the migration's trg_*_companion_server_only triggers).
 * Every read that takes an id from a request is ownership-checked in
 * service.ts before anything is returned.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReleasePolicy } from "./contracts";
import type { CompanionBranding } from "./render";
import type { CaseRow, CompanionStore, Env, OutputRow, WorkflowGateway } from "./service";

const CASE_COLS =
  "id, advisor_id, case_type, status, companion_phase, companion_revision, case_meta, brief, illustration, illustration_text, extraction, evidence, fact_corrections, facts_confirmed, created_at, updated_at";
const OUTPUT_COLS =
  "id, intake_id, advisor_id, case_type, status, revision, job_id, companion, approval, artifact_id, content_hash, created_at, completed_at, adopted_at, adopted_by, superseded_at, meta";

function fail(op: string, error: { message: string } | null): never {
  console.error(`[companion/store] ${op} failed`, error?.message);
  throw new Error(`store_${op}_failed`);
}

export class SupabaseCompanionStore implements CompanionStore {
  constructor(private db: SupabaseClient) {}

  async getCase(id: string) {
    const { data, error } = await this.db.from("policyplan_intakes").select(CASE_COLS).eq("id", id).maybeSingle();
    if (error) fail("getCase", error);
    return (data as CaseRow | null) ?? null;
  }

  async insertCase(row: Partial<CaseRow> & { advisor_id: string }) {
    // schema_version and payload are NOT NULL on the original table.
    const { data, error } = await this.db
      .from("policyplan_intakes")
      .insert({ schema_version: "companion.v1", payload: {}, ...row })
      .select(CASE_COLS)
      .single();
    if (error) fail("insertCase", error);
    return data as CaseRow;
  }

  async updateCase(id: string, patch: Partial<CaseRow>, expect?: { companion_revision?: number }) {
    let q = this.db.from("policyplan_intakes").update(patch).eq("id", id).eq("case_type", "illustration_companion");
    if (expect?.companion_revision != null) q = q.eq("companion_revision", expect.companion_revision);
    const { data, error } = await q.select(CASE_COLS).maybeSingle();
    if (error) fail("updateCase", error);
    return (data as CaseRow | null) ?? null;
  }

  async listOutputs(caseId: string) {
    const { data, error } = await this.db
      .from("policyplan_outputs")
      .select(OUTPUT_COLS)
      .eq("intake_id", caseId)
      .eq("case_type", "illustration_companion")
      .order("created_at", { ascending: true });
    if (error) fail("listOutputs", error);
    return (data as OutputRow[]) ?? [];
  }

  async getOutput(id: string) {
    const { data, error } = await this.db.from("policyplan_outputs").select(OUTPUT_COLS).eq("id", id).maybeSingle();
    if (error) fail("getOutput", error);
    return (data as OutputRow | null) ?? null;
  }

  async getOutputByJob(jobId: string) {
    const { data, error } = await this.db.from("policyplan_outputs").select(OUTPUT_COLS).eq("job_id", jobId).maybeSingle();
    if (error) fail("getOutputByJob", error);
    return (data as OutputRow | null) ?? null;
  }

  async insertOutput(row: Partial<OutputRow> & { intake_id: string; advisor_id: string }) {
    const { data, error } = await this.db.from("policyplan_outputs").insert(row).select(OUTPUT_COLS).single();
    if (error) fail("insertOutput", error);
    return data as OutputRow;
  }

  async updateOutput(id: string, patch: Partial<OutputRow>, expectStatus?: OutputRow["status"]) {
    let q = this.db.from("policyplan_outputs").update(patch).eq("id", id).eq("case_type", "illustration_companion");
    if (expectStatus) q = q.eq("status", expectStatus);
    const { data, error } = await q.select(OUTPUT_COLS).maybeSingle();
    if (error) fail("updateOutput", error);
    return (data as OutputRow | null) ?? null;
  }

  async audit(e: { case_id: string; output_id?: string | null; advisor_id: string; actor_id: string | null; event: string; detail?: Record<string, unknown> }) {
    const { error } = await this.db.from("policyplan_audit_events").insert({ ...e, output_id: e.output_id ?? null, detail: e.detail ?? {} });
    if (error) fail("audit", error);
  }

  async getReleasePolicy(advisorId: string) {
    const { data, error } = await this.db
      .from("policyplan_release_policies")
      .select("advisor_id, external_client_export_allowed, enhanced_numeric_mode_allowed, approved_jurisdictions, approved_product_classes, approval_reference, effective_at, expires_at")
      .eq("advisor_id", advisorId)
      .maybeSingle();
    if (error) fail("getReleasePolicy", error);
    return (data as ReleasePolicy | null) ?? null;
  }

  async getBranding(advisorId: string) {
    const { data, error } = await this.db
      .from("advisor_branding")
      .select("advisor_name, advisor_title, advisor_credentials, firm_name, firm_address, phone, email, license_number, logo_base64, brand_primary_color, disclosures")
      .eq("advisor_id", advisorId)
      .maybeSingle();
    if (error) fail("getBranding", error);
    return (data as CompanionBranding | null) ?? null;
  }
}

/** Posts jobs to the isolated Companion workflow (never the Reg 187 or PolicyReview workflows). */
export class N8nCompanionGateway implements WorkflowGateway {
  constructor(
    private url: string,
    private secret: string,
  ) {}
  async send(body: Record<string, unknown>) {
    try {
      const r = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "policyplan-auth": this.secret },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      return { ok: r.ok, status: r.status };
    } catch (err) {
      console.error("[companion/gateway] trigger failed", err instanceof Error ? err.message : err);
      return { ok: false, status: 0 };
    }
  }
}

class UnconfiguredGateway implements WorkflowGateway {
  async send() {
    console.error("[companion/gateway] N8N_COMPANION_WEBHOOK_URL or N8N_POLICYPLAN_WEBHOOK_SECRET not set");
    return { ok: false, status: 503 };
  }
}

export function companionDeps(origin: string): { store: SupabaseCompanionStore; gateway: WorkflowGateway; env: Env } | null {
  const db = createAdminClient();
  if (!db) return null;
  const url = process.env.N8N_COMPANION_WEBHOOK_URL;
  const secret = process.env.N8N_POLICYPLAN_WEBHOOK_SECRET;
  return {
    store: new SupabaseCompanionStore(db),
    gateway: url && secret ? new N8nCompanionGateway(url, secret) : new UnconfiguredGateway(),
    env: {
      callbackUrl: process.env.COMPANION_CALLBACK_URL || `${origin}/api/companion/callback`,
      callbackSecret: process.env.COMPANION_CALLBACK_SECRET || null,
    },
  };
}
