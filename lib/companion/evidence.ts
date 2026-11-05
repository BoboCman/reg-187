/**
 * Evidence builder: ATLAS-1 / ATLAS-2 extraction + redacted pages → typed facts
 * with source pointers. Deterministic. No model calls, no prose.
 *
 * A fact is `verified` only when its value is located in the exact
 * model-facing page text (or derived by a documented formula from verified
 * ledger rows). Anything else is `needs_review`, `not_found` or
 * `contradictory`, and the planner will not put it in front of a client.
 */
import {
  VERSIONS,
  type DocumentKind,
  type EvidenceKind,
  type EvidencePacket,
  type EvidenceStatus,
  type ExtractedFact,
  type FactUnit,
  type ProductClass,
  type ScenarioId,
  type SourceRef,
} from "./contracts";
import {
  excerptResolves,
  locate,
  locateLedgerCell,
  locateLedgerValue,
  moneyNeedles,
  normalize,
  parsePageList,
  percentNeedles,
  type Located,
  type SourcePage,
} from "./pages";

/* ── tiny safe readers for untrusted JSON ─────────────────────────────── */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
function g(o: unknown, path: string): unknown {
  let cur: unknown = o;
  for (const k of path.split(".")) {
    if (!isObj(cur)) return undefined;
    cur = cur[k];
  }
  return cur;
}
const BLANKS = new Set(["", "n/a", "na", "not shown", "none", "null", "—", "-", "unknown", "not stated"]);
function str(v: unknown): string | null {
  if (typeof v !== "string") return typeof v === "number" ? String(v) : null;
  const t = v.trim();
  return BLANKS.has(t.toLowerCase()) ? null : t;
}
function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^-?[\d,]+(\.\d+)?$/.test(v.trim())) return Number(v.replace(/,/g, ""));
  return null;
}
const yes = (v: unknown) => typeof v === "string" && /^yes\b/i.test(v.trim());
const no = (v: unknown) => typeof v === "string" && /^no\b/i.test(v.trim());

export type AtlasInput = {
  atlas1: unknown; // Light Middleware `atlas_parsed` (fact spine)
  atlas2?: unknown; // `atlas2Parsed`
  atlas2Registry?: unknown; // `atlas2EvidenceRegistry`
};

type Ctx = {
  pages: SourcePage[];
  docId: string;
  refs: SourceRef[];
  facts: ExtractedFact[];
  warnings: string[];
  blockers: string[];
};

function addRef(ctx: Ctx, r: Omit<SourceRef, "evidence_id" | "source_document_id">): string {
  const id = `e.${ctx.refs.length + 1}`;
  ctx.refs.push({ evidence_id: id, source_document_id: r.evidence_type === "client_declaration" ? null : ctx.docId, ...r });
  return id;
}

function refFromLocated(
  ctx: Ctx,
  loc: Located,
  kind: EvidenceKind,
  extra: Partial<SourceRef> = {},
): string {
  return addRef(ctx, {
    page_number: loc.page_number,
    text_span: { start: loc.start, end: loc.end },
    raw_excerpt_redacted: loc.excerpt.slice(0, 380),
    evidence_type: kind,
    verification_status: "verified",
    ...extra,
  });
}

function addFact(
  ctx: Ctx,
  f: {
    key: string;
    label: string;
    value: ExtractedFact["value"];
    unit: FactUnit;
    refs?: string[];
    status: EvidenceStatus;
    material: boolean;
    scenario?: ScenarioId;
    year?: number;
    ageBasis?: string;
    notes?: string[];
  },
): ExtractedFact {
  const fact: ExtractedFact = {
    fact_id: `f.${f.key}`,
    semantic_key: f.key.replace(/\..*$/, ""),
    label: f.label,
    value: f.value,
    unit: f.unit,
    source_refs: f.refs ?? [],
    status: f.status,
    material: f.material,
    ...(f.scenario ? { scenario_id: f.scenario } : {}),
    ...(f.year ? { policy_year: f.year } : {}),
    ...(f.ageBasis ? { age_basis: f.ageBasis } : {}),
    ...(f.notes && f.notes.length ? { notes: f.notes.slice(0, 6).map((n) => n.slice(0, 300)) } : {}),
  };
  ctx.facts = ctx.facts.filter((x) => x.fact_id !== fact.fact_id);
  ctx.facts.push(fact);
  return fact;
}

/** Locates a text value; verified when found, needs_review when extracted but not found. */
function textFact(
  ctx: Ctx,
  key: string,
  label: string,
  value: string | null,
  material: boolean,
  opts: { needles?: string[]; pages?: number[]; kind?: EvidenceKind; measure?: string } = {},
) {
  if (!value) return addFact(ctx, { key, label, value: null, unit: "text", status: "not_found", material });
  const loc = locate(ctx.pages, opts.needles ?? [value], opts.pages);
  if (!loc)
    return addFact(ctx, {
      key,
      label,
      value,
      unit: "text",
      status: "needs_review",
      material,
      notes: ["Extracted value was not found in the page text."],
    });
  const ref = refFromLocated(ctx, loc, opts.kind ?? "illustration_fact", { measure_identity: opts.measure ?? key });
  return addFact(ctx, { key, label, value, unit: "text", refs: [ref], status: "verified", material });
}

function moneyFact(
  ctx: Ctx,
  key: string,
  label: string,
  value: number | null,
  material: boolean,
  opts: { pages?: number[]; measure?: string; scenario?: ScenarioId; year?: number } = {},
) {
  if (value == null) return addFact(ctx, { key, label, value: null, unit: "usd", status: "not_found", material });
  const loc = locate(ctx.pages, moneyNeedles(value), opts.pages);
  if (!loc)
    return addFact(ctx, {
      key,
      label,
      value,
      unit: "usd",
      status: "needs_review",
      material,
      scenario: opts.scenario,
      year: opts.year,
      notes: ["Extracted amount was not found in the page text."],
    });
  const ref = refFromLocated(ctx, loc, "illustration_fact", {
    measure_identity: opts.measure ?? key,
    ...(opts.scenario ? { scenario_id: opts.scenario } : {}),
    ...(opts.year ? { policy_year: opts.year } : {}),
  });
  return addFact(ctx, { key, label, value, unit: "usd", refs: [ref], status: "verified", material, scenario: opts.scenario, year: opts.year });
}

/* ── ledger ───────────────────────────────────────────────────────────── */

type LedgerRow = EvidencePacket["ledger"][number];

type Ledger = { rows: LedgerRow[]; pages: number[]; complete: boolean; columns: string[] };

function firstNum(r: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = num(r[k]);
    if (v != null) return v;
  }
  return null;
}

function readLedger(atlas1: unknown, ctx: Ctx): Ledger {
  const lt = g(atlas1, "ledger_table");
  const pages = parsePageList(g(lt, "pages"));
  const raw = Array.isArray(g(lt, "rows")) ? (g(lt, "rows") as unknown[]) : [];
  const rows: LedgerRow[] = [];
  for (const r of raw) {
    if (!isObj(r) || r.valid === false) continue;
    const year = num(r.year);
    if (!year || year < 1 || year > 130) continue;
    const dbG = num(r.db_guaranteed);
    const lapsedCells = Array.isArray(r.lapsed_cells) ? (r.lapsed_cells as unknown[]) : [];
    rows.push({
      policy_year: year,
      age: num(r.age),
      premium: num(r.premium),
      sv_guaranteed: num(r.sv_guaranteed),
      db_guaranteed: dbG,
      sv_current: num(r.sv_current),
      db_current: num(r.db_current),
      lapsed_guaranteed: lapsedCells.includes("db_guaranteed") || dbG == null || dbG <= 0,
      cv_current: num(r.cv_current),
      distribution: firstNum(r, ["net_distribution", "distribution", "income", "annual_income", "withdrawal", "loan", "policy_loan"]),
    });
  }
  rows.sort((a, b) => a.policy_year - b.policy_year);
  const stated = g(lt, "complete");
  const contiguous = rows.every((r, i) => i === 0 || r.policy_year === rows[i - 1].policy_year + 1);
  const complete = yes(stated) && g(lt, "truncated") !== true && contiguous && rows.length > 0 && rows[0].policy_year === 1;
  if (!complete) ctx.warnings.push("The extracted ledger is incomplete, so the payment horizon and coverage horizons need checking.");
  for (const issue of Array.isArray(g(lt, "issues")) ? (g(lt, "issues") as unknown[]) : []) {
    if (typeof issue === "string") ctx.warnings.push(`Ledger: ${issue}`);
  }
  const columns = ((g(lt, "columns") as unknown[]) ?? []).filter((c): c is string => typeof c === "string");
  return { rows, pages, complete, columns };
}

function ledgerFact(
  ctx: Ctx,
  key: string,
  label: string,
  row: LedgerRow | undefined,
  field: "premium" | "sv_guaranteed" | "db_guaranteed" | "sv_current" | "db_current",
  ledger: Ledger,
  material: boolean,
  ageBasis: string,
) {
  const pages = ledger.pages;
  const scenario: ScenarioId | undefined = field.endsWith("guaranteed") ? "guaranteed" : field.endsWith("current") ? "current" : undefined;
  if (!row || row[field] == null)
    return addFact(ctx, { key, label, value: null, unit: "usd", status: "not_found", material, scenario, year: row?.policy_year });
  const value = row[field] as number;
  const loc =
    locateLedgerCell(ctx.pages, ledger.columns, row.policy_year, row.age, field, value, pages) ??
    (value === 0 ? null : locateLedgerValue(ctx.pages, row.policy_year, row.age, value, pages));
  if (!loc) {
    // Zeros are not proof of anything on their own; keep them out of client copy.
    return addFact(ctx, {
      key,
      label,
      value,
      unit: "usd",
      status: "needs_review",
      material,
      scenario,
      year: row.policy_year,
      ageBasis,
      notes: [value === 0 ? "A zero ledger value is not shown to clients without a source check." : "Ledger value was not found in its row."],
    });
  }
  const ref = refFromLocated(ctx, loc, "ledger_value", {
    table_id: "ledger",
    row_id: `Y${row.policy_year}`,
    policy_year: row.policy_year,
    ...(scenario ? { scenario_id: scenario } : {}),
    measure_identity:
      field === "premium" ? "planned_premium_outlay" : field.startsWith("sv") ? "net_surrender_value" : "total_death_benefit",
    age_basis: ageBasis,
  });
  return addFact(ctx, { key, label, value, unit: "usd", refs: [ref], status: "verified", material, scenario, year: row.policy_year, ageBasis });
}

/* ── classification ───────────────────────────────────────────────────── */

export function classifyProduct(atlas1: unknown, pages: SourcePage[]): ProductClass {
  const t = (str(g(atlas1, "chassis.type")) ?? "").toUpperCase();
  const sub = (str(g(atlas1, "chassis.subtype")) ?? "").toLowerCase();
  const all = pages.map((p) => p.text).join(" ").toLowerCase();
  if (/annuity/.test(sub)) return "UNKNOWN";
  if (t.includes("IUL") || /index/.test(sub)) return "IUL";
  if (t.includes("VUL") || /variable/.test(sub)) return "VUL";
  if (t === "WL" || t.includes("WHOLE")) return "WL";
  if (t.includes("TERM")) return "TERM";
  if (t.includes("GUL") || /guaranteed universal/.test(sub) || /guaranteed universal life/.test(all)) return "GUL";
  if (t.includes("UL") || /universal life/.test(sub)) return "UL";
  return "UNKNOWN";
}

export function classifyDocument(atlas1: unknown, pages: SourcePage[]): DocumentKind {
  const t = (str(g(atlas1, "provenance.illustration_type")) ?? "").toLowerCase();
  const inForceYears = num(g(atlas1, "provenance.policy_years_in_force")) ?? 0;
  const firstPages = pages.slice(0, 6).map((p) => p.text).join(" ").toLowerCase();
  const completed = num(g(atlas1, "dashboard_facts.policy_position.completed_policy_years_in_force")) ?? 0;
  const ledgerStart = num(g(atlas1, "provenance.ledger_start_year")) ?? 1;
  const textSaysInForce = /\bin[- ]?force (?:ledger|illustration|projection)\b|\bpolicy (?:has been )?in force since\b|\bcurrent policy year\b/.test(firstPages);
  // The extractor sometimes labels a new-business illustration "In-Force" (its prompt was
  // written for policy reviews). Trust that label only with evidence of an existing policy:
  // years already in force, a ledger that starts after year 1, or the pages saying so.
  if (inForceYears > 0 || completed > 0 || ledgerStart > 1 || textSaysInForce) return "in_force";
  if (/in[- ]?force/.test(t)) return /prepared for|proposal|new business|basic illustration|sales illustration/.test(firstPages) ? "proposed_sales" : "unknown";
  if (/revised/.test(t)) return "revised_sales";
  if (/new|sales|proposal|issue/.test(t)) return "proposed_sales";
  return "unknown";
}

function insuredStructure(atlas1: unknown, pages: SourcePage[]): EvidencePacket["insured_structure"] {
  const multi = g(atlas1, "provenance.multi_life");
  const count = num(g(atlas1, "provenance.insured_count")) ?? 1;
  const text = (str(g(atlas1, "chassis.subtype")) ?? "") + " " + pages.slice(0, 8).map((p) => p.text).join(" ");
  if (no(multi) && count <= 1) return "single";
  if (/survivorship|second[- ]to[- ]die|last survivor/i.test(text)) return "survivorship";
  if (/first[- ]to[- ]die|joint first/i.test(text)) return "joint_first_death";
  return count > 1 ? "unknown" : "single";
}

function dateNeedles(iso: string): string[] {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return [iso];
  const [, y, mo, d] = m;
  const month = new Date(Date.UTC(+y, +mo - 1, +d)).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  return [`${+mo}/${+d}/${y}`, `${mo}/${d}/${y}`, `${month} ${+d}, ${y}`, `${+mo}/${+d}/${y.slice(2)}`, iso];
}

/* ── main ─────────────────────────────────────────────────────────────── */

export function buildEvidencePacket(
  input: AtlasInput,
  pages: SourcePage[],
  doc: { fingerprint: string; page_count: number },
  now = new Date().toISOString(),
): EvidencePacket {
  const a1 = input.atlas1;
  const ctx: Ctx = { pages, docId: `doc:${doc.fingerprint.slice(0, 16)}`, refs: [], facts: [], warnings: [], blockers: [] };

  if (!isObj(a1) || !isObj(g(a1, "chassis"))) {
    ctx.blockers.push("extraction_missing");
    return finish(ctx, doc, "unknown", "UNKNOWN", "unknown", input, [], now);
  }
  if (g(a1, "_metadata.truncated") === true) {
    ctx.blockers.push("extraction_truncated");
    ctx.warnings.push("The extractor's output was cut off; re-run the extraction.");
  }
  for (const f of (g(a1, "_metadata.validation.missing_critical_fields") as unknown[]) ?? []) {
    if (typeof f === "string") ctx.warnings.push(`Extractor reported a missing critical field: ${f}`);
  }
  for (const n of (g(a1, "_metadata.diagnostics.scenario_completeness.notes") as unknown[]) ?? []) {
    if (typeof n === "string") ctx.warnings.push(n);
  }

  const docKind = classifyDocument(a1, pages);
  const pclass = classifyProduct(a1, pages);
  const structure = insuredStructure(a1, pages);
  const ageBasis =
    structure === "single"
      ? "insured_1_attained_age"
      : (str(g(a1, "nlg.age_basis")) ?? str(g(a1, "ledger.context.age_basis")) ?? "unstated").slice(0, 60);

  if (docKind === "in_force") ctx.blockers.push("unsupported_in_force");
  if (pclass === "TERM" || pclass === "UNKNOWN") ctx.blockers.push("unsupported_product_class");
  if (structure === "unknown") ctx.warnings.push("The number of insured lives and the benefit trigger could not be determined.");

  // Identity
  const insurer = str(g(a1, "provenance.carrier"));
  textFact(ctx, "insurer", "Insurer", insurer, true);
  const product = str(g(a1, "provenance.product"));
  textFact(ctx, "product_name", "Product", product, true, {
    needles: product ? [product, product.replace(/\s*-\s*[A-Z]{2,4}$/, "")] : [],
  });
  const subtype = str(g(a1, "chassis.subtype"));
  const pcRef = subtype ? locate(pages, [subtype]) : null;
  addFact(ctx, {
    key: "product_class",
    label: "Policy type",
    value: pclass,
    unit: "text",
    refs: pcRef ? [refFromLocated(ctx, pcRef, "illustration_fact", { measure_identity: "product_class" })] : [],
    status: pclass === "UNKNOWN" ? "not_found" : pcRef ? "verified" : "needs_review",
    material: true,
    notes: subtype ? [`Carrier description: ${subtype}`] : undefined,
  });
  addFact(ctx, {
    key: "document_kind",
    label: "Illustration type",
    value: docKind,
    unit: "text",
    status: docKind === "unknown" ? "needs_review" : "verified",
    material: true,
    notes: [`Extractor label: ${str(g(a1, "provenance.illustration_type")) ?? "not shown"}`, "The producer confirms this on upload."],
  });
  addFact(ctx, {
    key: "insured_structure",
    label: "Insured lives",
    value: structure,
    unit: "text",
    status: structure === "unknown" ? "needs_review" : "verified",
    material: true,
  });
  const illDate = str(g(a1, "provenance.illustration_date"));
  if (illDate) {
    const loc = locate(pages, dateNeedles(illDate));
    addFact(ctx, {
      key: "illustration_date",
      label: "Illustration date",
      value: illDate,
      unit: "date",
      refs: loc ? [refFromLocated(ctx, loc, "illustration_fact", { measure_identity: "illustration_date" })] : [],
      status: loc ? "verified" : "needs_review",
      material: true,
    });
  } else addFact(ctx, { key: "illustration_date", label: "Illustration date", value: null, unit: "date", status: "not_found", material: true });

  if (structure === "single") {
    const age = num(g(a1, "provenance.issue_age")) ?? num(g(a1, "provenance.stated_issue_age"));
    const loc = age != null ? locate(pages, [`Age ${age}`, `Issue Age ${age}`, `Age: ${age}`]) : null;
    addFact(ctx, {
      key: "issue_age",
      label: "Insured's issue age",
      value: age,
      unit: "age",
      refs: loc ? [refFromLocated(ctx, loc, "illustration_fact", { measure_identity: "issue_age", age_basis: ageBasis })] : [],
      status: age == null ? "not_found" : loc ? "verified" : "needs_review",
      material: false,
      ageBasis,
    });
  } else {
    for (const [i, path] of [
      [1, "provenance.first_insured_stated_issue_age"],
      [2, "provenance.second_insured_stated_issue_age"],
    ] as const) {
      const age = num(g(a1, path));
      const loc = age != null ? locate(pages, [`Age ${age}`, `Issue Age ${age}`, `Age: ${age}`]) : null;
      addFact(ctx, {
        key: `issue_age_insured_${i}`,
        label: `Insured ${i} issue age`,
        value: age,
        unit: "age",
        refs: loc ? [refFromLocated(ctx, loc, "illustration_fact", { measure_identity: "issue_age", age_basis: `insured_${i}` })] : [],
        status: age == null ? "not_found" : loc ? "verified" : "needs_review",
        material: false,
        ageBasis: `insured_${i}`,
      });
    }
  }
  textFact(ctx, "underwriting_class", "Underwriting class illustrated", str(g(a1, "provenance.issue_class")), false);

  // Coverage
  const compPages = ((g(a1, "chassis.coverage_components") as unknown[]) ?? []).flatMap((c) => parsePageList(g(c, "pages")));
  const face = num(g(a1, "chassis.face_amount")) ?? num(g(a1, "chassis.specified_amount"));
  moneyFact(ctx, "initial_face_amount", "Initial face (specified) amount", face, true, { pages: compPages, measure: "initial_face_amount" });

  const ledger = readLedger(a1, ctx);
  const row1 = ledger.rows.find((r) => r.policy_year === 1);
  ledgerFact(ctx, "initial_death_benefit", "Illustrated initial death benefit", row1, "db_current", ledger, true, ageBasis);
  const idb = ctx.facts.find((f) => f.fact_id === "f.initial_death_benefit");
  if (idb && idb.status === "needs_review" && typeof idb.value === "number") {
    // Many illustrations print "Initial Death Benefit: $X" in the header.
    const loc = locate(pages, moneyNeedles(idb.value).map((n) => `Initial Death Benefit: ${n.startsWith("$") ? n : "$" + n}`));
    if (loc) {
      idb.status = "verified";
      idb.source_refs = [refFromLocated(ctx, loc, "illustration_fact", { measure_identity: "initial_total_death_benefit" })];
      idb.notes = undefined;
    }
  }

  const dbOpt = str(g(a1, "chassis.db_option"));
  textFact(ctx, "death_benefit_option", "Death benefit option", dbOpt, false, {
    needles: dbOpt ? [`Death Benefit Option ${dbOpt}`, `Death Benefit Option: ${dbOpt}`, `Option ${dbOpt}`] : [],
  });

  const comps = ((g(a1, "chassis.coverage_components") as unknown[]) ?? []).filter(isObj);
  const termComps = comps.filter((c) => /term/i.test(String(c.role ?? "")) || /term/i.test(String(c.label ?? "")));
  const termAmt = num(g(a1, "chassis.term_rider_amount")) ?? termComps.reduce((s, c) => s + (num(c.amount) ?? 0), 0);
  if (termAmt && termAmt > 0) {
    moneyFact(ctx, "term_coverage_amount", "Term or temporary coverage included", termAmt, true, { pages: compPages, measure: "term_rider_amount" });
  }
  const recon = str(g(a1, "chassis.coverage_reconciliation"));
  if (recon && !/^reconciled$/i.test(recon)) ctx.warnings.push(`Coverage components do not reconcile: ${recon}`);

  // Premiums (from the scenario-locked ledger; cross-checked with the premium block)
  ledgerFact(ctx, "planned_premium_outlay", "Planned illustrated premium outlay (year 1)", row1, "premium", ledger, true, ageBasis);
  const ppo = ctx.facts.find((f) => f.fact_id === "f.planned_premium_outlay")!;
  const scheduled = num(g(a1, "premiums.annualized")) ?? num(g(a1, "premiums.scheduled"));
  if (typeof ppo.value === "number" && scheduled != null && Math.abs(scheduled - ppo.value) > 1) {
    ppo.status = "contradictory";
    ppo.notes = [`Premium block says ${scheduled}; the year-1 ledger outlay is ${ppo.value}.`];
  }
  const mode = str(g(a1, "premiums.mode"));
  textFact(ctx, "premium_mode", "Premium frequency", mode, false, { needles: mode ? [`${mode} Frequency`, `Frequency ${mode}`, mode] : [] });

  derivePremiumSchedule(ctx, ledger, ageBasis, a1);
  deriveCoverageHorizons(ctx, ledger, ageBasis);

  // Guarantee provision
  buildGuarantee(ctx, a1, input, structure, ageBasis);

  // Assumptions
  const rate = num(g(a1, "scenarios.primary_rate")) ?? num(g(a1, "product_specific.iul.illustrated_rate"));
  if (rate != null) {
    const loc = locate(pages, percentNeedles(rate), ledger.pages);
    addFact(ctx, {
      key: "illustrated_rate",
      label: pclass === "WL" ? "Illustrated dividend interest rate" : pclass === "VUL" ? "Illustrated gross return" : "Illustrated interest rate",
      value: rate,
      unit: "percent",
      refs: loc ? [refFromLocated(ctx, loc, "illustration_fact", { measure_identity: "illustrated_rate", scenario_id: "current" })] : [],
      status: loc ? "verified" : "needs_review",
      material: true,
      scenario: "current",
    });
  }
  const gRate = num(g(a1, "scenarios.guaranteed_rate"));
  if (gRate != null) {
    const loc = locate(pages, percentNeedles(gRate), ledger.pages);
    addFact(ctx, {
      key: "guaranteed_rate",
      label: "Guaranteed minimum rate used in the guaranteed columns",
      value: gRate,
      unit: "percent",
      refs: loc ? [refFromLocated(ctx, loc, "illustration_fact", { measure_identity: "guaranteed_rate", scenario_id: "guaranteed" })] : [],
      status: loc ? "verified" : "needs_review",
      material: false,
      scenario: "guaranteed",
    });
  }
  const alt = num(g(a1, "scenarios.alternate_rate"));
  if (alt != null) {
    const loc = locate(pages, percentNeedles(alt));
    addFact(ctx, {
      key: "alternate_rate",
      label: "Alternate illustrated rate",
      value: alt,
      unit: "percent",
      refs: loc ? [refFromLocated(ctx, loc, "illustration_fact", { measure_identity: "alternate_rate", scenario_id: "alternate" })] : [],
      status: loc ? "verified" : "needs_review",
      material: false,
      scenario: "alternate",
    });
  }
  if (pclass === "WL") {
    const divOpt = str(g(a1, "chassis.dividend_option"));
    textFact(ctx, "dividend_option", "Dividend option illustrated", divOpt, true);
  }

  // Surrender charges and early values
  const scEnd = num(g(a1, "surrender.charge_end_year"));
  if (scEnd != null) {
    const sched = str(g(a1, "surrender.schedule")) ?? "";
    const first = sched.match(/1\s+([\d,]+)/);
    const firstAmt = first ? Number(first[1].replace(/,/g, "")) : null;
    const loc = firstAmt ? locate(pages, moneyNeedles(firstAmt)) : null;
    addFact(ctx, {
      key: "surrender_charge_end_year",
      label: "Last policy year with a surrender charge",
      value: scEnd,
      unit: "policy_year",
      refs: loc ? [refFromLocated(ctx, loc, "illustration_fact", { measure_identity: "surrender_charge_schedule" })] : [],
      status: loc ? "verified" : "needs_review",
      material: false,
      notes: loc ? undefined : ["The surrender-charge schedule was not located in the page text."],
    });
  }

  // Milestones (internal review; client use only in approved numbers mode)
  const milestoneYears = [1, 5, 10, 20];
  for (const y of milestoneYears) {
    const row = ledger.rows.find((r) => r.policy_year === y);
    if (!row) continue;
    ledgerFact(ctx, `ledger.y${y}.sv_current`, `Year ${y} net surrender value (illustrated)`, row, "sv_current", ledger, false, ageBasis);
    ledgerFact(ctx, `ledger.y${y}.sv_guaranteed`, `Year ${y} net surrender value (guaranteed)`, row, "sv_guaranteed", ledger, false, ageBasis);
    ledgerFact(ctx, `ledger.y${y}.db_current`, `Year ${y} death benefit (illustrated)`, row, "db_current", ledger, false, ageBasis);
    ledgerFact(ctx, `ledger.y${y}.db_guaranteed`, `Year ${y} death benefit (guaranteed)`, row, "db_guaranteed", ledger, false, ageBasis);
    cumulativeOutlay(ctx, ledger, y);
  }

  // Riders (names only, each located)
  const riders = ((g(a1, "riders.included_array") as unknown[]) ?? []).map(str).filter((x): x is string => !!x);
  const located: string[] = [];
  const riderRefs: string[] = [];
  for (const r of riders.slice(0, 10)) {
    const loc = locate(pages, [r, r.replace(/ Rider$/i, "")]);
    if (loc) {
      located.push(r);
      riderRefs.push(refFromLocated(ctx, loc, "illustration_fact", { measure_identity: "rider_name" }));
    }
  }
  addFact(ctx, {
    key: "riders_included",
    label: "Riders included in the illustration",
    value: located,
    unit: "list",
    refs: riderRefs,
    status: riders.length === 0 ? "not_found" : located.length === riders.length ? "verified" : "needs_review",
    material: false,
    notes: located.length < riders.length ? [`${riders.length - located.length} rider name(s) could not be located and are left out.`] : undefined,
  });

  // Distributions / loans in the sales scenario
  const dist = g(a1, "distributions.illustrated");
  addFact(ctx, {
    key: "distributions_illustrated",
    label: "Loans or withdrawals illustrated",
    value: yes(dist) ? true : no(dist) ? false : null,
    unit: "bool",
    status: yes(dist) || no(dist) ? "verified" : "not_found",
    material: true,
    notes: str(g(a1, "distributions.notes")) ? [String(g(a1, "distributions.notes")).slice(0, 280)] : undefined,
  });
  if (yes(dist)) {
    const raw = str(g(a1, "distributions.schedule_raw"));
    addFact(ctx, {
      key: "distribution_schedule",
      label: "Illustrated loans or withdrawals",
      value: raw ? raw.slice(0, 280) : null,
      unit: "text",
      status: raw ? "needs_review" : "not_found",
      material: true,
      notes: ["Loan and withdrawal schedules are shown for review only; amounts are not placed in client copy."],
    });
  }
  const mec = str(g(a1, "compliance.MEC_status"));
  if (mec) addFact(ctx, { key: "mec_status", label: "MEC status stated", value: mec, unit: "text", status: "needs_review", material: false, notes: ["Internal only; excluded from client copy."] });

  // Core-field blockers
  for (const id of ["f.insurer", "f.product_name", "f.planned_premium_outlay", "f.initial_death_benefit"]) {
    const f = ctx.facts.find((x) => x.fact_id === id);
    if (!f || f.status === "not_found" || f.status === "contradictory") ctx.blockers.push(`core_fact_${f?.status ?? "missing"}:${id}`);
  }

  return finish(ctx, doc, docKind, pclass, structure, input, ledger.rows, now);
}

function cumulativeOutlay(ctx: Ctx, ledger: Ledger, year: number) {
  const rows = ledger.rows.filter((r) => r.policy_year <= year);
  const refsFor = ctx.facts.filter((f) => f.fact_id === `f.ledger.y${year}.sv_current`);
  if (!ledger.complete || rows.length !== year || rows.some((r) => r.premium == null)) {
    addFact(ctx, { key: `ledger.y${year}.cumulative_outlay`, label: `Total outlay through year ${year}`, value: null, unit: "usd", status: "not_found", material: false });
    return;
  }
  const total = rows.reduce((s, r) => s + (r.premium ?? 0), 0);
  const ref = addRef(ctx, {
    evidence_type: "derived_calculation",
    verification_status: "verified",
    table_id: "ledger",
    row_id: `Y1-Y${year}`,
    measure_identity: "cumulative_premium_outlay",
    raw_excerpt_redacted: `Sum of the annual premium outlay column, policy years 1-${year} (whole dollars).`,
  });
  addFact(ctx, {
    key: `ledger.y${year}.cumulative_outlay`,
    label: `Total outlay through year ${year}`,
    value: total,
    unit: "usd",
    refs: [ref, ...refsFor.flatMap((f) => f.source_refs).slice(0, 1)],
    status: "verified",
    material: false,
    year,
  });
}

function derivePremiumSchedule(ctx: Ctx, ledger: Ledger, ageBasis: string, a1: unknown) {
  const rows = ledger.rows;
  const positive = rows.filter((r) => (r.premium ?? 0) > 0);
  if (!ledger.complete || !positive.length) {
    addFact(ctx, { key: "premium_payment_years", label: "Years of planned premium outlay", value: null, unit: "years", status: "not_found", material: true });
    return;
  }
  const last = positive[positive.length - 1];
  const contiguous = positive.length === last.policy_year;
  const amounts = new Set(positive.map((r) => r.premium));
  const level = amounts.size === 1;
  const steps: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i].premium ?? 0) !== (rows[i - 1].premium ?? 0)) steps.push(`year ${rows[i].policy_year}: ${rows[i - 1].premium ?? 0} → ${rows[i].premium ?? 0}`);
  }
  const lastRowOfLedger = rows[rows.length - 1];
  const throughEnd = last.policy_year === lastRowOfLedger.policy_year;
  const ref = addRef(ctx, {
    evidence_type: "derived_calculation",
    verification_status: "verified",
    table_id: "ledger",
    row_id: `Y1-Y${lastRowOfLedger.policy_year}`,
    measure_identity: "premium_schedule",
    age_basis: ageBasis,
    raw_excerpt_redacted: `Count of ledger years with a positive premium outlay; rows 1-${lastRowOfLedger.policy_year} complete.`,
  });
  const lastRowRef = ctx.facts.find((f) => f.fact_id === "f.planned_premium_outlay")?.source_refs ?? [];
  const stopYear = num(g(a1, "premiums.stop_year"));
  const contradictory = stopYear != null && stopYear !== last.policy_year;
  addFact(ctx, {
    key: "premium_payment_years",
    label: "Years of planned premium outlay",
    value: contiguous ? last.policy_year : positive.length,
    unit: "years",
    refs: [ref, ...lastRowRef],
    status: contradictory ? "contradictory" : "verified",
    material: true,
    ageBasis,
    notes: [
      ...(contiguous ? [] : ["Outlay is not paid in every year; see the schedule."]),
      ...(throughEnd ? ["Outlay continues through the last illustrated year."] : []),
      ...(contradictory ? [`Premium block says outlay stops in year ${stopYear}.`] : []),
    ],
  });
  if (last.age != null)
    addFact(ctx, {
      key: "last_premium_age",
      label: "Age at the last planned outlay",
      value: last.age,
      unit: "age",
      refs: [ref],
      status: contradictory ? "contradictory" : "verified",
      material: false,
      ageBasis,
    });
  addFact(ctx, {
    key: "premium_schedule_level",
    label: "Outlay is level every year",
    value: level && contiguous,
    unit: "bool",
    refs: [ref],
    status: "verified",
    material: true,
    notes: steps.length ? [`Outlay changes: ${steps.slice(0, 4).join("; ")}`] : undefined,
  });
  addFact(ctx, {
    key: "premium_outlay_through_final_year",
    label: "Outlay continues through the last illustrated year",
    value: throughEnd,
    unit: "bool",
    refs: [ref],
    status: "verified",
    material: false,
  });
}

function deriveCoverageHorizons(ctx: Ctx, ledger: Ledger, ageBasis: string) {
  if (!ledger.complete || !ledger.rows.length) return;
  const rows = ledger.rows;
  const last = rows[rows.length - 1];
  const gLapse = rows.find((r) => r.lapsed_guaranteed);
  const gLastInForce = gLapse ? rows.filter((r) => r.policy_year < gLapse.policy_year).pop() : last;
  const ref = (what: string) =>
    addRef(ctx, {
      evidence_type: "derived_calculation",
      verification_status: "verified",
      table_id: "ledger",
      row_id: `Y1-Y${last.policy_year}`,
      measure_identity: what,
      age_basis: ageBasis,
      raw_excerpt_redacted: `Last ledger row with a positive ${what === "guaranteed_scenario_coverage" ? "guaranteed" : "illustrated"} death benefit.`,
    });
  if (gLastInForce?.age != null) {
    addFact(ctx, {
      key: "guaranteed_scenario_coverage_through_age",
      label: "On guaranteed charges and rates, coverage is shown through age",
      value: gLastInForce.age,
      unit: "age",
      refs: [ref("guaranteed_scenario_coverage")],
      status: "verified",
      material: true,
      scenario: "guaranteed",
      ageBasis,
      notes: gLapse ? [`Guaranteed columns show no death benefit from policy year ${gLapse.policy_year}.`] : ["Guaranteed death benefit is positive through the last illustrated row."],
    });
  }
  const cLapse = rows.find((r) => r.db_current == null || r.db_current <= 0);
  const cLast = cLapse ? rows.filter((r) => r.policy_year < cLapse.policy_year).pop() : last;
  if (cLast?.age != null)
    addFact(ctx, {
      key: "illustrated_coverage_through_age",
      label: "On illustrated (non-guaranteed) assumptions, coverage is shown through age",
      value: cLast.age,
      unit: "age",
      refs: [ref("illustrated_scenario_coverage")],
      status: "verified",
      material: true,
      scenario: "current",
      ageBasis,
      notes: cLapse ? undefined : ["This is the last illustrated row, not a promise beyond it."],
    });
}

function buildGuarantee(ctx: Ctx, a1: unknown, input: AtlasInput, structure: EvidencePacket["insured_structure"], ageBasis: string) {
  const guarantees = ((g(a1, "chassis.coverage_guarantees") as unknown[]) ?? []).filter(isObj);
  const hasNlg = yes(g(a1, "chassis.no_lapse_guarantee")) || guarantees.length > 0;
  addFact(ctx, {
    key: "guarantee_present",
    label: "A coverage guarantee provision is described",
    value: hasNlg,
    unit: "bool",
    status: hasNlg || no(g(a1, "chassis.no_lapse_guarantee")) ? "verified" : "not_found",
    material: true,
  });
  if (!hasNlg) return;
  const gq = guarantees[0] ?? {};
  const label = str(gq.label) ?? str(g(a1, "nlg.mechanisms.0.name")) ?? str(g(a1, "nlg.rider_name"));
  const pages = parsePageList(gq.pages ?? g(a1, "nlg.mechanisms.0.pages"));
  const endAge = num(gq.end_age) ?? num(g(a1, "nlg.end_age")) ?? num(g(a1, "chassis.no_lapse_end_age"));
  const endYear = num(gq.end_year) ?? num(g(a1, "nlg.end_year"));
  const lifetime = /lifetime/i.test(String(g(a1, "nlg.type") ?? gq.period ?? ""));

  // Verbatim provision text from ATLAS-2 (each excerpt must resolve on a page).
  const registry = Array.isArray(input.atlas2Registry) ? (input.atlas2Registry as unknown[]).filter(isObj) : [];
  const provision = registry
    .filter((e) => typeof e.text === "string" && (e.text as string).length >= 40)
    .filter((e) => /guarantee|lapse protection|no[- ]lapse|will not (?:enter the grace|lapse)/i.test(String(e.text)))
    .map((e) => ({ text: normalize(String(e.text)), page: num(e.sourcePageLabel) ?? num(g(e, "page")) }))
    .find((e) => (label ? e.text.toLowerCase().includes(label.toLowerCase().slice(0, 18)) : true));

  let provRef: string | null = null;
  if (provision) {
    const loc = locate(ctx.pages, [provision.text.slice(0, 160)], provision.page ? [provision.page] : pages);
    if (loc && excerptResolves(ctx.pages, loc.page_number, ctx.pages.find((p) => p.page_number === loc.page_number)!.text.slice(loc.start, loc.end))) {
      provRef = addRef(ctx, {
        page_number: loc.page_number,
        text_span: { start: loc.start, end: loc.end },
        raw_excerpt_redacted: provision.text.slice(0, 380),
        evidence_type: "guarantee_provision",
        verification_status: "verified",
        measure_identity: "guarantee_provision",
      });
    }
  }
  const nameLoc = label ? locate(ctx.pages, [label], pages) : null;
  const nameRef = nameLoc ? refFromLocated(ctx, nameLoc, "guarantee_provision", { measure_identity: "guarantee_name" }) : null;
  addFact(ctx, {
    key: "guarantee_name",
    label: "Guarantee provision",
    value: label,
    unit: "text",
    refs: [nameRef, provRef].filter((x): x is string => !!x),
    status: !label ? "not_found" : nameRef ? "verified" : "needs_review",
    material: true,
  });

  // Endpoint: must be printed near the provision, with an explicit life basis for two lives.
  let endRef: string | null = null;
  if (endAge != null) {
    const loc = locate(ctx.pages, [`age ${endAge}`, `Age ${endAge}`, `age: ${endAge}`], pages);
    if (loc) endRef = refFromLocated(ctx, loc, "guarantee_provision", { measure_identity: "guarantee_end_age", age_basis: ageBasis });
  }
  const basisUnclear = structure !== "single" && !/younger|older|insured ?1|insured ?2|first|second/i.test(ageBasis);
  addFact(ctx, {
    key: "guarantee_end_age",
    label: lifetime ? "Guarantee described as lifetime, ending at age" : "Guarantee period ends at age",
    value: endAge,
    unit: "age",
    refs: endRef ? [endRef] : [],
    status: endAge == null ? "not_found" : !endRef || basisUnclear ? "needs_review" : "verified",
    material: true,
    ageBasis,
    notes: [
      ...(basisUnclear ? ["The illustration does not say which insured's age this endpoint uses."] : []),
      ...(g(a1, "dashboard_facts.guarantee_relationship.no_lapse_guarantee_end_age_evidence") === "as_extracted_endpoint_not_qualified"
        ? ["The extractor marks this endpoint as illustrated, not as a contractual maximum."]
        : []),
    ],
  });
  if (endYear != null)
    addFact(ctx, { key: "guarantee_end_year", label: "Guarantee period ends in policy year", value: endYear, unit: "policy_year", refs: endRef ? [endRef] : [], status: endRef ? "verified" : "needs_review", material: false });

  // Conditions: ATLAS paraphrases, anchored to the verbatim provision when available.
  const conds = [1, 2, 3, 4, 5]
    .map((i) => str(g(a1, `nlg.condition_${i}`)))
    .filter((x): x is string => !!x);
  if (!conds.length && str(gq.conditions)) conds.push(String(gq.conditions));
  addFact(ctx, {
    key: "guarantee_conditions",
    label: "Conditions the guarantee depends on",
    value: conds.slice(0, 5).map((c) => c.slice(0, 200)),
    unit: "list",
    refs: provRef ? [provRef] : nameRef ? [nameRef] : [],
    status: !conds.length ? "not_found" : provRef ? "verified" : "needs_review",
    material: true,
    notes: provRef ? undefined : ["No verbatim provision text was matched to these conditions."],
  });
  const scope = str(g(a1, "nlg.coverage_scope"));
  if (scope && /unresolved/i.test(scope))
    ctx.warnings.push("The illustration does not say which coverage amount the guarantee protects; confirm with the carrier materials.");
}

function finish(
  ctx: Ctx,
  doc: { fingerprint: string; page_count: number },
  docKind: DocumentKind,
  pclass: ProductClass,
  structure: EvidencePacket["insured_structure"],
  input: AtlasInput,
  ledger: LedgerRow[],
  now: string,
): EvidencePacket {
  return {
    schema_version: VERSIONS.evidence,
    source_document_id: ctx.docId,
    document_fingerprint: doc.fingerprint,
    page_count: doc.page_count,
    document_kind: docKind,
    product_class: pclass,
    insured_structure: structure,
    extractor: {
      atlas1: str(g(input.atlas1, "_metadata.atlas_prompt_version")),
      atlas2: input.atlas2 ? "atlas2" : null,
      parser: str(g(input.atlas1, "_metadata.parser_version")),
    },
    facts: ctx.facts,
    refs: ctx.refs,
    ledger: ledger.slice(0, 130),
    extraction_warnings: [...new Set(ctx.warnings)].slice(0, 40).map((w) => w.slice(0, 300)),
    blockers: [...new Set(ctx.blockers)].slice(0, 20),
    built_at: now,
  };
}

/* ── lookups and corrections ──────────────────────────────────────────── */

export function factMap(p: EvidencePacket): Map<string, ExtractedFact> {
  return new Map(p.facts.map((f) => [f.fact_id, f]));
}

export type FactCorrection = {
  fact_id: string;
  value: string | number | boolean | null;
  reason: string;
  source_page: number | null;
  by: string;
  at: string;
};

/** Applies producer corrections. A corrected value is verified only when it is found on the cited page. */
export function applyCorrections(p: EvidencePacket, corrections: FactCorrection[], pages: SourcePage[]): EvidencePacket {
  const facts = p.facts.map((f) => ({ ...f }));
  const refs = [...p.refs];
  for (const c of corrections) {
    const f = facts.find((x) => x.fact_id === c.fact_id);
    if (!f) continue;
    let ref: string | null = null;
    if (c.source_page && c.value != null) {
      const needles = typeof c.value === "number" ? (f.unit === "percent" ? percentNeedles(c.value) : f.unit === "usd" ? moneyNeedles(c.value) : [String(c.value)]) : [String(c.value)];
      const loc = locate(pages.filter((x) => x.page_number === c.source_page), needles);
      if (loc) {
        ref = `e.${refs.length + 1}`;
        refs.push({
          evidence_id: ref,
          source_document_id: p.source_document_id,
          page_number: loc.page_number,
          text_span: { start: loc.start, end: loc.end },
          raw_excerpt_redacted: loc.excerpt.slice(0, 380),
          evidence_type: "advisor_correction",
          verification_status: "verified",
          measure_identity: f.semantic_key,
        });
      }
    }
    f.corrected = { original_value: f.corrected?.original_value ?? f.value, reason: c.reason.slice(0, 500), source_page: c.source_page, by: c.by, at: c.at };
    f.value = c.value;
    f.source_refs = ref ? [ref] : [];
    f.status = ref ? "verified" : "needs_review";
    f.notes = ref ? ["Corrected by the producer and located on the cited page."] : ["Corrected by the producer; the value was not found on the cited page."];
  }
  const blockers = p.blockers.filter((b) => {
    const m = b.match(/^core_fact_[a-z_]+:(.+)$/);
    if (!m) return true;
    const f = facts.find((x) => x.fact_id === m[1]);
    return !f || f.status === "not_found" || f.status === "contradictory";
  });
  return { ...p, facts, refs, blockers };
}

/** Every ref id cited by a fact must exist, and every page excerpt must resolve. */
export function validatePointers(p: EvidencePacket, pages: SourcePage[]): string[] {
  const problems: string[] = [];
  const ids = new Set(p.refs.map((r) => r.evidence_id));
  for (const f of p.facts) for (const r of f.source_refs) if (!ids.has(r)) problems.push(`${f.fact_id} cites missing ${r}`);
  for (const r of p.refs) {
    if (r.page_number == null) continue;
    const page = pages.find((x) => x.page_number === r.page_number);
    if (!page) {
      problems.push(`${r.evidence_id} points at missing page ${r.page_number}`);
      continue;
    }
    if (r.text_span && (r.text_span.end > page.text.length || r.text_span.start >= r.text_span.end))
      problems.push(`${r.evidence_id} span is outside page ${r.page_number}`);
  }
  return problems;
}
