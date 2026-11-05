/**
 * Runs the Companion workflow's own Code-node source (n8n/companion/src) with
 * a mocked n8n runtime, signs the result exactly as the Crypto node does, and
 * feeds it to the app's callback handler. Proves the app and the workflow
 * agree on the contract without a live n8n.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as svc from "../../lib/companion/service";
import { apartmentSample, sampleByKey } from "../../lib/companion/samples";
import { MemoryStore, FakeGateway } from "./memory-store";

const ROOT = join(__dirname, "..", "..", "..");
const src = (f: string) => readFileSync(join(ROOT, "n8n", "companion", "src", f), "utf8");
const SECRET = "n8n-contract-secret";
const env: svc.Env = { callbackUrl: "https://preview.policyplan.example/api/companion/callback", callbackSecret: SECRET };

type Item = { json: Record<string, unknown> };
function runNode(file: string, input: Record<string, unknown>, named: Record<string, Record<string, unknown>>, vars: Record<string, string> = {}): Item[] {
  const $input = { first: () => ({ json: input }), all: () => [{ json: input }] };
  const $ = (name: string) => {
    if (!(name in named)) throw new Error(`no node ${name}`);
    return { first: () => ({ json: named[name] }) };
  };
  // n8n's Code sandbox lacks Node globals such as URL, Buffer and require; shadow them so the
  // workflow source cannot quietly depend on them.
  return new Function("$input", "$", "$vars", "URL", "URLSearchParams", "Buffer", "require", "process", src(file))($input, $, vars, undefined, undefined, undefined, undefined, undefined) as Item[];
}

function deliver(prepared: Record<string, unknown>) {
  const signature = createHmac("sha256", SECRET).update(String(prepared.signing_input)).digest("hex"); // = Crypto node (hmac, SHA256, hex)
  return { raw: String(prepared.raw), headers: { timestamp: String(prepared.ts), signature } };
}

async function startCase() {
  const s = sampleByKey("indexed-ul");
  const store = new MemoryStore();
  const gw = new FakeGateway();
  const c = await svc.createCase(store, "11111111-1111-4111-8111-111111111111", { sales_jurisdiction: "OH" });
  await svc.submitIllustration(store, gw, env, "11111111-1111-4111-8111-111111111111", c.id, {
    text: s.pagesText,
    page_count: s.pageCount,
    document_fingerprint: s.fingerprint,
    file_size: 1000,
    kind_confirmed: "proposed_sales",
    privacy: { removed: {}, worker_warnings: [], names_screened: 1 },
  });
  return { s, store, gw, caseId: c.id, user: "11111111-1111-4111-8111-111111111111" };
}

const VARS = { COMPANION_CALLBACK_HOSTS: "preview.policyplan.example" };

test("gate rejects foreign callback hosts, stale jobs and bad shapes", async () => {
  const { gw } = await startCase();
  const body = gw.last();
  assert.doesNotThrow(() => runNode("companion-gate.js", { body }, {}, VARS));
  assert.throws(() => runNode("companion-gate.js", { body: { ...body, callback_url: "https://evil.example/api/companion/callback" } }, {}, VARS), /callback_host_not_allowed/);
  assert.throws(() => runNode("companion-gate.js", { body: { ...body, callback_url: "http://preview.policyplan.example/api/companion/callback" } }, {}, VARS), /not_https/);
  assert.throws(() => runNode("companion-gate.js", { body: { ...body, issued_at: new Date(Date.now() - 3600_000).toISOString() } }, {}, VARS), /stale_request/);
  assert.throws(() => runNode("companion-gate.js", { body: { ...body, callback_url: "https://user@preview.policyplan.example/api/companion/callback" } }, {}, VARS), /COMPANION_GATE/);
  assert.throws(() => runNode("companion-gate.js", { body: { ...body, callback_url: "https://preview.policyplan.example/api/companion/callback?x=1" } }, {}, VARS), /COMPANION_GATE/);
  assert.equal(runNode("companion-gate.js", { body }, {}, VARS)[0].json.callback_url, "https://preview.policyplan.example/api/companion/callback");
  assert.throws(() => runNode("companion-gate.js", { body: { ...body, job_id: "x" } }, {}, VARS), /ids/);
  assert.throws(() => runNode("companion-gate.js", { body }, {}, {}), /COMPANION_CALLBACK_HOSTS_not_set/);
});

test("extract stage: workflow output is accepted by the app and builds verified evidence", async () => {
  const { s, store, gw, caseId, user } = await startCase();
  const gate = runNode("companion-gate.js", { body: gw.last() }, {}, VARS)[0].json;
  const envelope = { factSpine: s.atlas1, atlas2Parsed: null, atlas2EvidenceRegistry: s.atlas2Registry };
  const result = runNode("extract-result.js", envelope, { "Companion Gate": gate })[0].json;
  const prepared = runNode("prepare-callback.js", result, {})[0].json;
  const { raw, headers } = deliver(prepared);
  const r = await svc.handleCallback(store, env, raw, headers);
  assert.equal(r.phase, "extracted_needs_review");
  const v = await svc.caseView(store, user, caseId);
  assert.equal(v.evidence?.facts.find((f) => f.fact_id === "f.planned_premium_outlay")?.status, "verified");
});

test("write stage: writer check, retry routing, error path and signed delivery", async () => {
  const { s, store, gw, caseId, user } = await startCase();
  // finish extraction
  const g1 = runNode("companion-gate.js", { body: gw.last() }, {}, VARS)[0].json;
  const ex = runNode("extract-result.js", { factSpine: s.atlas1, atlas2EvidenceRegistry: s.atlas2Registry }, { "Companion Gate": g1 })[0].json;
  const d1 = deliver(runNode("prepare-callback.js", ex, {})[0].json);
  await svc.handleCallback(store, env, d1.raw, d1.headers);
  await svc.confirmFacts(store, user, caseId, { revision: 1 });
  await svc.saveBrief(store, user, caseId, s.brief);
  await svc.requestAnalysis(store, gw, env, user, caseId, {});
  const gate = runNode("companion-gate.js", { body: gw.last() }, {}, VARS)[0].json;

  // A fenced or digit-bearing answer is routed to the retry branch.
  const fenced = runNode("writer-check.js", { output: "```json\n{}\n```" }, { "Companion Gate": gate })[0].json;
  assert.equal(fenced.valid, false);
  const digits = JSON.parse(JSON.stringify(s.writer));
  digits.blocks[0].body = "Pay $15,000 a year.";
  assert.match(String(runNode("writer-check.js", { output: JSON.stringify(digits) }, { "Companion Gate": gate })[0].json.reason), /typed_numbers/);

  const good = runNode("writer-check.js", { output: JSON.stringify(s.writer) }, { "Companion Gate": gate })[0].json;
  assert.equal(good.valid, true, String(good.reason));
  const analyst = JSON.stringify({ schema: "companion_analyst.v1", priorities: [], internal_notes: [], verification_questions: ["Was the funding discussed as illustrated?"], blockers: [] });
  const wr = runNode("write-result.js", good, { "Companion Gate": gate, "Companion Analyst": { output: analyst } })[0].json;
  const d2 = deliver(runNode("prepare-callback.js", wr, {})[0].json);
  const r = await svc.handleCallback(store, env, d2.raw, d2.headers);
  assert.equal(r.phase, "draft_ready", JSON.stringify(r));
  const v = await svc.caseView(store, user, caseId);
  assert.equal(v.output?.draft?.validation.client_release_eligible, true);
  assert.ok(v.output?.draft?.internal_review.some((x) => /funding/.test(x)));

  // The error path closes the job instead of leaving it pending.
  await svc.saveBrief(store, user, caseId, { ...s.brief, top_priority: "flexibility" });
  await svc.requestAnalysis(store, gw, env, user, caseId, {});
  const g3 = runNode("companion-gate.js", { body: gw.last() }, {}, VARS)[0].json;
  const failed = runNode("stage-failed.js", { error: { message: "model timeout" } }, { "Companion Gate": g3 })[0].json;
  const d3 = deliver(runNode("prepare-callback.js", failed, {})[0].json);
  assert.equal((await svc.handleCallback(store, env, d3.raw, d3.headers)).phase, "failed_retryable");
  assert.ok(randomUUID());
});

test("story stage: gate, story check, retry routing and signed delivery", async () => {
  const s = apartmentSample();
  const store = new MemoryStore();
  const gw = new FakeGateway();
  const user = "22222222-2222-4222-8222-222222222222";
  const c = await svc.createCase(store, user, { sales_jurisdiction: "OH", story_key: "apartment" });
  await svc.submitIllustration(store, gw, env, user, c.id, { text: s.pagesText, page_count: s.pageCount, document_fingerprint: s.fingerprint, file_size: 1000, kind_confirmed: "proposed_sales", privacy: { removed: {}, worker_warnings: [], names_screened: 1 } });
  const g1 = runNode("companion-gate.js", { body: gw.last() }, {}, VARS)[0].json;
  const ex = runNode("extract-result.js", { factSpine: s.atlas1, atlas2EvidenceRegistry: s.atlas2Registry }, { "Companion Gate": g1 })[0].json;
  const d1 = deliver(runNode("prepare-callback.js", ex, {})[0].json);
  await svc.handleCallback(store, env, d1.raw, d1.headers);
  const inputs = { story_key: "apartment", goals: s.goals, riders: [], cover: {} };
  await svc.requestStory(store, gw, env, user, c.id, { revision: 1, inputs });
  const body = gw.last();
  assert.throws(() => runNode("companion-gate.js", { body: { ...body, story_input: { ...body.story_input as object, schema: "x" } } }, {}, VARS), /story_input/);
  const gate = runNode("companion-gate.js", { body }, {}, VARS)[0].json;
  assert.equal(gate.stage, "story");
  assert.ok(gate.story_input);

  const fenced = runNode("story-check.js", { output: "```json\n{}\n```" }, { "Companion Gate": gate })[0].json;
  assert.equal(fenced.valid, false);
  const noLegacy = JSON.parse(JSON.stringify(s.story));
  noLegacy.story.benefits = noLegacy.story.benefits.filter((b: { key: string }) => b.key !== "legacy");
  assert.match(String(runNode("story-check.js", { output: JSON.stringify(noLegacy) }, { "Companion Gate": gate })[0].json.reason), /missing_benefits:legacy/);

  const good = runNode("story-check.js", { output: JSON.stringify(s.story) }, { "Companion Gate": gate })[0].json;
  assert.equal(good.valid, true, String(good.reason));
  const result = runNode("story-result.js", good, { "Companion Gate": gate })[0].json;
  const d2 = deliver(runNode("prepare-callback.js", result, {})[0].json);
  const r = await svc.handleCallback(store, env, d2.raw, d2.headers);
  assert.equal(r.phase, "draft_ready", JSON.stringify(r));
  const v = await svc.caseView(store, user, c.id);
  assert.equal(v.output?.story?.validation.client_release_eligible, true, JSON.stringify(v.output?.story?.issues));
});
