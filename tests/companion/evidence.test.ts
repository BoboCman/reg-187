import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEvidencePacket, applyCorrections, validatePointers, factMap } from "../../lib/companion/evidence";
import { splitPages, locateLedgerCell, excerptResolves } from "../../lib/companion/pages";
import { SAMPLE_CASES, sampleByKey } from "../../lib/companion/samples";
import { realFixture } from "./helpers";

const build = (key: string) => {
  const s = sampleByKey(key);
  const pages = splitPages(s.pagesText);
  return { s, pages, p: buildEvidencePacket({ atlas1: s.atlas1, atlas2Registry: s.atlas2Registry }, pages, { fingerprint: s.fingerprint, page_count: s.pageCount }) };
};

test("every sample verifies its core facts against its own page text", () => {
  for (const s of SAMPLE_CASES) {
    const { p, pages } = build(s.key);
    const m = factMap(p);
    for (const id of ["f.insurer", "f.product_name", "f.initial_death_benefit", "f.planned_premium_outlay", "f.illustration_date", "f.guarantee_end_age", "f.guarantee_conditions", "f.premium_payment_years"]) {
      assert.equal(m.get(id)?.status, "verified", `${s.key} ${id}`);
    }
    assert.deepEqual(p.blockers, [], s.key);
    assert.deepEqual(validatePointers(p, pages), [], s.key);
    for (const r of p.refs) if (r.page_number && r.text_span) {
      const page = pages.find((x) => x.page_number === r.page_number)!;
      assert.ok(r.text_span.end <= page.text.length, "span inside page");
    }
  }
});

test("net surrender value and policy value are kept apart (gross vs net)", () => {
  const { p } = build("indexed-ul");
  const m = factMap(p);
  const sv5 = m.get("f.ledger.y5.sv_current")!;
  const row = p.ledger.find((r) => r.policy_year === 5)!;
  assert.equal(sv5.value, row.sv_current);
  const ref = p.refs.find((r) => r.evidence_id === sv5.source_refs[0])!;
  assert.equal(ref.measure_identity, "net_surrender_value");
  assert.equal(ref.scenario_id, "current");
});

test("zero and Lapse ledger cells verify only by column position", () => {
  const { s, pages } = build("indexed-ul");
  const cols = (s.atlas1 as any).ledger_table.columns as string[];
  const lapsedRow = (s.atlas1 as any).ledger_table.rows.find((r: any) => r.db_guaranteed == null);
  assert.ok(lapsedRow, "fixture has a lapsed guaranteed row");
  assert.ok(locateLedgerCell(pages, cols, lapsedRow.year, lapsedRow.age, "db_guaranteed", null));
  assert.equal(locateLedgerCell(pages, cols, lapsedRow.year, lapsedRow.age, "db_guaranteed", 123456), null);
});

test("survivorship: second insured ages and the guarantee's life basis are explicit", () => {
  const { p } = build("survivorship");
  assert.equal(p.insured_structure, "survivorship");
  const m = factMap(p);
  assert.equal(m.get("f.issue_age_insured_1")?.value, 67);
  assert.equal(m.get("f.issue_age_insured_2")?.value, 64);
  assert.match(m.get("f.guarantee_end_age")!.age_basis!, /younger/);
});

test("survivorship guarantee endpoint without a stated life basis needs review", () => {
  const s = sampleByKey("survivorship");
  const a1 = JSON.parse(JSON.stringify(s.atlas1));
  a1.nlg.age_basis = "unstated";
  a1.ledger.context.age_basis = "unstated";
  const pages = splitPages(s.pagesText);
  const p = buildEvidencePacket({ atlas1: a1, atlas2Registry: s.atlas2Registry }, pages, { fingerprint: s.fingerprint, page_count: s.pageCount });
  assert.equal(factMap(p).get("f.guarantee_end_age")?.status, "needs_review");
});

test("extractor values that are not in the page text are never verified", () => {
  const s = sampleByKey("guaranteed-ul");
  const a1 = JSON.parse(JSON.stringify(s.atlas1));
  a1.chassis.face_amount = 800000; // invented
  a1.provenance.carrier = "Imaginary Carrier Co";
  const pages = splitPages(s.pagesText);
  const p = buildEvidencePacket({ atlas1: a1, atlas2Registry: s.atlas2Registry }, pages, { fingerprint: s.fingerprint, page_count: s.pageCount });
  const m = factMap(p);
  assert.equal(m.get("f.initial_face_amount")?.status, "needs_review");
  assert.equal(m.get("f.insurer")?.status, "needs_review");
});

test("conflicting premium sources are marked contradictory and block release", () => {
  const s = sampleByKey("guaranteed-ul");
  const a1 = JSON.parse(JSON.stringify(s.atlas1));
  a1.premiums.annualized = 12000;
  a1.premiums.scheduled = 12000;
  const pages = splitPages(s.pagesText);
  const p = buildEvidencePacket({ atlas1: a1, atlas2Registry: s.atlas2Registry }, pages, { fingerprint: s.fingerprint, page_count: s.pageCount });
  assert.equal(factMap(p).get("f.planned_premium_outlay")?.status, "contradictory");
  assert.ok(p.blockers.some((b) => b.includes("f.planned_premium_outlay")));
});

test("in-force illustrations and term products are blocked as unsupported", () => {
  const s = sampleByKey("guaranteed-ul");
  const pages = splitPages(s.pagesText);
  const inforce = JSON.parse(JSON.stringify(s.atlas1));
  inforce.provenance.illustration_type = "In Force";
  inforce.provenance.policy_years_in_force = 6;
  assert.ok(buildEvidencePacket({ atlas1: inforce }, pages, { fingerprint: s.fingerprint, page_count: s.pageCount }).blockers.includes("unsupported_in_force"));
  // An "In-Force" label alone, on a ledger that starts at year 1 with no years in force, is a new-business illustration.
  const labelOnly = JSON.parse(JSON.stringify(s.atlas1));
  labelOnly.provenance.illustration_type = "In-Force";
  labelOnly.provenance.policy_years_in_force = null;
  labelOnly.provenance.ledger_start_year = 1;
  const proposalPages = pages.map((pg, i) => (i === 0 ? { ...pg, text: "Prepared For: Client " + pg.text } : pg));
  const lp = buildEvidencePacket({ atlas1: labelOnly }, proposalPages, { fingerprint: s.fingerprint, page_count: s.pageCount });
  assert.ok(!lp.blockers.includes("unsupported_in_force"), JSON.stringify(lp.blockers));
  assert.equal(lp.document_kind, "proposed_sales");
  const term = JSON.parse(JSON.stringify(s.atlas1));
  term.chassis.type = "Term";
  term.chassis.subtype = "level term";
  assert.ok(buildEvidencePacket({ atlas1: term }, pages, { fingerprint: s.fingerprint, page_count: s.pageCount }).blockers.includes("unsupported_product_class"));
});

test("missing extraction fails closed", () => {
  const p = buildEvidencePacket({ atlas1: null }, [], { fingerprint: "x".repeat(64), page_count: 0 });
  assert.ok(p.blockers.includes("extraction_missing"));
});

test("a producer correction is verified only when the value is on the cited page", () => {
  const { p, pages } = build("guaranteed-ul");
  const good = applyCorrections(p, [{ fact_id: "f.initial_face_amount", value: 750000, reason: "Confirmed on summary page", source_page: 1, by: "u", at: "t" }], pages);
  assert.equal(factMap(good).get("f.initial_face_amount")?.status, "verified");
  const bad = applyCorrections(p, [{ fact_id: "f.initial_face_amount", value: 900000, reason: "Typed from memory", source_page: 1, by: "u", at: "t" }], pages);
  const f = factMap(bad).get("f.initial_face_amount")!;
  assert.equal(f.status, "needs_review");
  assert.equal(f.corrected?.original_value, 750000);
});

test("real test illustration (if available): core facts verified, page pointers resolve", (t) => {
  const fx = realFixture();
  if (!fx) return t.skip("COMPANION_FIXTURE_DIR not set");
  const pages = splitPages(fx.text);
  const p = buildEvidencePacket({ atlas1: fx.atlas1, atlas2: fx.atlas2, atlas2Registry: fx.atlas2Registry }, pages, { fingerprint: "f".repeat(64), page_count: pages.length });
  const m = factMap(p);
  assert.equal(p.product_class, "IUL");
  assert.equal(p.document_kind, "proposed_sales");
  for (const id of ["f.insurer", "f.product_name", "f.initial_death_benefit", "f.planned_premium_outlay", "f.guarantee_end_age", "f.premium_payment_years", "f.guaranteed_scenario_coverage_through_age"]) assert.equal(m.get(id)?.status, "verified", id);
  assert.equal(m.get("f.planned_premium_outlay")?.value, 22575);
  assert.equal(m.get("f.guarantee_end_age")?.value, 86);
  assert.equal(m.get("f.guaranteed_scenario_coverage_through_age")?.value, 86);
  assert.equal(m.get("f.ledger.y10.sv_current")?.value, 146750);
  assert.equal(m.get("f.ledger.y10.sv_guaranteed")?.value, 0);
  assert.deepEqual(validatePointers(p, pages), []);
  for (const r of p.refs.filter((x) => x.page_number && x.raw_excerpt_redacted && x.evidence_type !== "guarantee_provision"))
    assert.ok(excerptResolves(pages, r.page_number!, r.raw_excerpt_redacted!), `excerpt ${r.evidence_id} resolves`);
});
