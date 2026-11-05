import { randomUUID } from "node:crypto";
import type { CaseRow, CompanionStore, OutputRow, WorkflowGateway } from "../../lib/companion/service";
import type { ReleasePolicy } from "../../lib/companion/contracts";
import type { CompanionBranding } from "../../lib/companion/render";

/** In-memory CompanionStore that enforces the same rules as the database triggers. */
export class MemoryStore implements CompanionStore {
  cases = new Map<string, CaseRow>();
  outputs = new Map<string, OutputRow>();
  events: { case_id: string; event: string; actor_id: string | null; detail?: Record<string, unknown> }[] = [];
  policies = new Map<string, ReleasePolicy>();

  async getCase(id: string) {
    return structuredClone(this.cases.get(id) ?? null);
  }
  async insertCase(row: Partial<CaseRow> & { advisor_id: string }) {
    const now = new Date().toISOString();
    const r: CaseRow = {
      id: randomUUID(),
      case_type: "illustration_companion",
      status: "submitted",
      companion_phase: null,
      companion_revision: 1,
      case_meta: null,
      brief: null,
      illustration: null,
      illustration_text: null,
      extraction: null,
      evidence: null,
      fact_corrections: [],
      facts_confirmed: null,
      created_at: now,
      updated_at: now,
      ...row,
    };
    this.cases.set(r.id, r);
    return structuredClone(r);
  }
  async updateCase(id: string, patch: Partial<CaseRow>, expect?: { companion_revision?: number }) {
    const r = this.cases.get(id);
    if (!r) return null;
    if (expect?.companion_revision != null && r.companion_revision !== expect.companion_revision) return null;
    Object.assign(r, structuredClone(patch));
    return structuredClone(r);
  }
  async listOutputs(caseId: string) {
    return [...this.outputs.values()].filter((o) => o.intake_id === caseId).map((o) => structuredClone(o));
  }
  async getOutput(id: string) {
    return structuredClone(this.outputs.get(id) ?? null);
  }
  async getOutputByJob(jobId: string) {
    return structuredClone([...this.outputs.values()].find((o) => o.job_id === jobId) ?? null);
  }
  async insertOutput(row: Partial<OutputRow> & { intake_id: string; advisor_id: string }) {
    if (row.job_id && [...this.outputs.values()].some((o) => o.job_id === row.job_id)) throw new Error("duplicate job_id");
    const r: OutputRow = {
      id: randomUUID(),
      case_type: "illustration_companion",
      status: "pending",
      revision: null,
      job_id: null,
      companion: null,
      approval: null,
      artifact_id: null,
      content_hash: null,
      created_at: new Date(Date.now() + this.outputs.size).toISOString(),
      completed_at: null,
      adopted_at: null,
      adopted_by: null,
      superseded_at: null,
      meta: null,
      ...row,
    };
    this.outputs.set(r.id, r);
    return structuredClone(r);
  }
  async updateOutput(id: string, patch: Partial<OutputRow>, expectStatus?: OutputRow["status"]) {
    const r = this.outputs.get(id);
    if (!r) return null;
    if (expectStatus && r.status !== expectStatus) return null;
    // Mirrors trg_policyplan_outputs_snapshot_immutable.
    if (r.status === "final" || r.status === "superseded") {
      const onlySupersede = r.status === "final" && patch.status === "superseded" && Object.keys(patch).every((k) => k === "status" || k === "superseded_at");
      if (!onlySupersede) throw new Error("Approved Companion snapshots are immutable");
    }
    Object.assign(r, structuredClone(patch));
    return structuredClone(r);
  }
  async audit(e: { case_id: string; advisor_id: string; actor_id: string | null; event: string; detail?: Record<string, unknown> }) {
    this.events.push({ case_id: e.case_id, event: e.event, actor_id: e.actor_id, detail: e.detail });
  }
  async getReleasePolicy(advisorId: string) {
    return this.policies.get(advisorId) ?? null;
  }
  async getBranding(): Promise<CompanionBranding | null> {
    return { advisor_name: "Test Producer", firm_name: "Test Firm", brand_primary_color: "#1f3a5f" };
  }
}

export class FakeGateway implements WorkflowGateway {
  sent: Record<string, unknown>[] = [];
  ok = true;
  async send(body: Record<string, unknown>) {
    this.sent.push(structuredClone(body));
    return { ok: this.ok, status: this.ok ? 200 : 500 };
  }
  last() {
    return this.sent[this.sent.length - 1];
  }
}
