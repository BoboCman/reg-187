import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import * as svc from "../../lib/companion/service";
import { sampleByKey, type SampleCase } from "../../lib/companion/samples";
import { MemoryStore, FakeGateway } from "./memory-store";
import type { ReleasePolicy } from "../../lib/companion/contracts";

const SECRET = "test-callback-secret";
const env: svc.Env = { callbackUrl: "https://preview.example/api/companion/callback", callbackSecret: SECRET };
const USER = randomUUID();
const OTHER = randomUUID();

function signed(body: unknown, opts: { secret?: string; ts?: number } = {}) {
  const raw = JSON.stringify(body);
  const ts = String(Math.floor((opts.ts ?? Date.now()) / 1000));
  return { raw, headers: { timestamp: ts, signature: svc.signBody(opts.secret ?? SECRET, ts, raw) } };
}

function submission(s: SampleCase, over: Record<string, unknown> = {}) {
  return {
    text: s.pagesText,
    page_count: s.pageCount,
    document_fingerprint: s.fingerprint,
    file_size: 250_000,
    kind_confirmed: "proposed_sales",
    privacy: { removed: {}, worker_warnings: [], names_screened: 1 },
    extractor: "pdfjs-worker",
    ...over,
  };
}

const POLICY: ReleasePolicy = {
  advisor_id: USER,
  external_client_export_allowed: true,
  enhanced_numeric_mode_allowed: false,
  approved_jurisdictions: [],
  approved_product_classes: [],
  approval_reference: "FIRM-TEST-1",
  effective_at: null,
  expires_at: null,
};

/** Runs a sample from upload to a draft, returning the handles. */
async function toDraft(key = "indexed-ul") {
  const s = sampleByKey(key);
  const store = new MemoryStore();
  const gw = new FakeGateway();
  const c = await svc.createCase(store, USER, { sales_jurisdiction: "OH", case_label: "Case 14" });
  await svc.submitIllustration(store, gw, env, USER, c.id, submission(s));
  const ex = gw.last();
  assert.equal(ex.stage, "extract");
  const cb = signed({ stage: "extract", job_id: ex.job_id, case_id: c.id, revision: 1, status: "ok", workflow_version: "policyplan-companion-v1", extraction: { atlas1: s.atlas1, atlas2_registry: s.atlas2Registry } });
  const r1 = await svc.handleCallback(store, env, cb.raw, cb.headers);
  assert.equal(r1.phase, "extracted_needs_review");
  await svc.confirmFacts(store, USER, c.id, { revision: 1 });
  const afterBrief = await svc.saveBrief(store, USER, c.id, s.brief);
  assert.equal(afterBrief.companion_phase, "intake_ready");
  const a = await svc.requestAnalysis(store, gw, env, USER, c.id, {});
  const wr = gw.last();
  assert.equal(wr.stage, "write");
  const wcb = signed({ stage: "write", job_id: wr.job_id, case_id: c.id, revision: wr.revision, status: "ok", workflow_version: "policyplan-companion-v1", writer: { raw: JSON.stringify(s.writer), model: "test-model", attempts: 1 } });
  const r2 = await svc.handleCallback(store, env, wcb.raw, wcb.headers);
  assert.equal(r2.phase, "draft_ready", JSON.stringify(r2));
  return { s, store, gw, caseId: c.id, outputId: a.output_id, extractJob: ex, writeCallback: wcb };
}

test("full flow: upload → facts → brief → draft → approve → export", async () => {
  const { store, caseId, outputId } = await toDraft();
  const view = await svc.caseView(store, USER, caseId);
  assert.equal(view.phase, "draft_ready");
  assert.equal(view.output?.draft?.validation.client_release_eligible, true);

  // Client export is closed until approval, and stays closed without the firm's release policy.
  await assert.rejects(svc.renderOutput(store, USER, outputId, "client"), /not_approved/);
  const preview = await svc.renderOutput(store, USER, outputId, "preview");
  assert.match(preview.html, /DRAFT — NOT FOR CLIENT DISTRIBUTION/);

  await assert.rejects(svc.approveDraft(store, USER, outputId, { acknowledged: true, name: "Test Producer", verified_items: [], revision: 2 }), /stale_revision/);
  const items = view.verification_items.map((v) => v.id);
  const approved = await svc.approveDraft(store, USER, outputId, { acknowledged: true, name: "Test Producer", verified_items: items, revision: 1 });
  assert.match(approved.artifact_id, /^PPC-\d{8}-[a-f0-9]{8}$/);

  await assert.rejects(svc.renderOutput(store, USER, outputId, "client"), /release_gate_closed/);
  store.policies.set(USER, POLICY);
  const client = await svc.renderOutput(store, USER, outputId, "client");
  assert.doesNotMatch(client.html, /NOT FOR CLIENT DISTRIBUTION/);
  assert.match(client.html, new RegExp(approved.artifact_id));
  assert.equal((await svc.caseView(store, USER, caseId)).phase, "exported");

  // Snapshots cannot be edited or re-approved.
  await assert.rejects(svc.saveEdits(store, USER, outputId, { blocks: [{ block_id: "b.objective", body: "Changed." }] }), /not_editable/);
  await assert.rejects(svc.approveDraft(store, USER, outputId, { acknowledged: true, name: "Test Producer", verified_items: items, revision: 1 }), /not_draft/);

  const events = store.events.map((e) => e.event);
  for (const e of ["case_created", "illustration_received", "extraction_requested", "extraction_completed", "facts_confirmed", "brief_saved", "analysis_requested", "draft_created", "approved", "client_export"]) assert.ok(events.includes(e), e);
});

test("callbacks: bad signature, stale timestamp, wrong secret and replay are refused", async () => {
  const { store, writeCallback, caseId } = await toDraft();
  await assert.rejects(svc.handleCallback(store, env, writeCallback.raw, writeCallback.headers), /stale_or_duplicate/, "replay of a used job");
  const body = JSON.parse(writeCallback.raw);
  const tampered = signed(body);
  await assert.rejects(svc.handleCallback(store, env, tampered.raw.replace("test-model", "evil"), tampered.headers), /unauthorized/);
  const old = signed(body, { ts: Date.now() - 20 * 60 * 1000 });
  await assert.rejects(svc.handleCallback(store, env, old.raw, old.headers), /unauthorized/);
  const wrong = signed(body, { secret: "other" });
  await assert.rejects(svc.handleCallback(store, env, wrong.raw, wrong.headers), /unauthorized/);
  await assert.rejects(svc.handleCallback(store, { ...env, callbackSecret: null }, writeCallback.raw, writeCallback.headers), /not_configured/);
  const fake = signed({ ...body, job_id: randomUUID() });
  await assert.rejects(svc.handleCallback(store, env, fake.raw, fake.headers), /stale_or_duplicate/);
  assert.ok(caseId);
});

test("another advisor cannot see or act on a case", async () => {
  const { store, gw, caseId, outputId } = await toDraft();
  await assert.rejects(svc.caseView(store, OTHER, caseId), /not_found/);
  await assert.rejects(svc.renderOutput(store, OTHER, outputId, "preview"), /not_found/);
  await assert.rejects(svc.approveDraft(store, OTHER, outputId, { acknowledged: true, name: "X Y", verified_items: [], revision: 1 }), /not_found/);
  await assert.rejects(svc.saveEdits(store, OTHER, outputId, { blocks: [{ block_id: "b.objective", body: "x" }] }), /not_found/);
  await assert.rejects(svc.requestAnalysis(store, gw, env, OTHER, caseId, {}), /not_found/);
  await assert.rejects(svc.sourcePage(store, OTHER, caseId, 1), /not_found/);
  await assert.rejects(svc.caseView(store, USER, "not-a-uuid"), /not_found/);
});

test("producer edits are re-checked; a bad edit blocks approval, a fix re-opens it", async () => {
  const { store, caseId, outputId } = await toDraft();
  const bad = await svc.saveEdits(store, USER, outputId, { blocks: [{ block_id: "b.illustrated", body: "This is the best and safest choice for your family." }] });
  assert.equal(bad.validation.client_release_eligible, false);
  assert.equal((await svc.caseView(store, USER, caseId)).phase, "producer_review");
  const items = (await svc.caseView(store, USER, caseId)).verification_items.map((v) => v.id);
  await assert.rejects(svc.approveDraft(store, USER, outputId, { acknowledged: true, name: "Test Producer", verified_items: items, revision: 1 }), /validation_failed/);
  const good = await svc.saveEdits(store, USER, outputId, {
    blocks: [{ block_id: "b.illustrated", body: "The illustrated values assume an index-linked rate of {{f.illustrated_rate}} each year with current charges. They are not guaranteed and can be higher or lower." }],
  });
  assert.equal(good.validation.client_release_eligible, true, JSON.stringify([good.release_blockers, good.blocks.map((b) => b.issues)]));
  assert.equal(good.blocks.find((b) => b.block_id === "b.illustrated")?.author, "producer");
  const ed = store.events.filter((e) => e.event === "producer_edited");
  assert.equal(ed.length, 2);
  assert.equal(ed[0].detail?.recommendation_language, true);
  await svc.approveDraft(store, USER, outputId, { acknowledged: true, name: "Test Producer", verified_items: items, revision: 1 });
});

test("open verification items block approval", async () => {
  const s = sampleByKey("indexed-ul");
  const { store, gw, caseId } = await toDraft();
  // A brief that raises an existing policy requires the producer's verification.
  await svc.saveBrief(store, USER, caseId, { ...s.brief, existing_policy_connection: "yes" });
  const a = await svc.requestAnalysis(store, gw, env, USER, caseId, {});
  const wr = gw.last();
  const cb = signed({ stage: "write", job_id: wr.job_id, case_id: caseId, revision: wr.revision, status: "ok", writer: { raw: JSON.stringify(s.writer) } });
  await svc.handleCallback(store, env, cb.raw, cb.headers);
  const v = await svc.caseView(store, USER, caseId);
  assert.ok(v.verification_items.some((x) => x.id === "o.existing_coverage"));
  await assert.rejects(svc.approveDraft(store, USER, a.output_id, { acknowledged: true, name: "Test Producer", verified_items: [], revision: v.revision }), /verification_items_open|validation_failed/);
});

test("changing the brief after approval supersedes the snapshot, which still renders from its frozen evidence", async () => {
  const { s, store, gw, caseId, outputId } = await toDraft();
  const items = (await svc.caseView(store, USER, caseId)).verification_items.map((v) => v.id);
  await svc.approveDraft(store, USER, outputId, { acknowledged: true, name: "Test Producer", verified_items: items, revision: 1 });
  store.policies.set(USER, POLICY);
  const before = await svc.renderOutput(store, USER, outputId, "preview");

  const c = await svc.saveBrief(store, USER, caseId, { ...s.brief, top_priority: "flexibility" });
  assert.equal(c.companion_revision, 2);
  const old = await store.getOutput(outputId);
  assert.equal(old?.status, "superseded");
  assert.ok(store.events.some((e) => e.event === "approval_superseded"));
  await assert.rejects(svc.renderOutput(store, USER, outputId, "client"), /not_approved/);
  const again = await svc.renderOutput(store, USER, outputId, "preview");
  assert.equal(again.html.replace(/Prepared[^<]*/g, ""), before.html.replace(/Prepared[^<]*/g, ""));

  // The facts confirmation carries over because only the brief changed; analysis can run for revision 2.
  const view = await svc.caseView(store, USER, caseId);
  assert.ok(view.facts_confirmed);
  assert.equal(view.history.length, 1);
  const r = await svc.requestAnalysis(store, gw, env, USER, caseId, {});
  assert.notEqual(r.output_id, outputId);
});

test("analysis requests are idempotent while a job is in flight", async () => {
  const s = sampleByKey("guaranteed-ul");
  const store = new MemoryStore();
  const gw = new FakeGateway();
  const c = await svc.createCase(store, USER, { sales_jurisdiction: "NY" });
  await svc.submitIllustration(store, gw, env, USER, c.id, submission(s));
  const ex = gw.last();
  const cb = signed({ stage: "extract", job_id: ex.job_id, case_id: c.id, revision: 1, status: "ok", extraction: { atlas1: s.atlas1, atlas2_registry: s.atlas2Registry } });
  await svc.handleCallback(store, env, cb.raw, cb.headers);
  await assert.rejects(svc.requestAnalysis(store, gw, env, USER, c.id, {}), /facts_not_confirmed/);
  await svc.confirmFacts(store, USER, c.id, { revision: 1 });
  await assert.rejects(svc.requestAnalysis(store, gw, env, USER, c.id, {}), /brief_incomplete/);
  await svc.saveBrief(store, USER, c.id, s.brief);
  const a = await svc.requestAnalysis(store, gw, env, USER, c.id, {});
  const b = await svc.requestAnalysis(store, gw, env, USER, c.id, {});
  assert.equal(a.output_id, b.output_id);
  assert.equal(gw.sent.filter((x) => x.stage === "write").length, 1);
  // The writer packet never carries client identity or free text beyond the screened brief.
  const w = JSON.stringify(gw.last());
  assert.doesNotMatch(w, /Case 14|producer_display_name/);
});

test("illustration gates: in-force, name leak, residual identifiers, page mismatch, image-only", async () => {
  const s = sampleByKey("guaranteed-ul");
  const run = async (over: Record<string, unknown>) => {
    const store = new MemoryStore();
    const gw = new FakeGateway();
    const c = await svc.createCase(store, USER, { sales_jurisdiction: "NY" });
    const err = await svc.submitIllustration(store, gw, env, USER, c.id, submission(s, over)).then(
      () => null,
      (e) => e as svc.ServiceError,
    );
    return { err, sent: gw.sent.length, phase: (await store.getCase(c.id))?.companion_phase };
  };
  const inforce = await run({ kind_confirmed: "in_force" });
  assert.equal(inforce.err?.code, "unsupported_in_force");
  assert.equal(inforce.phase, "blocked_unsupported");
  const leak = await run({ privacy: { removed: {}, worker_warnings: ["name_leak:1"], names_screened: 1 } });
  assert.equal(leak.err?.code, "privacy_name_leak");
  assert.equal(leak.sent, 0);
  const pages = s.pagesText.split(/(?=--- PAGE \d+ ---)/);
  const residual = await run({ text: pages.map((p, i) => (i === 0 ? p + " Reach the client at jane.doe@example.org" : p)).join("") });
  assert.equal(residual.err?.code, undefined, "an email is removed by the server screen, not a block");
  const mismatch = await run({ page_count: s.pageCount + 1 });
  assert.equal(mismatch.err?.code, "unreadable_document");
  const image = await run({ text: pages.map((_, i) => `--- PAGE ${i + 1} ---\n `).join("\n") });
  assert.equal(image.err?.code, "image_only_pdf");
  assert.equal(image.sent, 0);
});

test("the server's second privacy screen strips identifiers before n8n sees the text", async () => {
  const s = sampleByKey("guaranteed-ul");
  const store = new MemoryStore();
  const gw = new FakeGateway();
  const c = await svc.createCase(store, USER, { sales_jurisdiction: "NY" });
  const text = s.pagesText.replace("--- PAGE 1 ---\n", "--- PAGE 1 ---\nContact: (555) 201-3344, sam@example.org, SSN 123-45-6789. ");
  await svc.submitIllustration(store, gw, env, USER, c.id, submission(s, { text }));
  const sent = String(gw.last().illustration_text);
  assert.doesNotMatch(sent, /201-3344|sam@example|123-45-6789/);
});

test("a failed extraction can be retried, and a workflow outage fails closed", async () => {
  const s = sampleByKey("guaranteed-ul");
  const store = new MemoryStore();
  const gw = new FakeGateway();
  const c = await svc.createCase(store, USER, { sales_jurisdiction: "NY" });
  await svc.submitIllustration(store, gw, env, USER, c.id, submission(s));
  const ex = gw.last();
  const cb = signed({ stage: "extract", job_id: ex.job_id, case_id: c.id, revision: 1, status: "error", error: "atlas timeout" });
  assert.equal((await svc.handleCallback(store, env, cb.raw, cb.headers)).phase, "failed_retryable");
  gw.ok = false;
  await assert.rejects(svc.retryExtraction(store, gw, env, USER, c.id), /workflow_unavailable/);
  gw.ok = true;
  await svc.retryExtraction(store, gw, env, USER, c.id);
  assert.notEqual(gw.last().job_id, ex.job_id);
  assert.equal((await store.getCase(c.id))?.companion_phase, "extraction_pending");
});

test("a fact correction creates a new revision and must be on the cited page to verify", async () => {
  const { store, caseId, outputId } = await toDraft("guaranteed-ul");
  const view = await svc.caseView(store, USER, caseId);
  const prem = view.evidence!.facts.find((f) => f.fact_id === "f.planned_premium_outlay")!;
  const page = view.evidence!.refs.find((r) => r.evidence_id === prem.source_refs[0])!.page_number;
  const c = await svc.correctFact(store, USER, caseId, { fact_id: "f.planned_premium_outlay", value: 12_345, reason: "Typed from the carrier PDF", source_page: page });
  assert.equal(c.companion_revision, 2);
  assert.equal(c.companion_phase, "extracted_needs_review");
  const v2 = await svc.caseView(store, USER, caseId);
  assert.notEqual(v2.evidence!.facts.find((f) => f.fact_id === "f.planned_premium_outlay")!.status, "verified");
  assert.equal(v2.facts_confirmed, null);
  assert.equal((await store.getOutput(outputId))?.status, "superseded");
  await assert.rejects(svc.correctFact(store, USER, caseId, { fact_id: "f.brief.primary_objective", value: "x", reason: "not allowed here", source_page: null }), /unknown_fact/);
});

test("database immutability rule is mirrored: a final snapshot can only be superseded", async () => {
  const { store, caseId, outputId } = await toDraft();
  const items = (await svc.caseView(store, USER, caseId)).verification_items.map((v) => v.id);
  await svc.approveDraft(store, USER, outputId, { acknowledged: true, name: "Test Producer", verified_items: items, revision: 1 });
  await assert.rejects(store.updateOutput(outputId, { companion: {} }), /immutable/);
});
