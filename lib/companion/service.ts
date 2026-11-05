/**
 * Illustration Companion server service. All Companion writes go through
 * here (route handlers stay thin). Storage and the n8n transport are
 * injected so the whole flow is testable without Supabase or n8n.
 *
 * Authority: this module, not the browser and not n8n, decides facts,
 * observations, plan, validation, approval and release.
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  EMPTY_BRIEF,
  VERSIONS,
  briefMissing,
  caseMetaSchema,
  clientBriefSchema,
  companionDraftSchema,
  evidencePacketSchema,
  releasePolicySchema,
  type CasePhase,
  type ClientBrief,
  type CompanionDraft,
  type EvidencePacket,
  type ReleasePolicy,
} from "./contracts";
import { applyCorrections, buildEvidencePacket, validatePointers, type FactCorrection } from "./evidence";
import { assembleDraft, blockIssues, guardDraft, parseAnalyst, parseWriter } from "./guard";
import { splitPages, joinPages } from "./pages";
import { allFacts, analystPacket, buildPlan, writerPacket } from "./planner";
import { detectResidual, injectionSignals, screenText } from "./privacy";
import { approvalScope, releaseGate, sha256 } from "./release";
import { declarationRefs, runRules, verificationItems } from "./rules";
import { canTransition } from "./state";
import { buildCompanionHtml, type CompanionBranding } from "./render";
import { parseModelJson } from "./guard";
import {
  STORY_VERSIONS,
  applyEdits,
  buildStoryPlayback,
  finishDraft,
  isStoryDraft,
  riderNames,
  storyBlockers,
  storyDraftSchema,
  storyEditsSchema,
  storyInputsSchema,
  storyPlaybackSchema,
  storyWriterInput,
  storyWriterSchema,
  writerToText,
  type StoryDraft,
  type StoryInputs,
} from "./story";
import { buildStoryHtml } from "./story-render";

/* ── storage contracts ────────────────────────────────────────────────── */

export type CaseRow = {
  id: string;
  advisor_id: string;
  case_type: string;
  status: string;
  companion_phase: CasePhase | null;
  companion_revision: number;
  case_meta: unknown;
  brief: unknown;
  illustration: unknown;
  illustration_text: string | null;
  extraction: unknown;
  evidence: unknown;
  fact_corrections: unknown;
  facts_confirmed: unknown;
  created_at: string;
  updated_at: string;
};

export type OutputRow = {
  id: string;
  intake_id: string;
  advisor_id: string;
  case_type: string;
  status: "pending" | "draft" | "final" | "superseded" | "error";
  revision: number | null;
  job_id: string | null;
  companion: unknown;
  approval: unknown;
  artifact_id: string | null;
  content_hash: string | null;
  created_at: string;
  completed_at: string | null;
  adopted_at: string | null;
  adopted_by: string | null;
  superseded_at: string | null;
  meta: unknown;
};

export interface CompanionStore {
  getCase(id: string): Promise<CaseRow | null>;
  insertCase(row: Partial<CaseRow> & { advisor_id: string }): Promise<CaseRow>;
  /** Optimistic update: returns null when `expect` no longer matches. */
  updateCase(id: string, patch: Partial<CaseRow>, expect?: { companion_revision?: number }): Promise<CaseRow | null>;
  listOutputs(caseId: string): Promise<OutputRow[]>;
  getOutput(id: string): Promise<OutputRow | null>;
  getOutputByJob(jobId: string): Promise<OutputRow | null>;
  insertOutput(row: Partial<OutputRow> & { intake_id: string; advisor_id: string }): Promise<OutputRow>;
  updateOutput(id: string, patch: Partial<OutputRow>, expectStatus?: OutputRow["status"]): Promise<OutputRow | null>;
  audit(e: { case_id: string; output_id?: string | null; advisor_id: string; actor_id: string | null; event: string; detail?: Record<string, unknown> }): Promise<void>;
  getReleasePolicy(advisorId: string): Promise<ReleasePolicy | null>;
  getBranding(advisorId: string): Promise<CompanionBranding | null>;
}

export interface WorkflowGateway {
  /** Fire-and-forget POST to the n8n Companion webhook. */
  send(body: Record<string, unknown>): Promise<{ ok: boolean; status: number }>;
}

export type Env = {
  callbackUrl: string;
  callbackSecret: string | null;
  now?: () => Date;
};

export class ServiceError extends Error {
  constructor(
    public code: string,
    public status: number,
    public detail?: unknown,
  ) {
    super(code);
  }
}

const LIMITS = { maxPages: 120, maxChars: 900_000, minCharsPerPage: 60, maxFileBytes: 10 * 1024 * 1024 };
const CALLBACK_MAX_SKEW_MS = 15 * 60 * 1000;

/* ── helpers ──────────────────────────────────────────────────────────── */

async function ownCase(store: CompanionStore, userId: string, caseId: string): Promise<CaseRow> {
  if (!z.string().uuid().safeParse(caseId).success) throw new ServiceError("not_found", 404);
  const c = await store.getCase(caseId);
  if (!c || c.advisor_id !== userId || c.case_type !== "illustration_companion") throw new ServiceError("not_found", 404);
  return c;
}

async function ownOutput(store: CompanionStore, userId: string, outputId: string) {
  if (!z.string().uuid().safeParse(outputId).success) throw new ServiceError("not_found", 404);
  const o = await store.getOutput(outputId);
  if (!o || o.advisor_id !== userId || o.case_type !== "illustration_companion") throw new ServiceError("not_found", 404);
  const c = await ownCase(store, userId, o.intake_id);
  return { o, c };
}

function phaseOf(c: CaseRow): CasePhase {
  return (c.companion_phase ?? "created") as CasePhase;
}

async function setPhase(store: CompanionStore, c: CaseRow, to: CasePhase, patch: Partial<CaseRow> = {}, actor: string | null = null) {
  const from = phaseOf(c);
  if (!canTransition(from, to)) throw new ServiceError("illegal_transition", 409, { from, to });
  const updated = await store.updateCase(c.id, { ...patch, companion_phase: to, updated_at: new Date().toISOString() });
  if (!updated) throw new ServiceError("conflict", 409);
  if (from !== to) await store.audit({ case_id: c.id, advisor_id: c.advisor_id, actor_id: actor, event: "phase_changed", detail: { from, to } });
  return updated;
}

function readBrief(c: CaseRow): ClientBrief {
  const p = clientBriefSchema.safeParse(c.brief);
  return p.success ? p.data : EMPTY_BRIEF;
}
function readPacket(c: CaseRow): EvidencePacket | null {
  const p = evidencePacketSchema.safeParse(c.evidence);
  return p.success ? p.data : null;
}
function readCorrections(c: CaseRow): FactCorrection[] {
  return Array.isArray(c.fact_corrections) ? (c.fact_corrections as FactCorrection[]) : [];
}
const factsConfirmedFor = (c: CaseRow) => {
  const f = c.facts_confirmed as { revision?: number } | null;
  return !!f && f.revision === c.companion_revision;
};

/** Retires drafts and approvals of the current revision when the case changes. */
async function supersedeOutputs(store: CompanionStore, c: CaseRow, reason: string, actor: string | null) {
  const now = new Date().toISOString();
  for (const o of await store.listOutputs(c.id)) {
    if (o.status === "final") {
      await store.updateOutput(o.id, { status: "superseded", superseded_at: now }, "final");
      await store.audit({ case_id: c.id, output_id: o.id, advisor_id: c.advisor_id, actor_id: actor, event: "approval_superseded", detail: { reason } });
    } else if (o.status === "draft" || o.status === "pending" || o.status === "error") {
      await store.updateOutput(o.id, { status: "superseded", superseded_at: now }, o.status);
    }
  }
}

async function bumpRevision(store: CompanionStore, c: CaseRow, reason: string, actor: string, patch: Partial<CaseRow> = {}) {
  await supersedeOutputs(store, c, reason, actor);
  const updated = await store.updateCase(c.id, { ...patch, companion_revision: c.companion_revision + 1, facts_confirmed: null, updated_at: new Date().toISOString() }, { companion_revision: c.companion_revision });
  if (!updated) throw new ServiceError("conflict", 409);
  await store.audit({ case_id: c.id, advisor_id: c.advisor_id, actor_id: actor, event: "revision_created", detail: { revision: updated.companion_revision, reason } });
  return updated;
}

/* ── 1 · create ───────────────────────────────────────────────────────── */

export async function createCase(store: CompanionStore, userId: string, input: unknown) {
  const meta = caseMetaSchema.parse(input);
  const now = new Date().toISOString();
  const row = await store.insertCase({
    advisor_id: userId,
    case_type: "illustration_companion",
    status: "submitted",
    companion_phase: "created",
    companion_revision: 1,
    case_meta: meta,
    brief: EMPTY_BRIEF,
    fact_corrections: [],
    created_at: now,
    updated_at: now,
  });
  await store.audit({ case_id: row.id, advisor_id: userId, actor_id: userId, event: "case_created", detail: { jurisdiction: meta.sales_jurisdiction } });
  return row;
}

/* ── 2 · illustration ─────────────────────────────────────────────────── */

export const illustrationSubmitSchema = z
  .object({
    text: z.string().min(1).max(LIMITS.maxChars),
    page_count: z.number().int().positive().max(LIMITS.maxPages),
    document_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    file_size: z.number().int().positive().max(LIMITS.maxFileBytes),
    kind_confirmed: z.enum(["proposed_sales", "in_force", "not_sure"]),
    privacy: z
      .object({
        removed: z.record(z.number().int().nonnegative()).default({}),
        worker_warnings: z.array(z.string().max(80)).max(20).default([]),
        names_screened: z.number().int().nonnegative().max(10),
      })
      .strict(),
    extractor: z.string().max(40).default("pdfjs-worker"),
    // Story cases: the form answers, sent with the PDF so one submit runs the whole job.
    story_inputs: z.unknown().optional(),
  })
  .strict();

export async function submitIllustration(store: CompanionStore, gw: WorkflowGateway, env: Env, userId: string, caseId: string, input: unknown) {
  let c = await ownCase(store, userId, caseId);
  const body = illustrationSubmitSchema.parse(input);
  if (!["created", "document_received", "extraction_pending", "extracted_needs_review", "intake_ready", "draft_ready", "producer_review", "approved", "exported", "failed_retryable", "blocked_privacy", "blocked_unsupported", "blocked_evidence"].includes(phaseOf(c)))
    throw new ServiceError("not_allowed", 409);

  // A replacement illustration is a new revision; prior approvals are superseded.
  if (c.illustration_text) c = await bumpRevision(store, c, "illustration_replaced", userId, { evidence: null, extraction: null, fact_corrections: [] });

  let storyRequest: StoryInputs | null = null;
  if (body.story_inputs !== undefined) {
    storyRequest = storyInputsSchema.parse(body.story_inputs);
    if (((c.case_meta ?? {}) as { story_key?: string }).story_key !== storyRequest.story_key) throw new ServiceError("wrong_story", 409);
  }

  const pages = splitPages(body.text);
  const meta = {
    page_count: body.page_count,
    pages_with_text: pages.filter((p) => p.text.length >= LIMITS.minCharsPerPage).length,
    file_size: body.file_size,
    document_fingerprint: body.document_fingerprint,
    kind_confirmed: body.kind_confirmed,
    privacy: body.privacy,
    extractor: body.extractor,
    received_at: new Date().toISOString(),
    filename_stored: false,
    ...(storyRequest ? { story_request: storyRequest } : {}),
  };
  c = await setPhase(store, c, "document_received", { illustration: meta, illustration_text: null }, userId);

  // Gate 1: unsupported documents.
  if (body.kind_confirmed === "in_force") {
    await setPhase(store, c, "blocked_unsupported", { illustration: { ...meta, blocked: "in_force" } }, userId);
    throw new ServiceError("unsupported_in_force", 422, { message: "In-force illustrations are not supported by the Illustration Companion." });
  }
  if (pages.length === 0 || pages.length !== body.page_count) {
    await setPhase(store, c, "blocked_unsupported", { illustration: { ...meta, blocked: "page_markers" } }, userId);
    throw new ServiceError("unreadable_document", 422, { message: "The page text could not be matched to the PDF's pages." });
  }
  if (meta.pages_with_text < Math.ceil(pages.length * 0.5)) {
    await setPhase(store, c, "blocked_unsupported", { illustration: { ...meta, blocked: "image_only" } }, userId);
    throw new ServiceError("image_only_pdf", 422, { message: "Most pages have no readable text (scanned or image-only PDF). Upload the carrier's original PDF." });
  }
  // Gate 2: privacy. The browser already screened names; the server screens patterns again.
  if (body.privacy.worker_warnings.some((w) => /name_leak/.test(w))) {
    await setPhase(store, c, "blocked_privacy", { illustration: { ...meta, blocked: "name_leak" } }, userId);
    throw new ServiceError("privacy_name_leak", 422, { message: "A client name was still present after redaction. Nothing was sent." });
  }
  const second = screenText(body.text);
  const residual = detectResidual(second.text);
  if (residual.length) {
    await setPhase(store, c, "blocked_privacy", { illustration: { ...meta, blocked: "residual_identifiers" } }, userId);
    throw new ServiceError("privacy_residual", 422, { residual });
  }
  const text = joinPages(splitPages(second.text));
  const injection = injectionSignals(text);

  c = await setPhase(store, c, "document_received", {
    illustration: { ...meta, server_removed: second.removed, injection_signals: injection },
    illustration_text: text,
  }, userId);
  await store.audit({ case_id: c.id, advisor_id: userId, actor_id: userId, event: "illustration_received", detail: { pages: body.page_count, fingerprint: body.document_fingerprint.slice(0, 16), server_removed: second.removed, injection } });
  return dispatchExtraction(store, gw, env, c, userId);
}

export async function dispatchExtraction(store: CompanionStore, gw: WorkflowGateway, env: Env, c: CaseRow, actor: string) {
  if (!c.illustration_text) throw new ServiceError("no_illustration", 409);
  const prev = (c.extraction ?? {}) as { attempts?: number; status?: string };
  if (prev.status === "pending") return c;
  const attempts = (prev.attempts ?? 0) + 1;
  if (attempts > 4) throw new ServiceError("too_many_attempts", 429);
  const job_id = randomUUID();
  c = await setPhase(store, c, "extraction_pending", {
    extraction: { job_id, status: "pending", attempts, requested_at: new Date().toISOString(), revision: c.companion_revision },
  }, actor);
  const r = await gw.send({
    stage: "extract",
    job_id,
    case_id: c.id,
    revision: c.companion_revision,
    callback_url: env.callbackUrl,
    issued_at: new Date().toISOString(),
    illustration_text: c.illustration_text,
    page_count: (c.illustration as { page_count?: number })?.page_count ?? null,
  }).catch(() => ({ ok: false, status: 0 }));
  if (!r.ok) {
    c = await setPhase(store, c, "failed_retryable", { extraction: { job_id, status: "error", attempts, error: `trigger_failed:${r.status}` } }, actor);
    throw new ServiceError("workflow_unavailable", 502);
  }
  await store.audit({ case_id: c.id, advisor_id: c.advisor_id, actor_id: actor, event: "extraction_requested", detail: { job_id, attempts } });
  return c;
}

export async function retryExtraction(store: CompanionStore, gw: WorkflowGateway, env: Env, userId: string, caseId: string) {
  const c = await ownCase(store, userId, caseId);
  if (!["failed_retryable", "extraction_pending", "blocked_evidence"].includes(phaseOf(c))) throw new ServiceError("not_allowed", 409);
  const ex = (c.extraction ?? {}) as Record<string, unknown>;
  const pendingAge = ex.requested_at ? Date.now() - new Date(String(ex.requested_at)).getTime() : Infinity;
  if (ex.status === "pending" && pendingAge < 12 * 60 * 1000) throw new ServiceError("still_running", 409);
  return dispatchExtraction(store, gw, env, { ...c, extraction: { ...ex, status: "stale" } }, userId);
}

/* ── 3 · signed callback from n8n ─────────────────────────────────────── */

export function signBody(secret: string, timestamp: string, raw: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
}

export function verifySignature(secret: string, timestamp: string | null, signature: string | null, raw: string, now = Date.now()) {
  if (!timestamp || !signature || !/^\d{10,13}$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const ms = timestamp.length === 13 ? Number(timestamp) : Number(timestamp) * 1000;
  if (Math.abs(now - ms) > CALLBACK_MAX_SKEW_MS) return false;
  const a = Buffer.from(signBody(secret, timestamp, raw));
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

const callbackSchema = z
  .object({
    stage: z.enum(["extract", "write", "story"]),
    job_id: z.string().uuid(),
    case_id: z.string().uuid(),
    revision: z.number().int().positive(),
    status: z.enum(["ok", "error"]),
    workflow_version: z.string().max(80).nullable().optional(),
    error: z.string().max(400).nullable().optional(),
    extraction: z.object({ atlas1: z.unknown(), atlas2: z.unknown().optional(), atlas2_registry: z.unknown().optional() }).optional(),
    writer: z.object({ raw: z.unknown(), analyst_raw: z.unknown().optional(), model: z.string().max(80).nullable().optional(), attempts: z.number().int().optional() }).optional(),
    story: z.object({ raw: z.unknown(), model: z.string().max(80).nullable().optional(), attempts: z.number().int().optional() }).optional(),
  })
  .strict();

export async function handleCallback(store: CompanionStore, env: Env, raw: string, headers: { timestamp: string | null; signature: string | null }) {
  if (!env.callbackSecret) throw new ServiceError("not_configured", 503);
  if (!verifySignature(env.callbackSecret, headers.timestamp, headers.signature, raw)) throw new ServiceError("unauthorized", 401);
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ServiceError("invalid_json", 400);
  }
  const body = callbackSchema.parse(json);
  const c = await store.getCase(body.case_id);
  if (!c || c.case_type !== "illustration_companion") throw new ServiceError("not_found", 404);
  if (body.stage === "extract") {
    const r = await onExtraction(store, c, body);
    return r.phase === "extracted_needs_review" ? storyAfterExtraction(store, c.id, r) : r;
  }
  if (body.stage === "story") return onStory(store, c, body);
  return onWriter(store, c, body);
}

async function onExtraction(store: CompanionStore, c: CaseRow, body: z.infer<typeof callbackSchema>) {
  const ex = (c.extraction ?? {}) as Record<string, unknown>;
  if (ex.job_id !== body.job_id || ex.status !== "pending" || body.revision !== c.companion_revision) throw new ServiceError("stale_or_duplicate", 409);
  if (body.status === "error" || !body.extraction) {
    await setPhase(store, c, "failed_retryable", { extraction: { ...ex, status: "error", completed_at: new Date().toISOString(), error: (body.error ?? "workflow_error").slice(0, 200) } });
    await store.audit({ case_id: c.id, advisor_id: c.advisor_id, actor_id: null, event: "extraction_failed", detail: { error: body.error ?? null } });
    return { ok: true, phase: "failed_retryable" };
  }
  const pages = splitPages(c.illustration_text ?? "");
  const meta = (c.illustration ?? {}) as { document_fingerprint?: string; page_count?: number };
  let packet = buildEvidencePacket(
    { atlas1: body.extraction.atlas1, atlas2: body.extraction.atlas2, atlas2Registry: body.extraction.atlas2_registry },
    pages,
    { fingerprint: meta.document_fingerprint ?? "unknown", page_count: meta.page_count ?? pages.length },
  );
  packet = applyCorrections(packet, readCorrections(c), pages);
  const problems = validatePointers(packet, pages);
  if (problems.length) packet = { ...packet, blockers: [...packet.blockers, "pointer_validation_failed"], extraction_warnings: [...packet.extraction_warnings, ...problems.slice(0, 5)] };
  const parsed = evidencePacketSchema.parse(packet);
  const fv = (id: string) => {
    const f = parsed.facts.find((x) => x.fact_id === id);
    return f && f.status === "verified" ? f.value : null;
  };
  // A small, non-identifying summary for the dashboard list.
  const summary = { insurer: fv("f.insurer"), product_name: fv("f.product_name"), product_class: parsed.product_class, death_benefit: fv("f.initial_death_benefit"), planned_outlay: fv("f.planned_premium_outlay") };
  const extraction = { ...ex, summary, status: "complete", completed_at: new Date().toISOString(), workflow_version: body.workflow_version ?? null, atlas1: body.extraction.atlas1, atlas2: body.extraction.atlas2 ?? null, atlas2_registry: body.extraction.atlas2_registry ?? null };
  const next: CasePhase = parsed.blockers.some((b) => b.startsWith("unsupported_")) ? "blocked_unsupported" : parsed.blockers.includes("extraction_missing") || parsed.blockers.includes("extraction_truncated") ? "failed_retryable" : "extracted_needs_review";
  await setPhase(store, c, next, { extraction, evidence: parsed });
  await store.audit({ case_id: c.id, advisor_id: c.advisor_id, actor_id: null, event: "extraction_completed", detail: { facts: parsed.facts.length, verified: parsed.facts.filter((f) => f.status === "verified").length, blockers: parsed.blockers, product_class: parsed.product_class } });
  return { ok: true, phase: next };
}

/* ── 4 · facts: confirm and correct ───────────────────────────────────── */

export async function confirmFacts(store: CompanionStore, userId: string, caseId: string, input: unknown) {
  const { revision } = z.object({ revision: z.number().int().positive() }).strict().parse(input);
  const c = await ownCase(store, userId, caseId);
  if (revision !== c.companion_revision) throw new ServiceError("stale_revision", 409);
  const packet = readPacket(c);
  if (!packet) throw new ServiceError("no_evidence", 409);
  if (packet.blockers.some((b) => b.startsWith("unsupported_"))) throw new ServiceError("unsupported", 409, { blockers: packet.blockers });
  const core = packet.facts.filter((f) => ["f.insurer", "f.product_name", "f.planned_premium_outlay", "f.initial_death_benefit"].includes(f.fact_id) && (f.status === "not_found" || f.status === "contradictory"));
  if (core.length) throw new ServiceError("core_facts_unresolved", 409, { facts: core.map((f) => f.fact_id) });
  const updated = await store.updateCase(c.id, { facts_confirmed: { by: userId, at: new Date().toISOString(), revision } }, { companion_revision: revision });
  if (!updated) throw new ServiceError("conflict", 409);
  await store.audit({ case_id: c.id, advisor_id: userId, actor_id: userId, event: "facts_confirmed", detail: { revision } });
  const complete = briefMissing(readBrief(updated)).length === 0;
  return phaseOf(updated) === "extracted_needs_review" && complete ? setPhase(store, updated, "intake_ready", {}, userId) : updated;
}

const correctionSchema = z
  .object({
    fact_id: z.string().regex(/^f\.[a-z0-9_.]+$/),
    value: z.union([z.string().trim().min(1).max(200), z.number().finite(), z.boolean(), z.null()]),
    reason: z.string().trim().min(5).max(500),
    source_page: z.number().int().positive().nullable(),
  })
  .strict();

export async function correctFact(store: CompanionStore, userId: string, caseId: string, input: unknown) {
  const body = correctionSchema.parse(input);
  let c = await ownCase(store, userId, caseId);
  const packet = readPacket(c);
  if (!packet) throw new ServiceError("no_evidence", 409);
  const fact = packet.facts.find((f) => f.fact_id === body.fact_id);
  if (!fact || fact.fact_id.startsWith("f.brief.")) throw new ServiceError("unknown_fact", 422);
  if (typeof body.value === "string" && /[<>{}]/.test(body.value)) throw new ServiceError("invalid_value", 422);
  const correction: FactCorrection = { ...body, by: userId, at: new Date().toISOString() };
  const corrections = [...readCorrections(c).filter((x) => x.fact_id !== body.fact_id), correction];
  const pages = splitPages(c.illustration_text ?? "");
  const rebuilt = evidencePacketSchema.parse(applyCorrections(packet, [correction], pages));
  c = await bumpRevision(store, c, `fact_corrected:${body.fact_id}`, userId, { fact_corrections: corrections, evidence: rebuilt });
  await store.audit({ case_id: c.id, advisor_id: userId, actor_id: userId, event: "fact_corrected", detail: { fact_id: body.fact_id, from: fact.value, to: body.value, reason: body.reason, source_page: body.source_page, verified: rebuilt.facts.find((f) => f.fact_id === body.fact_id)?.status } });
  return setPhase(store, c, "extracted_needs_review", {}, userId);
}

/* ── 5 · brief ────────────────────────────────────────────────────────── */

export async function saveBrief(store: CompanionStore, userId: string, caseId: string, input: unknown) {
  const brief = clientBriefSchema.parse(input);
  let c = await ownCase(store, userId, caseId);
  const prev = JSON.stringify(readBrief(c));
  if (prev === JSON.stringify(brief)) return c;
  const hasDraft = (await store.listOutputs(c.id)).some((o) => o.revision === c.companion_revision && ["pending", "draft", "final"].includes(o.status));
  if (hasDraft) {
    // The facts did not change, so their confirmation carries to the new revision.
    const carried = factsConfirmedFor(c) ? { ...(c.facts_confirmed as object), carried_from_revision: c.companion_revision } : null;
    c = await bumpRevision(store, c, "brief_changed", userId, { brief });
    if (carried) c = (await store.updateCase(c.id, { facts_confirmed: { ...carried, revision: c.companion_revision } }))!;
  } else c = (await store.updateCase(c.id, { brief, updated_at: new Date().toISOString() }))!;
  await store.audit({ case_id: c.id, advisor_id: userId, actor_id: userId, event: "brief_saved", detail: { complete: briefMissing(brief).length === 0, new_revision: hasDraft } });
  const ready = briefMissing(brief).length === 0 && factsConfirmedFor(c);
  const phase = phaseOf(c);
  if (ready && ["extracted_needs_review", "draft_ready", "producer_review", "approved", "exported", "failed_retryable"].includes(phase)) return setPhase(store, c, "intake_ready", {}, userId);
  return c;
}

/* ── 6 · analysis ─────────────────────────────────────────────────────── */

export async function requestAnalysis(store: CompanionStore, gw: WorkflowGateway, env: Env, userId: string, caseId: string, input: unknown) {
  const opts = z.object({ numbers_enhanced: z.boolean().default(false), idempotency_key: z.string().max(80).optional() }).strict().parse(input ?? {});
  let c = await ownCase(store, userId, caseId);
  const packet = readPacket(c);
  const brief = readBrief(c);
  if (!packet) throw new ServiceError("no_evidence", 409);
  if (!factsConfirmedFor(c)) throw new ServiceError("facts_not_confirmed", 409);
  const missing = briefMissing(brief);
  if (missing.length) throw new ServiceError("brief_incomplete", 409, { missing });
  if (packet.blockers.some((b) => b.startsWith("unsupported_"))) throw new ServiceError("unsupported", 409);

  const outputs = await store.listOutputs(c.id);
  const inflight = outputs.find((o) => o.revision === c.companion_revision && o.status === "pending");
  if (inflight) return { output_id: inflight.id, status: "pending" as const };

  const policy = await store.getReleasePolicy(userId);
  const numbersEnhanced = opts.numbers_enhanced && !!policy?.enhanced_numeric_mode_allowed;
  // Drafts of this revision that were never approved are replaced by the new run.
  for (const o of outputs) if (o.revision === c.companion_revision && (o.status === "draft" || o.status === "error")) await store.updateOutput(o.id, { status: "superseded", superseded_at: new Date().toISOString() }, o.status);

  const observations = runRules(packet, brief);
  const plan = buildPlan(packet, brief, observations, { numbersEnhanced });
  const job_id = randomUUID();
  const out = await store.insertOutput({
    intake_id: c.id,
    advisor_id: userId,
    case_type: "illustration_companion",
    status: "pending",
    revision: c.companion_revision,
    job_id,
    companion: { stage: "planned", plan, observations },
    meta: { requested_at: new Date().toISOString(), numbers_enhanced: numbersEnhanced },
  });
  c = await setPhase(store, c, "analysis_pending", {}, userId);
  const r = await gw.send({
    stage: "write",
    job_id,
    case_id: c.id,
    revision: c.companion_revision,
    callback_url: env.callbackUrl,
    issued_at: new Date().toISOString(),
    prompt_versions: { analyst: VERSIONS.analyst_prompt, writer: VERSIONS.writer_prompt },
    analyst_input: analystPacket(packet, brief, observations),
    writer_input: writerPacket(plan, packet, brief, observations),
  }).catch(() => ({ ok: false, status: 0 }));
  if (!r.ok) {
    await store.updateOutput(out.id, { status: "error", meta: { reason: `trigger_failed:${r.status}` } }, "pending");
    await setPhase(store, c, "failed_retryable", {}, userId);
    throw new ServiceError("workflow_unavailable", 502);
  }
  await store.audit({ case_id: c.id, output_id: out.id, advisor_id: userId, actor_id: userId, event: "analysis_requested", detail: { job_id, revision: c.companion_revision, observations: observations.length, mode: plan.mode } });
  return { output_id: out.id, status: "pending" as const };
}

async function onWriter(store: CompanionStore, c: CaseRow, body: z.infer<typeof callbackSchema>) {
  const o = await store.getOutputByJob(body.job_id);
  if (!o || o.intake_id !== c.id || o.status !== "pending" || o.revision !== body.revision || body.revision !== c.companion_revision) throw new ServiceError("stale_or_duplicate", 409);
  const stored = o.companion as { plan?: unknown; observations?: unknown } | null;
  const packet = readPacket(c);
  const brief = readBrief(c);
  const fail = async (reason: string) => {
    await store.updateOutput(o.id, { status: "error", completed_at: new Date().toISOString(), meta: { ...(o.meta as object), reason } }, "pending");
    await setPhase(store, c, "failed_retryable");
    await store.audit({ case_id: c.id, output_id: o.id, advisor_id: c.advisor_id, actor_id: null, event: "draft_failed", detail: { reason } });
    return { ok: true, phase: "failed_retryable" as const, reason };
  };
  if (!packet || !stored?.plan) return fail("missing_plan");
  if (body.status === "error" || !body.writer) return fail((body.error ?? "workflow_error").slice(0, 200));
  const plan = companionDraftSchema.shape.plan.parse(stored.plan);
  const observations = companionDraftSchema.shape.internal_observations.parse(stored.observations);
  const w = parseWriter(body.writer.raw);
  if (!w.ok) return fail(`writer_${w.error}`);
  const analyst = parseAnalyst(body.writer.analyst_raw, observations, allFacts(packet, brief));
  const guard = guardDraft({
    plan,
    packet,
    brief,
    observations,
    blocks: w.value.blocks.map((b) => ({ block_id: b.block_id, body: b.body, client_ready: b.client_ready, author: "ai" as const })),
    writerInternal: [...w.value.internal_review, ...(analyst?.internal_notes.map((n) => n.text) ?? []), ...(analyst?.verification_questions ?? [])],
  });
  if (analyst?.blockers.length) guard.internal_review.push(...analyst.blockers.map((b) => `Analyst blocker: ${b}`));
  const draft = companionDraftSchema.parse(
    assembleDraft({ case_id: c.id, revision: c.companion_revision, packet, brief, plan, observations, guard, writer: { model: body.writer.model ?? null, workflow_version: body.workflow_version ?? null } }),
  );
  await store.updateOutput(o.id, { status: "draft", companion: draft, completed_at: new Date().toISOString() }, "pending");
  await setPhase(store, c, "draft_ready");
  await store.audit({ case_id: c.id, output_id: o.id, advisor_id: c.advisor_id, actor_id: null, event: "draft_created", detail: { validation: draft.validation, blockers: draft.release_blockers, words: draft.validation.word_count, model: body.writer.model ?? null } });
  return { ok: true, phase: "draft_ready" as const };
}

/* ── 7 · producer edits ───────────────────────────────────────────────── */

const editsSchema = z
  .object({
    blocks: z.array(z.object({ block_id: z.string().regex(/^b\.[a-z0-9_]+$/), body: z.string().trim().min(1).max(700) }).strict()).min(1).max(10),
  })
  .strict();

/** Edits route entry point: dispatches to the Companion or the Story editor. */
export async function saveOutputEdits(store: CompanionStore, userId: string, outputId: string, input: unknown) {
  const { o } = await ownOutput(store, userId, outputId);
  return isStoryDraft(o.companion) ? saveStoryEdits(store, userId, outputId, input) : saveEdits(store, userId, outputId, input);
}

export async function saveEdits(store: CompanionStore, userId: string, outputId: string, input: unknown) {
  const { blocks } = editsSchema.parse(input);
  const { o, c } = await ownOutput(store, userId, outputId);
  if (o.status !== "draft" || o.revision !== c.companion_revision) throw new ServiceError("not_editable", 409);
  const draft = companionDraftSchema.parse(o.companion);
  const packet = readPacket(c)!;
  const brief = readBrief(c);
  const changes: { block_id: string; before: string; after: string }[] = [];
  const merged = draft.blocks.map((b) => {
    const e = blocks.find((x) => x.block_id === b.block_id);
    if (!e || e.body === b.body) return { block_id: b.block_id, body: b.body, client_ready: true, author: b.author };
    changes.push({ block_id: b.block_id, before: b.body, after: e.body });
    return { block_id: b.block_id, body: e.body, client_ready: true, author: "producer" as const };
  });
  if (!changes.length) return draft;
  const guard = guardDraft({ plan: draft.plan, packet, brief, observations: draft.internal_observations, blocks: merged, writerInternal: draft.internal_review });
  const next = companionDraftSchema.parse({ ...draft, blocks: guard.blocks, validation: guard.validation, release_blockers: guard.release_blockers, internal_review: guard.internal_review });
  await store.updateOutput(o.id, { companion: next }, "draft");
  if (phaseOf(c) === "draft_ready") await setPhase(store, c, "producer_review", {}, userId);
  await store.audit({ case_id: c.id, output_id: o.id, advisor_id: userId, actor_id: userId, event: "producer_edited", detail: { changes: changes.map((x) => ({ ...x, before: x.before.slice(0, 700), after: x.after.slice(0, 700) })), recommendation_language: changes.some((x) => blockIssues(x.after, draft.plan.blocks.find((p) => p.block_id === x.block_id), allFacts(packet, brief), { insured_structure: packet.insured_structure, guaranteeLifetime: false }).some((i) => /recommendation|suitability|evaluative|superlative|purchase|safety|best-interest/.test(i))) } });
  return next;
}

/* ── 8 · approval ─────────────────────────────────────────────────────── */

export const ACKNOWLEDGEMENT =
  "I reviewed this companion against the carrier illustration. It correctly reflects the illustrated facts and the client's stated objectives as I understand them, and sharing it is permitted by my firm's and the carrier's procedures.";

const approveSchema = z
  .object({
    acknowledged: z.literal(true),
    name: z.string().trim().min(2).max(120),
    verified_items: z.array(z.string().regex(/^o\.[a-z0-9_]+$/)).max(40),
    revision: z.number().int().positive(),
  })
  .strict();

export async function approveDraft(store: CompanionStore, userId: string, outputId: string, input: unknown) {
  {
    const { o } = await ownOutput(store, userId, outputId);
    if (isStoryDraft(o.companion)) return approveStory(store, userId, outputId, input);
  }
  const body = approveSchema.parse(input);
  const { o, c } = await ownOutput(store, userId, outputId);
  if (o.status !== "draft") throw new ServiceError("not_draft", 409);
  if (o.revision !== c.companion_revision || body.revision !== c.companion_revision) throw new ServiceError("stale_revision", 409);
  if (!["draft_ready", "producer_review"].includes(phaseOf(c))) throw new ServiceError("not_reviewable", 409);
  const draft = companionDraftSchema.parse(o.companion);
  const packet = readPacket(c)!;
  // Re-run every deterministic check on the exact stored copy (server authority).
  const recheck = guardDraft({ plan: draft.plan, packet, brief: readBrief(c), observations: draft.internal_observations, blocks: draft.blocks.map((b) => ({ block_id: b.block_id, body: b.body, client_ready: b.client_ready, author: b.author })), writerInternal: draft.internal_review });
  if (!recheck.validation.client_release_eligible) throw new ServiceError("validation_failed", 409, { blockers: recheck.release_blockers, validation: recheck.validation });
  if (draft.document_fingerprint !== packet.document_fingerprint) throw new ServiceError("fingerprint_mismatch", 409);
  const required = verificationItems(draft.internal_observations).map((x) => x.observation_id);
  const unchecked = required.filter((id) => !body.verified_items.includes(id));
  if (unchecked.length) throw new ServiceError("verification_items_open", 409, { unchecked });
  const { hash } = approvalScope({ case_id: c.id, revision: c.companion_revision, draft, advisor_id: userId, verified_items: body.verified_items });
  const now = new Date().toISOString();
  const artifact_id = `PPC-${now.slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8)}`;
  const updated = await store.updateOutput(
    o.id,
    {
      status: "final",
      adopted_by: userId,
      adopted_at: now,
      content_hash: hash,
      artifact_id,
      // The evidence and brief are frozen with the approval so the snapshot always re-renders exactly.
      approval: { scope_hash: hash, verified_items: body.verified_items, by: userId, by_name: body.name, at: now, acknowledgement: ACKNOWLEDGEMENT, revision: c.companion_revision, snapshot: { evidence: packet, brief: readBrief(c) } },
    },
    "draft",
  );
  if (!updated) throw new ServiceError("conflict", 409);
  await setPhase(store, c, "approved", {}, userId);
  await store.audit({ case_id: c.id, output_id: o.id, advisor_id: userId, actor_id: userId, event: "approved", detail: { artifact_id, scope_hash: hash, verified_items: body.verified_items } });
  return { artifact_id, content_hash: hash };
}

/* ── 9 · render / export ──────────────────────────────────────────────── */

export async function renderOutput(store: CompanionStore, userId: string, outputId: string, kind: "preview" | "client") {
  const { o, c } = await ownOutput(store, userId, outputId);
  if (!["draft", "final", "superseded"].includes(o.status)) throw new ServiceError("not_ready", 409);
  if (isStoryDraft(o.companion)) return renderStory(store, userId, o, c, kind);
  const draft = companionDraftSchema.parse(o.companion);
  // Approved and superseded snapshots render from their own frozen evidence; the case may have moved on.
  const snap = (o.approval as { snapshot?: { evidence?: unknown; brief?: unknown } } | null)?.snapshot;
  const snapPacket = snap ? evidencePacketSchema.safeParse(snap.evidence) : null;
  const snapBrief = snap ? clientBriefSchema.safeParse(snap.brief) : null;
  const packet = snapPacket?.success ? snapPacket.data : readPacket(c);
  if (!packet) throw new ServiceError("no_evidence", 409);
  const facts = allFacts(packet, snapBrief?.success ? snapBrief.data : readBrief(c));
  const branding = await store.getBranding(userId);
  const policy = await store.getReleasePolicy(userId);
  const meta = (c.case_meta ?? {}) as { sales_jurisdiction?: string };
  const gate = releaseGate({ draft, policy, jurisdiction: meta.sales_jurisdiction ?? null, productClass: packet.product_class });
  const approval = o.approval as { by_name?: string; at?: string } | null;
  const current = o.status === "final" && o.revision === c.companion_revision;

  if (kind === "client") {
    if (!current) throw new ServiceError("not_approved", 409, { message: o.status === "superseded" ? "This companion was superseded by a newer revision." : "Approve the companion first." });
    if (!gate.client_export_allowed) throw new ServiceError("release_gate_closed", 403, { reasons: gate.reasons });
  }
  const html = buildCompanionHtml(draft, packet, facts, branding, {
    state: kind === "client" ? "approved" : "internal_draft",
    preparedAt: o.adopted_at ?? o.completed_at ?? new Date().toISOString(),
    approvedBy: approval?.by_name ?? null,
    approvedAt: approval?.at ?? null,
    artifactId: o.artifact_id,
    showFirmDisclosures: kind === "client",
  });
  if (kind === "client") {
    await store.audit({ case_id: c.id, output_id: o.id, advisor_id: userId, actor_id: userId, event: "client_export", detail: { artifact_id: o.artifact_id, html_sha256: sha256(html) } });
    if (phaseOf(c) === "approved") await setPhase(store, c, "exported", {}, userId);
  } else {
    await store.audit({ case_id: c.id, output_id: o.id, advisor_id: userId, actor_id: userId, event: "preview_rendered", detail: {} });
  }
  return { html, gate, artifact_id: o.artifact_id, status: o.status, current };
}

/* ── 10 · view model for the workspace ────────────────────────────────── */

function publicApproval(a: unknown) {
  if (!a || typeof a !== "object") return null;
  const { snapshot: _snapshot, ...rest } = a as Record<string, unknown>;
  return rest;
}

export async function caseView(store: CompanionStore, userId: string, caseId: string) {
  const c = await ownCase(store, userId, caseId);
  const outputs = await store.listOutputs(c.id);
  const packet = readPacket(c);
  const brief = readBrief(c);
  const policy = await store.getReleasePolicy(userId);
  const latest = outputs.filter((o) => o.revision === c.companion_revision).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  const storyDraft = latest && (latest.status === "draft" || latest.status === "final") && isStoryDraft(latest.companion) ? storyDraftSchema.safeParse(latest.companion) : null;
  const draft = latest && (latest.status === "draft" || latest.status === "final") && !isStoryDraft(latest.companion) ? companionDraftSchema.safeParse(latest.companion) : null;
  const meta = (c.case_meta ?? {}) as { sales_jurisdiction?: string };
  const gateDraft = draft?.success ? draft.data : storyDraft?.success ? { mode: "explanatory" as const, validation: storyDraft.data.validation } : null;
  const gate = gateDraft && packet ? releaseGate({ draft: gateDraft, policy, jurisdiction: meta.sales_jurisdiction ?? null, productClass: packet.product_class }) : null;
  const ex = (c.extraction ?? {}) as Record<string, unknown>;
  const pages = splitPages(c.illustration_text ?? "");
  return {
    id: c.id,
    phase: phaseOf(c),
    revision: c.companion_revision,
    case_meta: c.case_meta,
    illustration: c.illustration,
    extraction: { status: ex.status ?? null, attempts: ex.attempts ?? 0, requested_at: ex.requested_at ?? null, completed_at: ex.completed_at ?? null, error: ex.error ?? null },
    evidence: packet
      ? {
          document_kind: packet.document_kind,
          product_class: packet.product_class,
          insured_structure: packet.insured_structure,
          facts: packet.facts,
          refs: packet.refs,
          warnings: packet.extraction_warnings,
          blockers: packet.blockers,
          page_numbers: pages.map((p) => p.page_number),
        }
      : null,
    facts_confirmed: factsConfirmedFor(c) ? c.facts_confirmed : null,
    brief,
    brief_missing: briefMissing(brief),
    declaration_refs: declarationRefs(brief),
    output: latest
      ? {
          id: latest.id,
          status: latest.status,
          revision: latest.revision,
          created_at: latest.created_at,
          completed_at: latest.completed_at,
          artifact_id: latest.artifact_id,
          approval: publicApproval(latest.approval),
          error: latest.status === "error" ? ((latest.meta as { reason?: string })?.reason ?? "error") : null,
          draft: draft?.success ? draft.data : null,
          story: storyDraft?.success ? storyDraft.data : null,
        }
      : null,
    story: storyFormState(c, packet, outputs, await store.getBranding(userId)),
    history: outputs
      .filter((o) => o.status === "final" || o.status === "superseded")
      .filter((o) => !!o.artifact_id)
      .map((o) => ({ id: o.id, status: o.status, revision: o.revision, artifact_id: o.artifact_id, adopted_at: o.adopted_at })),
    release: { policy: policy ? releasePolicySchema.parse(policy) : null, gate },
    verification_items: draft?.success ? verificationItems(draft.data.internal_observations).map((x) => ({ id: x.observation_id, action: x.review_action, fact_ids: x.fact_ids })) : [],
  };
}

/** Returns one page of the redacted source for the "View source" panel (owner only). */
export async function sourcePage(store: CompanionStore, userId: string, caseId: string, page: number) {
  const c = await ownCase(store, userId, caseId);
  const p = splitPages(c.illustration_text ?? "").find((x) => x.page_number === page);
  if (!p) throw new ServiceError("not_found", 404);
  return p;
}

/* ── 11 · PolicyPlan Stories (pre-sale) ───────────────────────────────── */

/**
 * One submit, one workflow run. When the illustration came with the form
 * answers, the reply to the signed extract callback carries the story job, and
 * the same n8n run goes on to write the story; the app never triggers n8n a
 * second time. If the story cannot start (a core fact not found, a blocker),
 * the reason is kept so the advisor sees it next to the facts.
 */
async function storyAfterExtraction(store: CompanionStore, caseId: string, r: { ok: boolean; phase: string }) {
  const c = await store.getCase(caseId);
  const ill = (c?.illustration ?? {}) as { story_request?: unknown; story_auto?: unknown };
  if (!c || !ill.story_request || ill.story_auto) return r;
  let auto: { status: "sent" | "stopped"; at: string; error?: string; message?: string };
  let story_job: Record<string, unknown> | null = null;
  try {
    const planned = await planStory(store, c.advisor_id, c.id, { revision: c.companion_revision, inputs: ill.story_request });
    if (planned.job) story_job = planned.job;
    auto = { status: "sent", at: new Date().toISOString() };
  } catch (e) {
    const err = e instanceof ServiceError ? e : null;
    const detail = (err?.detail ?? {}) as { message?: string };
    auto = { status: "stopped", at: new Date().toISOString(), error: err?.code ?? "error", ...(detail.message ? { message: String(detail.message).slice(0, 300) } : {}) };
  }
  const now = await store.getCase(caseId);
  if (now) await store.updateCase(now.id, { illustration: { ...((now.illustration ?? {}) as object), story_auto: auto } });
  return { ok: true, phase: now ? phaseOf(now) : r.phase, story: auto.status, ...(story_job ? { story_job } : {}) };
}

/** What the one-screen form needs: the riders read from the illustration, cover defaults and the last inputs used. */
function storyFormState(c: CaseRow, packet: EvidencePacket | null, outputs: OutputRow[], branding: CompanionBranding | null) {
  const meta = (c.case_meta ?? {}) as { story_key?: string };
  if (!meta.story_key) return null;
  const last = [...outputs].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((o) => (o.companion as { inputs?: unknown } | null)?.inputs).find(Boolean);
  const ill = (c.illustration ?? {}) as { story_request?: unknown; story_auto?: { status: string; error?: string; message?: string } };
  const lastOrRequest = last ?? ill.story_request;
  const parsed = lastOrRequest ? storyInputsSchema.safeParse(lastOrRequest) : null;
  return {
    story_key: meta.story_key,
    riders: packet ? riderNames(packet) : [],
    cover_defaults: {
      title: "Your Policy Story",
      subtitle: packet?.product_class === "IUL" ? "Indexed Universal Life\nHow your proposed policy is designed to work" : "Life Insurance\nHow your proposed policy is designed to work",
      advisor_name: branding?.advisor_name ?? "",
      firm_name: branding?.firm_name ?? "",
      has_logo: !!branding?.logo_base64,
    },
    last_inputs: parsed?.success ? parsed.data : null,
    auto: ill.story_request ? (ill.story_auto ?? { status: "waiting" }) : null,
  };
}

const storyRequestSchema = z.object({ revision: z.number().int().positive(), inputs: z.unknown() }).strict();

/** A pending story job left behind by a run that never called back is closed after this long. */
const STORY_STALE_MS = 15 * 60 * 1000;

/** Generate again: plans the job and triggers the workflow's story stage. */
export async function requestStory(store: CompanionStore, gw: WorkflowGateway, env: Env, userId: string, caseId: string, input: unknown) {
  const planned = await planStory(store, userId, caseId, input);
  if (!planned.job) return { output_id: planned.output_id, status: "pending" as const };
  const { job } = planned;
  const r = await gw.send({ stage: "story", case_id: caseId, callback_url: env.callbackUrl, issued_at: new Date().toISOString(), ...job }).catch(() => ({ ok: false, status: 0 }));
  if (!r.ok) {
    await store.updateOutput(planned.output_id, { status: "error", meta: { reason: `trigger_failed:${r.status}` } }, "pending");
    const c = await store.getCase(caseId);
    if (c) await setPhase(store, c, "failed_retryable", {}, userId);
    throw new ServiceError("workflow_unavailable", 502);
  }
  return { output_id: planned.output_id, status: "pending" as const };
}

/** Confirms the facts the advisor saw, computes the playback and records the pending story job (no network). */
async function planStory(store: CompanionStore, userId: string, caseId: string, input: unknown): Promise<{ output_id: string; job: { job_id: string; revision: number; prompt_versions: { story: string }; story_input: ReturnType<typeof storyWriterInput> } | null }> {
  const body = storyRequestSchema.parse(input);
  const inputs = storyInputsSchema.parse(body.inputs);
  let c = await ownCase(store, userId, caseId);
  if (body.revision !== c.companion_revision) throw new ServiceError("stale_revision", 409);
  const meta = (c.case_meta ?? {}) as { story_key?: string };
  if (meta.story_key !== inputs.story_key) throw new ServiceError("wrong_story", 409);
  const packet = readPacket(c);
  if (!packet) throw new ServiceError("no_evidence", 409);
  if (!["extracted_needs_review", "intake_ready", "draft_ready", "producer_review", "approved", "exported", "failed_retryable", "analysis_pending"].includes(phaseOf(c))) throw new ServiceError("not_allowed", 409);
  const core = packet.facts.filter((f) => ["f.insurer", "f.product_name", "f.initial_death_benefit"].includes(f.fact_id) && (f.status === "not_found" || f.status === "contradictory"));
  if (core.length) throw new ServiceError("core_facts_unresolved", 409, { facts: core.map((f) => f.fact_id) });

  const pages = splitPages(c.illustration_text ?? "");
  const playback = buildStoryPlayback(packet, inputs, pages);
  const blockers = storyBlockers(packet, playback);
  if (blockers.length) throw new ServiceError("story_blocked", 409, { message: blockers.join(" "), blockers });

  const outputs = await store.listOutputs(c.id);
  const inflight = outputs.find((o) => o.revision === c.companion_revision && o.status === "pending");
  if (inflight) {
    const at = (inflight.meta as { requested_at?: string } | null)?.requested_at;
    if (!at || Date.now() - new Date(at).getTime() < STORY_STALE_MS) return { output_id: inflight.id, job: null };
    await store.updateOutput(inflight.id, { status: "error", meta: { ...(inflight.meta as object), reason: "no_callback" } }, "pending");
    outputs.splice(outputs.indexOf(inflight), 1, { ...inflight, status: "error" });
  }
  // An approved story is never edited in place: new inputs start a new revision.
  if (outputs.some((o) => o.revision === c.companion_revision && o.status === "final")) {
    const carried = factsConfirmedFor(c) ? { ...(c.facts_confirmed as object) } : null;
    c = await bumpRevision(store, c, "story_regenerated", userId);
    if (carried) c = (await store.updateCase(c.id, { facts_confirmed: { ...carried, revision: c.companion_revision } }))!;
  }
  for (const o of outputs) if (o.revision === c.companion_revision && (o.status === "draft" || o.status === "error")) await store.updateOutput(o.id, { status: "superseded", superseded_at: new Date().toISOString() }, o.status);
  if (!factsConfirmedFor(c)) {
    const confirmed = await store.updateCase(c.id, { facts_confirmed: { by: userId, at: new Date().toISOString(), revision: c.companion_revision, via: "story_generate" } }, { companion_revision: c.companion_revision });
    if (!confirmed) throw new ServiceError("conflict", 409);
    c = confirmed;
    await store.audit({ case_id: c.id, advisor_id: userId, actor_id: userId, event: "facts_confirmed", detail: { revision: c.companion_revision, via: "story_generate" } });
  }

  const job_id = randomUUID();
  const out = await store.insertOutput({
    intake_id: c.id,
    advisor_id: userId,
    case_type: "illustration_companion",
    status: "pending",
    revision: c.companion_revision,
    job_id,
    companion: { stage: "story_planned", kind: "story_pending", story_key: inputs.story_key, inputs, playback },
    meta: { requested_at: new Date().toISOString(), story_key: inputs.story_key },
  });
  if (phaseOf(c) === "extracted_needs_review" || phaseOf(c) === "approved" || phaseOf(c) === "exported") c = await setPhase(store, c, "intake_ready", {}, userId);
  c = await setPhase(store, c, "analysis_pending", {}, userId);
  await store.audit({ case_id: c.id, output_id: out.id, advisor_id: userId, actor_id: userId, event: "story_requested", detail: { job_id, revision: c.companion_revision, story_key: inputs.story_key, goals: inputs.goals, notes: playback.notes } });
  return { output_id: out.id, job: { job_id, revision: c.companion_revision, prompt_versions: { story: STORY_VERSIONS.prompt }, story_input: storyWriterInput(playback) } };
}

async function onStory(store: CompanionStore, c: CaseRow, body: z.infer<typeof callbackSchema>) {
  const o = await store.getOutputByJob(body.job_id);
  if (!o || o.intake_id !== c.id || o.status !== "pending" || o.revision !== body.revision || body.revision !== c.companion_revision) throw new ServiceError("stale_or_duplicate", 409);
  const fail = async (reason: string) => {
    await store.updateOutput(o.id, { status: "error", completed_at: new Date().toISOString(), meta: { ...(o.meta as object), reason } }, "pending");
    await setPhase(store, c, "failed_retryable");
    await store.audit({ case_id: c.id, output_id: o.id, advisor_id: c.advisor_id, actor_id: null, event: "story_failed", detail: { reason } });
    return { ok: true, phase: "failed_retryable" as const, reason };
  };
  const stored = o.companion as { inputs?: unknown; playback?: unknown } | null;
  const inputs = storyInputsSchema.safeParse(stored?.inputs);
  const playback = storyPlaybackSchema.safeParse(stored?.playback);
  if (!inputs.success || !playback.success) return fail("missing_playback");
  if (body.status === "error" || !body.story) return fail((body.error ?? "workflow_error").slice(0, 200));
  const json = parseModelJson(body.story.raw);
  if (!json.ok) return fail(`writer_${json.error}`);
  const w = storyWriterSchema.safeParse(json.value);
  if (!w.success) return fail("writer_schema");
  const packet = readPacket(c);
  const draft = storyDraftSchema.parse(
    finishDraft({
      schema_version: STORY_VERSIONS.draft,
      kind: "story",
      story_key: inputs.data.story_key,
      case_id: c.id,
      revision: c.companion_revision,
      document_fingerprint: packet?.document_fingerprint ?? "unknown",
      inputs: inputs.data,
      playback: playback.data,
      text: writerToText(w.data, playback.data),
      authors: {},
      versions: { prompt: STORY_VERSIONS.prompt, template: STORY_VERSIONS.template, playback: STORY_VERSIONS.playback },
      writer: { model: body.story.model ?? null, workflow_version: body.workflow_version ?? null },
    }),
  );
  await store.updateOutput(o.id, { status: "draft", companion: draft, completed_at: new Date().toISOString() }, "pending");
  await setPhase(store, c, "draft_ready");
  await store.audit({ case_id: c.id, output_id: o.id, advisor_id: c.advisor_id, actor_id: null, event: "story_draft_created", detail: { validation: draft.validation, issues: Object.keys(draft.issues), model: body.story.model ?? null } });
  return { ok: true, phase: "draft_ready" as const };
}

export async function saveStoryEdits(store: CompanionStore, userId: string, outputId: string, input: unknown) {
  const edits = storyEditsSchema.parse(input);
  const { o, c } = await ownOutput(store, userId, outputId);
  if (o.status !== "draft" || o.revision !== c.companion_revision) throw new ServiceError("not_editable", 409);
  const draft = storyDraftSchema.parse(o.companion);
  const { text, authors, changed } = applyEdits(draft, edits);
  if (!changed.length) return draft;
  const next = storyDraftSchema.parse(finishDraft({ ...draft, text, authors }));
  await store.updateOutput(o.id, { companion: next }, "draft");
  if (phaseOf(c) === "draft_ready") await setPhase(store, c, "producer_review", {}, userId);
  await store.audit({ case_id: c.id, output_id: o.id, advisor_id: userId, actor_id: userId, event: "producer_edited", detail: { changed, issues: Object.keys(next.issues) } });
  return next;
}

export const STORY_ACKNOWLEDGEMENT =
  "I reviewed this story against the carrier illustration. It correctly reflects the illustrated design and the client's goals as I understand them, it is not a recommendation on its own, and sharing it is permitted by my firm's and the carrier's procedures.";

const approveStorySchema = z.object({ acknowledged: z.literal(true), name: z.string().trim().min(2).max(120), revision: z.number().int().positive() }).strict();

async function approveStory(store: CompanionStore, userId: string, outputId: string, input: unknown) {
  const body = approveStorySchema.parse(input);
  const { o, c } = await ownOutput(store, userId, outputId);
  if (o.status !== "draft") throw new ServiceError("not_draft", 409);
  if (o.revision !== c.companion_revision || body.revision !== c.companion_revision) throw new ServiceError("stale_revision", 409);
  if (!["draft_ready", "producer_review"].includes(phaseOf(c))) throw new ServiceError("not_reviewable", 409);
  const stored = storyDraftSchema.parse(o.companion);
  const draft = finishDraft(stored); // server re-runs every check on the exact stored copy
  if (!draft.validation.client_release_eligible) throw new ServiceError("validation_failed", 409, { issues: draft.issues, validation: draft.validation });
  const packet = readPacket(c);
  if (packet && draft.document_fingerprint !== packet.document_fingerprint) throw new ServiceError("fingerprint_mismatch", 409);
  const hash = sha256(JSON.stringify({ case_id: c.id, revision: c.companion_revision, tenant: userId, text: draft.text, playback: draft.playback, inputs: draft.inputs, versions: draft.versions }));
  const now = new Date().toISOString();
  const artifact_id = `PPS-${now.slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8)}`;
  const updated = await store.updateOutput(
    o.id,
    { status: "final", adopted_by: userId, adopted_at: now, content_hash: hash, artifact_id, approval: { scope_hash: hash, verified_items: [], by: userId, by_name: body.name, at: now, acknowledgement: STORY_ACKNOWLEDGEMENT, revision: c.companion_revision } },
    "draft",
  );
  if (!updated) throw new ServiceError("conflict", 409);
  await setPhase(store, c, "approved", {}, userId);
  await store.audit({ case_id: c.id, output_id: o.id, advisor_id: userId, actor_id: userId, event: "approved", detail: { artifact_id, scope_hash: hash, kind: "story" } });
  return { artifact_id, content_hash: hash };
}

async function renderStory(store: CompanionStore, userId: string, o: OutputRow, c: CaseRow, kind: "preview" | "client") {
  const draft: StoryDraft = storyDraftSchema.parse(o.companion);
  const branding = await store.getBranding(userId);
  const policy = await store.getReleasePolicy(userId);
  const meta = (c.case_meta ?? {}) as { sales_jurisdiction?: string };
  const gate = releaseGate({ draft: { mode: "explanatory", validation: draft.validation }, policy, jurisdiction: meta.sales_jurisdiction ?? null, productClass: draft.playback.product.product_class });
  const current = o.status === "final" && o.revision === c.companion_revision;
  if (kind === "client") {
    if (!current) throw new ServiceError("not_approved", 409, { message: o.status === "superseded" ? "This story was superseded by a newer revision." : "Approve the story first." });
    if (!gate.client_export_allowed) throw new ServiceError("release_gate_closed", 403, { reasons: gate.reasons });
  }
  const approval = o.approval as { by_name?: string; at?: string } | null;
  const html = buildStoryHtml(draft, branding, {
    state: kind === "client" ? "approved" : "internal_draft",
    preparedAt: o.adopted_at ?? o.completed_at ?? new Date().toISOString(),
    approvedBy: approval?.by_name ?? null,
    approvedAt: approval?.at ?? null,
    artifactId: o.artifact_id,
    showFirmDisclosures: kind === "client",
  });
  if (kind === "client") {
    await store.audit({ case_id: c.id, output_id: o.id, advisor_id: userId, actor_id: userId, event: "client_export", detail: { artifact_id: o.artifact_id, html_sha256: sha256(html), kind: "story" } });
    if (phaseOf(c) === "approved") await setPhase(store, c, "exported", {}, userId);
  } else {
    await store.audit({ case_id: c.id, output_id: o.id, advisor_id: userId, actor_id: userId, event: "preview_rendered", detail: { kind: "story" } });
  }
  return { html, gate, artifact_id: o.artifact_id, status: o.status, current };
}
