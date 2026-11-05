/**
 * PolicyPlan Stories (pre-sale), engine v1.
 *
 * The advisor picks a story, uploads the carrier's proposed sales
 * illustration, chooses goals and branding, and gets a short visual report
 * that explains the design as a story. The first story is "The Apartment
 * Complex" for indexed universal life.
 *
 * As in the Companion, the app is the authority:
 *   - every number comes from the evidence packet and is checked against the
 *     page text here, never computed by the model;
 *   - n8n only writes a few short captions (policyplan_story.v1), which the
 *     guard below checks for prohibited wording and for numbers that are not
 *     in the packet;
 *   - names (prepared for, beneficiary, advisor) are never sent to the model.
 */
import { z } from "zod";
import type { EvidencePacket, ExtractedFact } from "./contracts";
import { PROHIBITED, hitNotNegated } from "./guard";
import { locateLedgerValue, type SourcePage } from "./pages";
import { detectResidual, injectionSignals } from "./privacy";
import { GOAL_LABELS, STORY_CATALOG, type CatalogEntry } from "./story-catalog";

export { GOAL_LABELS, STORY_CATALOG, type CatalogEntry };

export const STORY_VERSIONS = {
  inputs: "policyplan-story-inputs.v1",
  playback: "policyplan-story-playback.v1",
  writer_input: "policyplan_story_input.v1",
  writer: "policyplan_story.v1",
  prompt: "policyplan_story_apartment.v1",
  draft: "policyplan-story.v1",
  template: "policyplan-story-template.v1",
} as const;

export const storyKey = z.enum(["apartment"]);
export type StoryKey = z.infer<typeof storyKey>;

/* ── Inputs from the one-screen form ──────────────────────────────────── */

export const storyGoal = z.enum(["retirement_income", "legacy", "long_term_care", "accumulation", "business", "protection"]);
export type StoryGoal = z.infer<typeof storyGoal>;


const plain = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((s) => !/[<>{}]/.test(s), "Angle brackets and braces are not allowed.");
const optionalPlain = (max: number) => plain(max).transform((v) => v || undefined).optional();

export const storyCoverSchema = z
  .object({
    title: optionalPlain(60),
    subtitle: plain(141)
      .refine((v) => v.split(/\r?\n/).length <= 2 && v.split(/\r?\n/).every((l) => l.length <= 70), "Use at most two lines of 70 characters each.")
      .transform((v) => v || undefined)
      .optional(),
    prepared_for: optionalPlain(80),
    advisor_name: optionalPlain(80),
    firm_name: optionalPlain(80),
  })
  .strict();
export type StoryCover = z.infer<typeof storyCoverSchema>;

export const storyInputsSchema = z
  .object({
    version: z.literal(STORY_VERSIONS.inputs).default(STORY_VERSIONS.inputs),
    story_key: storyKey,
    goals: z
      .array(storyGoal)
      .max(3)
      .refine((g) => new Set(g).size === g.length, "Choose each goal only once.")
      .default([]),
    riders: z.array(z.object({ name: plain(180).pipe(z.string().min(1)), show: z.boolean() }).strict()).max(30).default([]),
    beneficiary: optionalPlain(120),
    cover: storyCoverSchema.default({}),
  })
  .strict();
export type StoryInputs = z.infer<typeof storyInputsSchema>;

/* ── Playback: every number on the report ─────────────────────────────── */

type Cell = { value: number | null; verified: boolean; page: number | null };

export type DesignPoint = {
  label: string;
  policy_year: number;
  age: number | null;
  cumulative_premium: Cell;
  sv_guaranteed: Cell;
  db_guaranteed: Cell;
  sv_current: Cell;
  db_current: Cell;
  guaranteed_lapsed: boolean;
};

export type PhaseKey = "construction" | "lease_up" | "fully_leased";
export type MilestoneKey = "surrender_charge_ends" | "premiums_complete" | "income_starts";

export type StoryPlayback = {
  version: typeof STORY_VERSIONS.playback;
  story_key: StoryKey;
  product: { carrier: string | null; product: string | null; product_class: string; illustration_date: string | null };
  issue_age: number | null;
  phases: { key: PhaseKey; label: string; from_year: number; to_year: number | null; from_age: number | null; to_age: number | null }[];
  construction_end_year: number;
  construction_source: "ledger" | "surrender_charge_schedule" | "default";
  milestones: { key: MilestoneKey; label: string; year: number; age: number | null }[];
  premium: { annual: number | null; annual_verified: boolean; years: number | null; last_age: number | null };
  income: { annual: number | null; start_age: number | null; end_age: number | null; years: number | null } | null;
  crediting: { illustrated_rate: number | null; guaranteed_rate: number | null };
  death_benefit: { initial: number | null; verified: boolean };
  coverage: { guaranteed_through_age: number | null; illustrated_through_age: number | null };
  points: DesignPoint[];
  benefit_facts: { living_benefit_riders: string[]; has_ltc_rider: boolean };
  goals: StoryGoal[];
  riders_shown: string[];
  source_pages: number[];
  notes: string[];
};

const LIVING = /living benefit|chronic|terminal|critical illness|long[- ]term care|\bLTC\b|accelerat/i;
const LTC = /long[- ]term care|\bLTC\b/i;

function fact(packet: EvidencePacket, id: string): ExtractedFact | undefined {
  return packet.facts.find((f) => f.fact_id === id);
}
function verifiedNumber(packet: EvidencePacket, id: string): number | null {
  const f = fact(packet, id);
  return f && f.status === "verified" && typeof f.value === "number" ? f.value : null;
}
function verifiedText(packet: EvidencePacket, id: string): string | null {
  const f = fact(packet, id);
  return f && f.status === "verified" && typeof f.value === "string" ? f.value : null;
}

export function riderNames(packet: EvidencePacket): string[] {
  const f = fact(packet, "f.riders_included");
  if (!f || !Array.isArray(f.value)) return [];
  return f.value.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

/** Builds the playback from the evidence packet. `pages` is the redacted source used to check each displayed cell. */
export function buildStoryPlayback(packet: EvidencePacket, inputs: StoryInputs, pages: SourcePage[]): StoryPlayback {
  const notes: string[] = [];
  const rows = packet.ledger;
  const row = (y: number) => rows.find((r) => r.policy_year === y);
  const ledgerPages = [...new Set(packet.refs.filter((r) => r.table_id === "ledger" && r.page_number).map((r) => r.page_number!))];
  const ageRow = rows.find((r) => r.age != null);
  const offset = ageRow ? ageRow.age! - ageRow.policy_year : null;
  const ageAt = (y: number | null) => (offset != null && y != null ? offset + y : null);
  const issueAge = ageAt(1);
  const sourcePages = new Set<number>();

  const cell = (y: number, field: "premium" | "sv_guaranteed" | "db_guaranteed" | "sv_current" | "db_current"): Cell => {
    const r = row(y);
    const v = r ? (r[field] as number | null) : null;
    if (v == null) return { value: null, verified: false, page: null };
    if (v === 0) return { value: 0, verified: false, page: null };
    const loc = locateLedgerValue(pages, y, r!.age, v, ledgerPages);
    if (loc) sourcePages.add(loc.page_number);
    return { value: v, verified: !!loc, page: loc?.page_number ?? null };
  };

  // Construction: the surrender charge years. Prefer the ledger (net surrender
  // value first meets the policy value), then the stated charge schedule.
  let constructionEnd: number | null = null;
  let constructionSource: StoryPlayback["construction_source"] = "default";
  const meet = rows.find((r) => r.cv_current != null && r.sv_current != null && r.cv_current > 0 && r.sv_current >= r.cv_current - 1);
  if (meet && meet.policy_year > 1) {
    constructionEnd = meet.policy_year - 1;
    constructionSource = "ledger";
  } else {
    const sc = verifiedNumber(packet, "f.surrender_charge_end_year");
    if (sc && sc >= 1 && sc <= 30) {
      constructionEnd = sc;
      constructionSource = "surrender_charge_schedule";
    }
  }
  if (constructionEnd == null) {
    constructionEnd = 10;
    notes.push("The surrender charge period could not be read, so construction is shown as years 1 to 10. Check the illustration.");
  }
  const leaseEnd = constructionEnd + 10;
  const phases: StoryPlayback["phases"] = [
    { key: "construction", label: "Construction", from_year: 1, to_year: constructionEnd, from_age: ageAt(1), to_age: ageAt(constructionEnd) },
    { key: "lease_up", label: "Lease-up", from_year: constructionEnd + 1, to_year: leaseEnd, from_age: ageAt(constructionEnd + 1), to_age: ageAt(leaseEnd) },
    { key: "fully_leased", label: "Fully leased", from_year: leaseEnd + 1, to_year: null, from_age: ageAt(leaseEnd + 1), to_age: null },
  ];

  // Premiums and income, read from consecutive ledger rows only.
  const consecutive = (i: number) => i > 0 && rows[i].policy_year === rows[i - 1].policy_year + 1;
  let premEndYear: number | null = null;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1].premium;
    const b = rows[i].premium;
    if (consecutive(i) && a != null && b != null && a > 0 && b <= 0) {
      premEndYear = rows[i - 1].policy_year;
      break;
    }
  }
  const year1 = cell(1, "premium");
  const premiumYears = premEndYear ?? (rows.length && rows.every((r) => (r.premium ?? 0) > 0) ? rows[rows.length - 1].policy_year : null);
  let income: StoryPlayback["income"] = null;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1].distribution ?? 0;
    const b = rows[i].distribution ?? 0;
    if (consecutive(i) && a <= 0 && b > 0) {
      const start = rows[i];
      let j = i;
      while (j + 1 < rows.length && consecutive(j + 1) && (rows[j + 1].distribution ?? 0) > 0) j++;
      income = { annual: start.distribution ?? null, start_age: start.age ?? ageAt(start.policy_year), end_age: rows[j].age ?? ageAt(rows[j].policy_year), years: rows[j].policy_year - start.policy_year + 1 };
      const loc = locateLedgerValue(pages, start.policy_year, start.age, start.distribution!, ledgerPages);
      if (!loc) {
        income = { ...income, annual: null };
        notes.push("The planned income amount could not be matched to its ledger row, so the report does not print it.");
      }
      break;
    }
  }

  const milestones: StoryPlayback["milestones"] = [];
  milestones.push({ key: "surrender_charge_ends", label: "Surrender charge ends", year: constructionEnd + 1, age: ageAt(constructionEnd + 1) });
  if (premEndYear) milestones.push({ key: "premiums_complete", label: "Planned premiums complete", year: premEndYear, age: ageAt(premEndYear) });
  if (income?.start_age != null && offset != null) milestones.push({ key: "income_starts", label: "Planned income begins", year: income.start_age - offset, age: income.start_age });
  milestones.sort((a, b) => a.year - b.year);

  // Coverage horizons on each basis.
  const lastWith = (pred: (r: (typeof rows)[number]) => boolean) => {
    let last: number | null = null;
    for (const r of rows) {
      if (pred(r)) last = r.age ?? ageAt(r.policy_year);
      else break;
    }
    return last;
  };
  const guaranteedThrough = rows.length ? lastWith((r) => !r.lapsed_guaranteed) : null;
  const illustratedThrough = rows.length ? lastWith((r) => (r.db_current ?? 0) > 0) : null;

  // The design table: a few ages the client thinks in.
  const targetAges = [...new Set([income?.start_age ?? 65, 85, 100].filter((a): a is number => a != null))];
  const years = new Set<number>();
  if (constructionEnd + 1 <= (rows[rows.length - 1]?.policy_year ?? 0)) years.add(Math.min(10, constructionEnd + 1));
  for (const a of targetAges) {
    const r = rows.find((x) => x.age === a);
    if (r) years.add(r.policy_year);
  }
  const points: DesignPoint[] = [...years]
    .sort((a, b) => a - b)
    .slice(0, 4)
    .map((y) => {
      const r = row(y)!;
      const prem = rows.filter((x) => x.policy_year <= y);
      const allPrem = prem.every((x) => x.premium != null);
      const premVerified = allPrem && prem.filter((x) => (x.premium ?? 0) > 0).every((x) => locateLedgerValue(pages, x.policy_year, x.age, x.premium!, ledgerPages));
      return {
        label: r.age != null ? `Age ${r.age}` : `Year ${y}`,
        policy_year: y,
        age: r.age ?? ageAt(y),
        cumulative_premium: { value: allPrem ? prem.reduce((s, x) => s + (x.premium ?? 0), 0) : null, verified: !!premVerified, page: null },
        sv_guaranteed: r.lapsed_guaranteed ? { value: null, verified: true, page: null } : cell(y, "sv_guaranteed"),
        db_guaranteed: r.lapsed_guaranteed ? { value: null, verified: true, page: null } : cell(y, "db_guaranteed"),
        sv_current: cell(y, "sv_current"),
        db_current: cell(y, "db_current"),
        guaranteed_lapsed: r.lapsed_guaranteed,
      };
    });
  if (!points.length) notes.push("No ledger rows could be read, so the design table is left out.");

  const riders = riderNames(packet);
  const shown = inputs.riders.length ? inputs.riders.filter((r) => r.show && riders.includes(r.name)).map((r) => r.name) : riders;
  const living = riders.filter((n) => LIVING.test(n));
  const db1 = cell(1, "db_current");
  const initialDb = verifiedNumber(packet, "f.initial_death_benefit") ?? (db1.verified ? db1.value : null);

  return {
    version: STORY_VERSIONS.playback,
    story_key: inputs.story_key,
    product: {
      carrier: verifiedText(packet, "f.insurer"),
      product: verifiedText(packet, "f.product_name"),
      product_class: packet.product_class,
      illustration_date: verifiedText(packet, "f.illustration_date"),
    },
    issue_age: issueAge,
    phases,
    construction_end_year: constructionEnd,
    construction_source: constructionSource,
    milestones: milestones.slice(0, 3),
    premium: { annual: year1.value, annual_verified: year1.verified, years: premiumYears, last_age: ageAt(premiumYears) },
    income,
    crediting: { illustrated_rate: verifiedNumber(packet, "f.illustrated_rate"), guaranteed_rate: verifiedNumber(packet, "f.guaranteed_rate") },
    death_benefit: { initial: initialDb, verified: initialDb != null },
    coverage: { guaranteed_through_age: guaranteedThrough, illustrated_through_age: illustratedThrough },
    points,
    benefit_facts: { living_benefit_riders: living, has_ltc_rider: living.some((n) => LTC.test(n)) },
    goals: inputs.goals,
    riders_shown: shown,
    source_pages: [...sourcePages].sort((a, b) => a - b),
    notes,
  };
}

/** Blockers that stop a story from being drafted at all. */
export function storyBlockers(packet: EvidencePacket, playback: StoryPlayback): string[] {
  const out: string[] = [];
  if (packet.document_kind === "in_force") out.push("This is an in-force illustration. Stories are for proposed sales illustrations.");
  if (!["IUL", "UL", "VUL"].includes(packet.product_class)) out.push(`The Apartment story is built for indexed or universal life; this illustration reads as ${packet.product_class}.`);
  if (!packet.ledger.length) out.push("The illustration ledger could not be read.");
  if (playback.death_benefit.initial == null) out.push("The initial death benefit could not be verified.");
  return out;
}

/* ── Writer input (what n8n sees: no names, no free text from the advisor) ── */

export function storyWriterInput(p: StoryPlayback) {
  return {
    schema: STORY_VERSIONS.writer_input,
    story_key: p.story_key,
    prompt_version: STORY_VERSIONS.prompt,
    product_class: p.product.product_class,
    story: {
      phases: p.phases,
      milestones: p.milestones,
      goals: p.goals,
      benefit_facts: {
        death_benefit_initial: p.death_benefit.initial,
        planned_income: p.income && p.income.annual != null ? { annual: p.income.annual, start_age: p.income.start_age, end_age: p.income.end_age } : null,
        living_benefit_riders: p.benefit_facts.living_benefit_riders,
        has_ltc_rider: p.benefit_facts.has_ltc_rider,
      },
    },
    design: {
      issue_age: p.issue_age,
      premium_annual: p.premium.annual_verified ? p.premium.annual : null,
      premium_years: p.premium.years,
      last_premium_age: p.premium.last_age,
      guaranteed_coverage_through_age: p.coverage.guaranteed_through_age,
      illustrated_coverage_through_age: p.coverage.illustrated_through_age,
      illustrated_rate: p.crediting.illustrated_rate,
      guaranteed_rate: p.crediting.guaranteed_rate,
    },
    riders: p.riders_shown,
  };
}

/* ── Writer output and guard ──────────────────────────────────────────── */

export const BENEFIT_KEYS = ["growth", "access", "legacy", "living_benefits"] as const;
export type BenefitKey = (typeof BENEFIT_KEYS)[number];

export const storyWriterSchema = z
  .object({
    schema: z.literal(STORY_VERSIONS.writer),
    story: z
      .object({
        where_you_start: z.string().min(1).max(400),
        benefits: z.array(z.object({ key: z.enum(BENEFIT_KEYS), note: z.string().min(1).max(160) }).strict()).min(1).max(4),
      })
      .strict(),
    design: z.object({ headline: z.string().min(1).max(200), takeaway: z.string().min(1).max(400) }).strict(),
    riders: z.array(z.object({ name: z.string().min(1).max(180), note: z.string().min(1).max(200) }).strict()).max(30),
  })
  .strict();
export type StoryWriterOutput = z.infer<typeof storyWriterSchema>;

/** The text the report prints. Every field is checked by the guard. */
export type StoryText = {
  where_you_start: string;
  headline: string;
  takeaway: string;
  benefits: Partial<Record<BenefitKey, string>>;
  riders: Record<string, string>;
};

export const LIMITS = { where_you_start: 40, headline: 22, takeaway: 40, benefit: 14, rider: 18 } as const;

export const STORY_BANNED: { re: RegExp; why: string }[] = [
  { re: /\b(?:recommend(?:ed|s|ation)?|should (?:buy|choose|apply|purchase))\b/i, why: "recommendation" },
  { re: /\b(?:you will (?:receive|get|have|earn))\b/i, why: "promise of a result" },
  { re: /\b(?:never lapse|can(?:no|')t lapse|lifetime income)\b/i, why: "guarantee claim" },
  { re: /\b(?:better than|beats?|outperform\w*|instead of)\b/i, why: "comparison" },
  { re: /\b(?:stock market|401\(?k\)?|IRA|annuit(?:y|ies)|CDs?)\b/, why: "comparison with another product" },
  { re: /!/, why: "exclamation mark" },
];

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Every number a caption may use, in the formats a writer would print. */
export function allowedNumbers(p: StoryPlayback): Set<string> {
  const out = new Set<string>();
  const add = (n: number | null | undefined) => {
    if (n == null || !Number.isFinite(n)) return;
    out.add(String(Math.round(n)));
    out.add(String(n));
    if (Math.abs(n) >= 1000) {
      out.add(`${Math.round(n / 1000)}k`);
      if (Math.abs(n) >= 1_000_000) {
        const m = n / 1_000_000;
        out.add(`${Number(m.toFixed(1))}m`);
        out.add(`${Math.round(m)}m`);
      }
    }
  };
  for (const ph of p.phases) [ph.from_year, ph.to_year, ph.from_age, ph.to_age].forEach(add);
  for (const m of p.milestones) [m.year, m.age].forEach(add);
  [p.issue_age, p.premium.years, p.premium.last_age, p.coverage.guaranteed_through_age, p.coverage.illustrated_through_age, p.death_benefit.initial].forEach(add);
  if (p.premium.annual_verified) add(p.premium.annual);
  if (p.income) [p.income.annual, p.income.start_age, p.income.end_age, p.income.years].forEach(add);
  for (const r of [p.crediting.illustrated_rate, p.crediting.guaranteed_rate]) {
    if (r == null) continue;
    out.add(`${r}%`);
    out.add(`${r.toFixed(2)}%`);
    out.add(`${Number(r.toFixed(1))}%`);
  }
  // Rider names often carry numbers ("Overloan Protection 3 Rider").
  for (const name of p.riders_shown) for (const m of name.matchAll(/\d+(?:\.\d+)?%?/g)) out.add(m[0].toLowerCase());
  return out;
}

const NUMBER = /\$?\d[\d,]*(?:\.\d+)?\s?(?:%|[kKmM]\b)?/g;
function normalizeNumber(tok: string): string {
  const t = tok.replace(/[$,\s]/g, "").toLowerCase();
  return t;
}

export function textIssues(text: string, limit: number, p: StoryPlayback): string[] {
  const issues: string[] = [];
  if (!text.trim()) return ["Empty text."];
  if (words(text) > limit) issues.push(`Longer than ${limit} words.`);
  for (const rule of PROHIBITED) if (hitNotNegated(text, rule.re, rule.why)) issues.push(`Prohibited wording (${rule.why}).`);
  for (const rule of STORY_BANNED) if (rule.re.test(text)) issues.push(`Not allowed in a story (${rule.why}).`);
  const allowed = allowedNumbers(p);
  for (const m of text.matchAll(NUMBER)) {
    const n = normalizeNumber(m[0]);
    if (!allowed.has(n)) issues.push(`The number "${m[0].trim()}" is not in the illustration facts for this report.`);
  }
  if (/[<>{}]/.test(text)) issues.push("Angle brackets and braces are not allowed.");
  if (detectResidual(text).length) issues.push("Looks like personal information.");
  if (injectionSignals(text).length) issues.push("Contains instructions instead of report text.");
  return [...new Set(issues)];
}

export type StoryGuard = { text: StoryText; issues: Record<string, string[]>; ok: boolean };

/** Checks every printed field. Keys: where_you_start, headline, takeaway, benefit.<key>, rider.<name>. */
export function guardStory(text: StoryText, p: StoryPlayback): StoryGuard {
  const issues: Record<string, string[]> = {};
  const put = (k: string, list: string[]) => {
    if (list.length) issues[k] = list;
  };
  put("where_you_start", textIssues(text.where_you_start, LIMITS.where_you_start, p));
  put("headline", textIssues(text.headline, LIMITS.headline, p));
  put("takeaway", textIssues(text.takeaway, LIMITS.takeaway, p));
  const allowedBenefits = new Set<BenefitKey>(["growth", "access", "legacy", ...(p.benefit_facts.living_benefit_riders.length ? (["living_benefits"] as const) : [])]);
  for (const k of BENEFIT_KEYS) {
    const note = text.benefits[k];
    if (note == null) continue;
    if (!allowedBenefits.has(k)) put(`benefit.${k}`, ["Living benefits are shown only when the illustration includes a living-benefit rider."]);
    else put(`benefit.${k}`, textIssues(note, LIMITS.benefit, p));
  }
  for (const k of ["growth", "access", "legacy"] as const) if (!text.benefits[k]) put(`benefit.${k}`, ["Missing."]);
  if (p.benefit_facts.has_ltc_rider === false) {
    for (const [k, v] of Object.entries(text.benefits)) if (v && /long[- ]term care/i.test(v)) put(`benefit.${k}`, [...(issues[`benefit.${k}`] ?? []), "Says long-term care, but no long-term care rider is in the illustration."]);
  }
  const ltcLeak = [text.where_you_start, text.headline, text.takeaway].some((s) => /long[- ]term care/i.test(s)) && !p.benefit_facts.has_ltc_rider;
  if (ltcLeak) put("where_you_start", [...(issues.where_you_start ?? []), "Says long-term care, but no long-term care rider is in the illustration."]);
  for (const [name, note] of Object.entries(text.riders)) {
    if (!p.riders_shown.includes(name)) put(`rider.${name}`, ["Not a rider shown on this report."]);
    else put(`rider.${name}`, textIssues(note, LIMITS.rider, p));
  }
  return { text, issues, ok: Object.keys(issues).length === 0 };
}

export function writerToText(w: StoryWriterOutput, p: StoryPlayback): StoryText {
  const benefits: StoryText["benefits"] = {};
  for (const b of w.story.benefits) benefits[b.key] = b.note.trim();
  const riders: StoryText["riders"] = {};
  for (const r of w.riders) if (p.riders_shown.includes(r.name)) riders[r.name] = r.note.trim();
  return { where_you_start: w.story.where_you_start.trim(), headline: w.design.headline.trim(), takeaway: w.design.takeaway.trim(), benefits, riders };
}

/* ── Draft stored on the output row ───────────────────────────────────── */

const cellSchema = z.object({ value: z.number().nullable(), verified: z.boolean(), page: z.number().int().nullable() }).strict();

export const storyTextSchema = z
  .object({
    where_you_start: z.string().max(400),
    headline: z.string().max(200),
    takeaway: z.string().max(400),
    benefits: z.object({ growth: z.string().max(160).optional(), access: z.string().max(160).optional(), legacy: z.string().max(160).optional(), living_benefits: z.string().max(160).optional() }).strict(),
    riders: z.record(z.string().max(200)),
  })
  .strict();

export const storyPlaybackSchema = z
  .object({
    version: z.literal(STORY_VERSIONS.playback),
    story_key: storyKey,
    product: z.object({ carrier: z.string().nullable(), product: z.string().nullable(), product_class: z.string(), illustration_date: z.string().nullable() }).strict(),
    issue_age: z.number().nullable(),
    phases: z.array(z.object({ key: z.enum(["construction", "lease_up", "fully_leased"]), label: z.string(), from_year: z.number(), to_year: z.number().nullable(), from_age: z.number().nullable(), to_age: z.number().nullable() }).strict()),
    construction_end_year: z.number(),
    construction_source: z.enum(["ledger", "surrender_charge_schedule", "default"]),
    milestones: z.array(z.object({ key: z.enum(["surrender_charge_ends", "premiums_complete", "income_starts"]), label: z.string(), year: z.number(), age: z.number().nullable() }).strict()),
    premium: z.object({ annual: z.number().nullable(), annual_verified: z.boolean(), years: z.number().nullable(), last_age: z.number().nullable() }).strict(),
    income: z.object({ annual: z.number().nullable(), start_age: z.number().nullable(), end_age: z.number().nullable(), years: z.number().nullable() }).strict().nullable(),
    crediting: z.object({ illustrated_rate: z.number().nullable(), guaranteed_rate: z.number().nullable() }).strict(),
    death_benefit: z.object({ initial: z.number().nullable(), verified: z.boolean() }).strict(),
    coverage: z.object({ guaranteed_through_age: z.number().nullable(), illustrated_through_age: z.number().nullable() }).strict(),
    points: z.array(
      z
        .object({ label: z.string(), policy_year: z.number(), age: z.number().nullable(), cumulative_premium: cellSchema, sv_guaranteed: cellSchema, db_guaranteed: cellSchema, sv_current: cellSchema, db_current: cellSchema, guaranteed_lapsed: z.boolean() })
        .strict(),
    ),
    benefit_facts: z.object({ living_benefit_riders: z.array(z.string()), has_ltc_rider: z.boolean() }).strict(),
    goals: z.array(storyGoal),
    riders_shown: z.array(z.string()),
    source_pages: z.array(z.number()),
    notes: z.array(z.string()),
  })
  .strict();

export const storyDraftSchema = z
  .object({
    schema_version: z.literal(STORY_VERSIONS.draft),
    kind: z.literal("story"),
    story_key: storyKey,
    case_id: z.string(),
    revision: z.number().int().positive(),
    document_fingerprint: z.string(),
    inputs: storyInputsSchema,
    playback: storyPlaybackSchema,
    text: storyTextSchema,
    authors: z.record(z.enum(["ai", "producer"])),
    issues: z.record(z.array(z.string())),
    validation: z.object({ client_release_eligible: z.boolean(), text_ok: z.boolean(), numbers_verified: z.boolean() }).strict(),
    versions: z.object({ prompt: z.string(), template: z.string(), playback: z.string() }).strict(),
    writer: z.object({ model: z.string().nullable(), workflow_version: z.string().nullable() }).strict(),
  })
  .strict();
export type StoryDraft = z.infer<typeof storyDraftSchema>;

export const isStoryDraft = (v: unknown): boolean => !!v && typeof v === "object" && (v as { kind?: unknown }).kind === "story";

/** True when every number the report prints was matched to its ledger row. */
export function numbersVerified(p: StoryPlayback): boolean {
  if (!p.death_benefit.verified) return false;
  return p.points.every((pt) => [pt.sv_current, pt.db_current, ...(pt.guaranteed_lapsed ? [] : [pt.sv_guaranteed, pt.db_guaranteed])].every((c) => c.value == null || c.value === 0 || c.verified));
}

export function finishDraft(base: Omit<StoryDraft, "issues" | "validation">): StoryDraft {
  const g = guardStory(base.text, base.playback);
  const numbers = numbersVerified(base.playback);
  return { ...base, issues: g.issues, validation: { client_release_eligible: g.ok && numbers, text_ok: g.ok, numbers_verified: numbers } };
}

/** Advisor edits: same field keys as the guard. */
export const storyEditsSchema = z
  .object({
    where_you_start: z.string().trim().min(1).max(400).optional(),
    headline: z.string().trim().min(1).max(200).optional(),
    takeaway: z.string().trim().min(1).max(400).optional(),
    benefits: z.object({ growth: z.string().trim().max(160).optional(), access: z.string().trim().max(160).optional(), legacy: z.string().trim().max(160).optional(), living_benefits: z.string().trim().max(160).optional() }).strict().optional(),
    riders: z.record(z.string().trim().max(200)).optional(),
  })
  .strict();
export type StoryEdits = z.infer<typeof storyEditsSchema>;

export function applyEdits(d: StoryDraft, e: StoryEdits): { text: StoryText; authors: Record<string, "ai" | "producer">; changed: string[] } {
  const text: StoryText = { ...d.text, benefits: { ...d.text.benefits }, riders: { ...d.text.riders } };
  const authors = { ...d.authors };
  const changed: string[] = [];
  const set = (key: string, before: string | undefined, after: string | undefined, write: (v: string | undefined) => void) => {
    if (after === undefined || after === before) return;
    write(after === "" ? undefined : after);
    authors[key] = "producer";
    changed.push(key);
  };
  set("where_you_start", text.where_you_start, e.where_you_start, (v) => (text.where_you_start = v ?? ""));
  set("headline", text.headline, e.headline, (v) => (text.headline = v ?? ""));
  set("takeaway", text.takeaway, e.takeaway, (v) => (text.takeaway = v ?? ""));
  for (const k of BENEFIT_KEYS) set(`benefit.${k}`, text.benefits[k], e.benefits?.[k], (v) => (v == null ? delete text.benefits[k] : (text.benefits[k] = v)));
  for (const [name, note] of Object.entries(e.riders ?? {})) {
    if (!d.playback.riders_shown.includes(name)) continue;
    set(`rider.${name}`, text.riders[name], note, (v) => (v == null ? delete text.riders[name] : (text.riders[name] = v)));
  }
  return { text, authors, changed };
}
