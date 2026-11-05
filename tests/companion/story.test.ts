import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import * as svc from "../../lib/companion/service";
import { apartmentSample } from "../../lib/companion/samples";
import { buildStoryPlayback, guardStory, storyInputsSchema, storyWriterInput, textIssues, writerToText, type StoryPlayback } from "../../lib/companion/story";
import { buildEvidencePacket } from "../../lib/companion/evidence";
import { splitPages } from "../../lib/companion/pages";
import { buildStoryHtml } from "../../lib/companion/story-render";
import { MemoryStore, FakeGateway } from "./memory-store";
import type { ReleasePolicy } from "../../lib/companion/contracts";

const SECRET = "story-secret";
const env: svc.Env = { callbackUrl: "https://preview.example/api/companion/callback", callbackSecret: SECRET };
const USER = randomUUID();

function signed(body: unknown) {
  const raw = JSON.stringify(body);
  const ts = String(Math.floor(Date.now() / 1000));
  return { raw, headers: { timestamp: ts, signature: svc.signBody(SECRET, ts, raw) } };
}

const s = apartmentSample();
const pages = splitPages(s.pagesText);
const packet = buildEvidencePacket({ atlas1: s.atlas1, atlas2Registry: s.atlas2Registry }, pages, { fingerprint: s.fingerprint, page_count: s.pageCount });
const inputs = storyInputsSchema.parse({ story_key: "apartment", goals: s.goals, beneficiary: "Spouse", cover: { prepared_for: "Jordan and Sam" } });

function playback(): StoryPlayback {
  return buildStoryPlayback(packet, inputs, pages);
}

test("playback reads the story from the sales ledger", () => {
  const p = playback();
  assert.equal(p.issue_age, 45);
  assert.equal(p.construction_end_year, 10, JSON.stringify(p.phases));
  assert.deepEqual(p.phases.map((x) => [x.key, x.from_year, x.to_year]), [["construction", 1, 10], ["lease_up", 11, 20], ["fully_leased", 21, null]]);
  assert.deepEqual(p.milestones.map((m) => [m.key, m.year, m.age]), [["surrender_charge_ends", 11, 55], ["premiums_complete", 20, 64], ["income_starts", 22, 66]]);
  assert.equal(p.premium.annual, 24_000);
  assert.equal(p.premium.annual_verified, true);
  assert.equal(p.premium.years, 20);
  assert.deepEqual(p.income && [p.income.annual, p.income.start_age, p.income.end_age], [38_000, 66, 85]);
  assert.equal(p.death_benefit.initial, 750_000);
  assert.ok(p.points.length >= 3, JSON.stringify(p.points.map((x) => x.label)));
  assert.ok(p.points.every((pt) => pt.sv_current.value == null || pt.sv_current.value === 0 || pt.sv_current.verified), "every printed illustrated value is matched to its row");
  assert.deepEqual(p.benefit_facts.living_benefit_riders, ["Accelerated Death Benefit Rider for Chronic Illness"]);
  assert.equal(p.benefit_facts.has_ltc_rider, false);
});

test("writer input carries no names and no advisor free text", () => {
  const w = JSON.stringify(storyWriterInput(playback()));
  assert.doesNotMatch(w, /Jordan|Sam|Spouse/);
  assert.match(w, /policyplan_story_input\.v1/);
});

test("guard accepts the sample captions and catches bad ones", () => {
  const p = playback();
  const g = guardStory(writerToText(s.story, p), p);
  assert.equal(g.ok, true, JSON.stringify(g.issues));
  assert.ok(textIssues("This is the best policy for you.", 40, p).some((i) => /superlative/.test(i)));
  assert.ok(textIssues("Income of $52,000 a year from age 66.", 40, p).some((i) => /52,000/.test(i)));
  assert.ok(textIssues("Tax-free income for life.", 40, p).length > 0);
  assert.ok(textIssues("We recommend this design.", 40, p).length > 0);
  assert.deepEqual(textIssues("Planned income from age 66 with a $750K legacy.", 40, p), []);
  const ltc = guardStory({ ...writerToText(s.story, p), benefits: { ...writerToText(s.story, p).benefits, living_benefits: "Pays for long-term care" } }, p);
  assert.ok(ltc.issues["benefit.living_benefits"]?.some((i) => /long-term care/.test(i)));
});

test("story flow: upload, generate, signed callback, edit, approve, client export", async () => {
  const store = new MemoryStore();
  const gw = new FakeGateway();
  const c = await svc.createCase(store, USER, { sales_jurisdiction: "OH", story_key: "apartment" });
  await svc.submitIllustration(store, gw, env, USER, c.id, { text: s.pagesText, page_count: s.pageCount, document_fingerprint: s.fingerprint, file_size: 1000, kind_confirmed: "proposed_sales", privacy: { removed: {}, worker_warnings: [], names_screened: 1 } });
  const ex = gw.last();
  const cb = signed({ stage: "extract", job_id: ex.job_id, case_id: c.id, revision: 1, status: "ok", extraction: { atlas1: s.atlas1, atlas2_registry: s.atlas2Registry } });
  assert.equal((await svc.handleCallback(store, env, cb.raw, cb.headers)).phase, "extracted_needs_review");

  const v0 = await svc.caseView(store, USER, c.id);
  assert.deepEqual(v0.story?.riders, ["Accelerated Death Benefit Rider for Chronic Illness", "Overloan Protection Rider"]);

  const req = await svc.requestStory(store, gw, env, USER, c.id, { revision: 1, inputs: { ...inputs, riders: [{ name: "Overloan Protection Rider", show: true }, { name: "Accelerated Death Benefit Rider for Chronic Illness", show: true }] } });
  assert.equal(req.status, "pending");
  const job = gw.last();
  assert.equal(job.stage, "story");
  assert.doesNotMatch(JSON.stringify(job), /Jordan|Spouse/);

  const done = signed({ stage: "story", job_id: job.job_id, case_id: c.id, revision: 1, status: "ok", workflow_version: "policyplan-companion-v1/1.1.0", story: { raw: JSON.stringify(s.story), model: "fixture", attempts: 1 } });
  assert.equal((await svc.handleCallback(store, env, done.raw, done.headers)).phase, "draft_ready");
  const v1 = await svc.caseView(store, USER, c.id);
  const draft = v1.output?.story;
  assert.ok(draft, "story draft in the view");
  assert.equal(draft!.validation.client_release_eligible, true, JSON.stringify(draft!.issues));

  // A bad edit is flagged and blocks approval; fixing it clears the flag.
  const out = v1.output!.id;
  const bad = await svc.saveStoryEdits(store, USER, out, { takeaway: "This is the best and safest plan." });
  assert.equal(bad.validation.client_release_eligible, false);
  await assert.rejects(svc.approveDraft(store, USER, out, { acknowledged: true, name: "Jordan Ellis", revision: 1 }), /validation_failed/);
  await svc.saveStoryEdits(store, USER, out, { takeaway: s.story.design.takeaway });

  const preview = await svc.renderOutput(store, USER, out, "preview");
  assert.match(preview.html, /DRAFT FOR ADVISOR REVIEW/);
  await assert.rejects(svc.renderOutput(store, USER, out, "client"), /not_approved/);

  const ap = await svc.approveDraft(store, USER, out, { acknowledged: true, name: "Jordan Ellis", revision: 1 });
  assert.match(ap.artifact_id, /^PPS-/);
  await assert.rejects(svc.renderOutput(store, USER, out, "client"), /release_gate_closed/);
  const policy: ReleasePolicy = { advisor_id: USER, external_client_export_allowed: true, enhanced_numeric_mode_allowed: false, approved_jurisdictions: [], approved_product_classes: [], approval_reference: "T", effective_at: null, expires_at: null };
  store.policies.set(USER, policy);
  const client = await svc.renderOutput(store, USER, out, "client");
  assert.doesNotMatch(client.html, /DRAFT/);
  assert.match(client.html, /The Story: An Apartment Complex/);
  assert.match(client.html, /You start here · Year 1/);
  assert.match(client.html, /Spouse/);
  assert.match(client.html, /Reviewed by Jordan Ellis/);

  // New inputs after approval start a new revision; the approved copy is retired.
  await svc.requestStory(store, gw, env, USER, c.id, { revision: 1, inputs: { ...inputs, goals: ["accumulation"] } });
  const v2 = await svc.caseView(store, USER, c.id);
  assert.equal(v2.revision, 2);
  assert.equal((await store.getOutput(out))?.status, "superseded");
});

test("a malformed writer answer fails the job instead of leaving it pending", async () => {
  const store = new MemoryStore();
  const gw = new FakeGateway();
  const c = await svc.createCase(store, USER, { sales_jurisdiction: "TX", story_key: "apartment" });
  await svc.submitIllustration(store, gw, env, USER, c.id, { text: s.pagesText, page_count: s.pageCount, document_fingerprint: s.fingerprint, file_size: 1000, kind_confirmed: "proposed_sales", privacy: { removed: {}, worker_warnings: [], names_screened: 1 } });
  const ex = gw.last();
  const cb = signed({ stage: "extract", job_id: ex.job_id, case_id: c.id, revision: 1, status: "ok", extraction: { atlas1: s.atlas1, atlas2_registry: s.atlas2Registry } });
  await svc.handleCallback(store, env, cb.raw, cb.headers);
  await svc.requestStory(store, gw, env, USER, c.id, { revision: 1, inputs });
  const job = gw.last();
  const bad = signed({ stage: "story", job_id: job.job_id, case_id: c.id, revision: 1, status: "ok", story: { raw: "{\"schema\":\"nope\"}" } });
  const r = await svc.handleCallback(store, env, bad.raw, bad.headers);
  assert.equal(r.phase, "failed_retryable");
  // The advisor can generate again from the failed state.
  const again = await svc.requestStory(store, gw, env, USER, c.id, { revision: 1, inputs });
  assert.equal(again.status, "pending");
});

test("sample render has every page", () => {
  const p = playback();
  const g = guardStory(writerToText(s.story, p), p);
  const html = buildStoryHtml(
    { schema_version: "policyplan-story.v1", kind: "story", story_key: "apartment", case_id: "x", revision: 1, document_fingerprint: s.fingerprint, inputs, playback: p, text: g.text, authors: {}, issues: g.issues, validation: { client_release_eligible: true, text_ok: true, numbers_verified: true }, versions: { prompt: "p", template: "t", playback: "pb" }, writer: { model: null, workflow_version: null } },
    null,
    { state: "sample", preparedAt: "2026-11-05T00:00:00Z" },
  );
  for (const re of [/Your Policy Story/, /The Story: An Apartment Complex/, /The Design/, /IMPORTANT INFORMATION/, /Guaranteed and illustrated/, /FICTIONAL DEMONSTRATION/]) assert.match(html, re);
});

test("one submit: PDF text plus form answers, then the story is written as soon as the reading is done", async () => {
  const store = new MemoryStore();
  const gw = new FakeGateway();
  const c = await svc.createCase(store, USER, { sales_jurisdiction: "OH", story_key: "apartment" });
  await svc.submitIllustration(store, gw, env, USER, c.id, {
    text: s.pagesText,
    page_count: s.pageCount,
    document_fingerprint: s.fingerprint,
    file_size: 1000,
    kind_confirmed: "proposed_sales",
    privacy: { removed: {}, worker_warnings: [], names_screened: 1 },
    story_inputs: { story_key: "apartment", goals: ["retirement_income"], riders: [], beneficiary: "Spouse", cover: { prepared_for: "Jordan and Sam" } },
  });
  const v0 = await svc.caseView(store, USER, c.id);
  assert.equal(v0.story?.auto?.status, "waiting");
  const ex = gw.last();
  assert.equal(ex.stage, "extract");
  const cb = signed({ stage: "extract", job_id: ex.job_id, case_id: c.id, revision: 1, status: "ok", extraction: { atlas1: s.atlas1, atlas2_registry: s.atlas2Registry } });
  const r = await svc.handleCallback(store, env, cb.raw, cb.headers, gw);
  assert.equal(r.phase, "analysis_pending");
  const job = gw.last();
  assert.equal(job.stage, "story");
  assert.doesNotMatch(JSON.stringify(job), /Jordan|Spouse/);
  const v1 = await svc.caseView(store, USER, c.id);
  assert.equal(v1.story?.auto?.status, "sent");
  assert.equal(v1.story?.last_inputs?.beneficiary, "Spouse");

  const done = signed({ stage: "story", job_id: job.job_id, case_id: c.id, revision: 1, status: "ok", story: { raw: JSON.stringify(s.story), model: "fixture", attempts: 1 } });
  assert.equal((await svc.handleCallback(store, env, done.raw, done.headers, gw)).phase, "draft_ready");
  const v2 = await svc.caseView(store, USER, c.id);
  assert.deepEqual(v2.output?.story?.playback.riders_shown, ["Accelerated Death Benefit Rider for Chronic Illness", "Overloan Protection Rider"], "every rider shown when none were picked");
});

test("one submit: a gateway failure on the story step is kept and shown, not lost", async () => {
  const store = new MemoryStore();
  const gw = new FakeGateway();
  const c = await svc.createCase(store, USER, { sales_jurisdiction: "OH", story_key: "apartment" });
  await svc.submitIllustration(store, gw, env, USER, c.id, { text: s.pagesText, page_count: s.pageCount, document_fingerprint: s.fingerprint, file_size: 1000, kind_confirmed: "proposed_sales", privacy: { removed: {}, worker_warnings: [], names_screened: 1 }, story_inputs: { story_key: "apartment", goals: [], riders: [], cover: {} } });
  const ex = gw.last();
  const cb = signed({ stage: "extract", job_id: ex.job_id, case_id: c.id, revision: 1, status: "ok", extraction: { atlas1: s.atlas1, atlas2_registry: s.atlas2Registry } });
  const down = { send: async () => ({ ok: false, status: 503 }) };
  await svc.handleCallback(store, env, cb.raw, cb.headers, down);
  const v = await svc.caseView(store, USER, c.id);
  assert.equal(v.story?.auto?.status, "stopped");
  assert.equal(v.story?.auto && "error" in v.story.auto ? v.story.auto.error : null, "workflow_unavailable");
  // The advisor can still create it by hand.
  const again = await svc.requestStory(store, gw, env, USER, c.id, { revision: v.revision, inputs: { story_key: "apartment", goals: [], riders: [], cover: {} } });
  assert.equal(again.status, "pending");
});
