/**
 * Claim guard (companion-guard.v1). Deterministic checks on every block of
 * client copy, whether written by the model or edited by the producer.
 * A model can recommend nothing to this module; it only accepts or flags.
 */
import {
  VERSIONS,
  analystOutputSchema,
  writerOutputSchema,
  type AnalystOutput,
  type ClientBrief,
  type CompanionBlock,
  type CompanionDraft,
  type CompanionPlan,
  type DraftValidation,
  type EvidencePacket,
  type ExtractedFact,
  type Observation,
} from "./contracts";
import { TOKEN_RE, tokensIn, wordCount } from "./format";
import { allFacts } from "./planner";
import { detectResidual, injectionSignals } from "./privacy";
import { verificationItems } from "./rules";

/** Unqualified terms the Companion never prints (spec §7.3). */
export const PROHIBITED: { re: RegExp; why: string }[] = [
  { re: /\b(?:I|we)\s+(?:strongly\s+)?(?:recommend|suggest|advise|believe|think)\b/i, why: "first-person recommendation" },
  { re: /\byou should\s+(?:buy|purchase|apply|choose|replace|surrender)\b/i, why: "purchase instruction" },
  { re: /\bbest[- ]interest\b/i, why: "best-interest claim" },
  { re: /\b(?:most\s+)?suitab(?:le|ility)\b/i, why: "suitability claim" },
  { re: /\b(?:appropriate|optimal|superior|ideal|perfect)\b/i, why: "evaluative claim" },
  { re: /\bbest\b/i, why: "superlative" },
  { re: /\b(?:safe|risk[- ]free|no risk|can(?:no|')t lose)\b/i, why: "safety claim" },
  { re: /\bguaranteed\s+(?:income|return|growth|premium)\b/i, why: "guaranteed income/return/premium" },
  { re: /\bpaid[- ]up\b/i, why: "paid-up claim" },
  { re: /\b(?:will|would)\s+(?:last|stay in force|remain in force)\s+(?:for\s+)?(?:life|your lifetime|forever)\b/i, why: "lifetime coverage claim" },
  { re: /\bfor (?:the rest of )?(?:your )?life\b/i, why: "lifetime coverage claim" },
  { re: /\b(?:affordable|cheap|inexpensive|low[- ]cost|lowest)\b/i, why: "affordability/cost claim" },
  { re: /\btax[- ]?(?:free|exempt|advantaged)\b/i, why: "tax claim" },
  { re: /\bestate[- ]tax[- ]free\b/i, why: "tax claim" },
  { re: /\b(?:compliant|complies|compliance with)\b/i, why: "compliance claim" },
  { re: /\bReg(?:ulation)?\.?\s*187\b/i, why: "Reg 187 claim" },
  { re: /\b(?:carrier|insurer|regulator|firm|state)[- ](?:approved|endorsed)\b/i, why: "approval claim" },
  { re: /\bapproved by\b/i, why: "approval claim" },
  { re: /\b(?:you|the client) (?:have|has) agreed\b/i, why: "agreement claim" },
  { re: /\b(?:will|is going to)\s+(?:earn|grow|return|pay you)\b/i, why: "performance promise" },
  { re: /\bunconditional(?:ly)?\b/i, why: "unconditional claim" },
];

const CONDITION_WORD = /\b(?:if|only if|as long as|provided|depends|depending|conditions?|unless|while)\b/i;
const FIRST_DEATH = /\b(?:first death|when (?:either|one) of you dies|first of (?:you|the insureds) to die)\b/i;
const SECOND_DEATH = /\bsecond (?:death|of (?:you|the two|the insureds|both))\b|\bboth (?:insureds|of you) (?:have )?died\b/i;

/** "not a guaranteed premium" is a correct negation, not a claim. */
const NEGATION = /\b(?:not|never|no|nothing|isn't|aren't|non|nor|without)\b[^.;:]{0,40}$/i;
const NEGATABLE = new Set(["guaranteed income/return/premium", "paid-up claim", "lifetime coverage claim", "tax claim", "unconditional claim", "safety claim", "first-death"]);
function hitNotNegated(prose: string, re: RegExp, why: string): boolean {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  for (const m of prose.matchAll(g)) {
    const before = prose.slice(Math.max(0, (m.index ?? 0) - 60), m.index);
    if (NEGATABLE.has(why) && NEGATION.test(before)) continue;
    return true;
  }
  return false;
}

/** True when a sentence asserts a guarantee (rather than saying something is not guaranteed). */
function affirmedGuarantee(prose: string): boolean {
  return prose
    .split(/(?<=[.;!?])\s+/)
    .some((sentence) => {
      for (const m of sentence.matchAll(/\bguarantee\w*/gi)) {
        const before = sentence.slice(0, m.index);
        const after = sentence.slice((m.index ?? 0) + m[0].length);
        // "guaranteed charges/rates/columns/values" describes the guaranteed basis, and
        // "prefer guarantees" describes the client; neither asserts a guarantee.
        if (/^\s+(?:charges|rates?|columns?|values?|assumptions?|basis|interest|minimum|maximum)/i.test(after)) continue;
        if (/\b(?:prefer|prefers|preference for|value|values|wants?)\s+$/i.test(before)) continue;
        if (/\bnon-?$/i.test(before) || NEGATION.test(before.slice(-60))) continue;
        return true;
      }
      return false;
    });
}

export type GuardResult = {
  blocks: CompanionBlock[];
  validation: DraftValidation;
  release_blockers: string[];
  internal_review: string[];
};

export function blockIssues(
  body: string,
  planned: CompanionPlan["blocks"][number] | undefined,
  facts: Map<string, ExtractedFact>,
  ctx: { insured_structure: EvidencePacket["insured_structure"]; guaranteeLifetime: boolean },
): string[] {
  const issues: string[] = [];
  if (!planned) return ["Block is not in the plan."];
  const tokens = tokensIn(body);
  for (const t of tokens) {
    if (!planned.allowed_fact_ids.includes(t)) issues.push(`Uses a figure not allowed here (${t}).`);
    else if (facts.get(t)?.status !== "verified") issues.push(`Uses an unverified figure (${t}).`);
  }
  for (const r of planned.required_fact_ids) if (!tokens.includes(r)) issues.push(`Missing required figure (${r}).`);
  const prose = body.replace(TOKEN_RE, " ");
  if (/\d/.test(prose)) issues.push("Contains a number typed as text; numbers must come from verified figures.");
  if (/[<>{}]|https?:\/\//i.test(prose)) issues.push("Contains markup, braces or a link.");
  for (const p of PROHIBITED) if (hitNotNegated(prose, p.re, p.why)) issues.push(`Prohibited wording: ${p.why}.`);
  // A guarantee named only through its tokens ("The {{f.guarantee_name}} keeps…") is still a guarantee claim.
  const namesGuarantee = tokens.some((t) => t === "f.guarantee_name" || t === "f.guarantee_end_age" || t === "f.guarantee_end_year");
  if (affirmedGuarantee(prose) || (namesGuarantee && planned.purpose === "guaranteed")) {
    const usesGuaranteeFacts = tokens.some((t) => t.startsWith("f.guarantee") || t.startsWith("f.guaranteed"));
    if (!usesGuaranteeFacts && planned.purpose !== "illustrated") issues.push("Mentions a guarantee without citing the guarantee facts.");
    if (!CONDITION_WORD.test(prose)) issues.push("Mentions a guarantee without its conditions.");
  }
  if (/\blifetime\b/i.test(prose) && !ctx.guaranteeLifetime && /\bguarantee/i.test(prose)) issues.push("Describes a guarantee as lifetime without contractual evidence.");
  if (ctx.insured_structure === "survivorship") {
    if (hitNotNegated(prose, FIRST_DEATH, "first-death")) issues.push("Describes a survivorship policy as paying at the first death.");
    if (planned.block_id === "b.mechanism_benefit" && !SECOND_DEATH.test(prose)) issues.push("Survivorship benefit trigger (second death) is not stated.");
  }
  if (/\byou told your advisor|\byou said|\byou (?:want|prefer|need)\b/i.test(prose) && planned.purpose !== "objective" && planned.purpose !== "consideration")
    issues.push("Attributes a client statement outside the objective or discussion blocks.");
  if (/\[REDACTED|\[unverified\]/i.test(body) || detectResidual(body).length) issues.push("Contains redaction markers or personal identifiers.");
  if (injectionSignals(body).length) issues.push("Contains instruction-like text.");
  const words = wordCount(body);
  if (words > planned.max_words + 10) issues.push(`Too long for this block (${words} words).`);
  return issues;
}

export function guardDraft(args: {
  plan: CompanionPlan;
  packet: EvidencePacket;
  brief: ClientBrief;
  observations: Observation[];
  blocks: { block_id: string; body: string; client_ready?: boolean; author: "ai" | "producer" }[];
  writerInternal?: string[];
}): GuardResult {
  const facts = allFacts(args.packet, args.brief);
  const guaranteeLifetime = /lifetime/i.test(facts.get("f.guarantee_end_age")?.label ?? "");
  const out: CompanionBlock[] = [];
  const blockers: string[] = [...args.packet.blockers];
  const review: string[] = [...(args.writerInternal ?? [])];

  for (const planned of args.plan.blocks) {
    const w = args.blocks.find((b) => b.block_id === planned.block_id);
    if (!w) {
      if (planned.purpose !== "consideration") blockers.push(`missing_block:${planned.block_id}`);
      continue;
    }
    const issues = blockIssues(w.body, planned, facts, { insured_structure: args.packet.insured_structure, guaranteeLifetime });
    const tokens = tokensIn(w.body);
    const evidence = [...new Set(tokens.flatMap((t) => facts.get(t)?.source_refs ?? []))];
    const obsRefs = planned.observation_id ? args.observations.find((o) => o.observation_id === planned.observation_id)?.source_refs ?? [] : [];
    out.push({
      block_id: planned.block_id,
      purpose: planned.purpose,
      label: planned.label,
      body: w.body.trim().slice(0, 900),
      fact_ids: [...new Set(tokens)],
      evidence_refs: [...new Set([...evidence, ...obsRefs])].slice(0, 24),
      client_ready: issues.length === 0 && w.client_ready !== false,
      author: w.author,
      page: planned.page,
      issues: issues.slice(0, 10).map((i) => i.slice(0, 200)),
    });
  }
  for (const b of args.blocks) if (!args.plan.blocks.some((p) => p.block_id === b.block_id)) review.push(`Dropped an unplanned block (${b.block_id.slice(0, 40)}).`);

  const allIssues = out.flatMap((b) => b.issues);
  const totalWords = out.reduce((s, b) => s + wordCount(b.body), 0);
  const tokensOk = out.every((b) => b.fact_ids.every((t) => facts.get(t)?.status === "verified"));
  const numericOk = !allIssues.some((i) => /number typed|unverified figure|not allowed/.test(i));
  const piiOk = !allIssues.some((i) => /identifiers/.test(i));
  const langOk = !allIssues.some((i) => /Prohibited|Attributes|instruction-like|markup/.test(i));
  const guarOk = !allIssues.some((i) => /guarantee|survivorship|second death/i.test(i));
  const bandOk = args.plan.fact_band.every((fb) => fb.fact_ids.every((id) => facts.get(id)?.status === "verified" || fb.display === "See carrier illustration"));
  const material = args.packet.facts.filter((f) => f.material && f.status !== "verified" && ["f.insurer", "f.product_name", "f.planned_premium_outlay", "f.initial_death_benefit", "f.illustration_date", "f.document_kind"].includes(f.fact_id));
  const materialOk = material.length === 0 && bandOk;
  const pointerOk = out.every((b) => b.evidence_refs.every((r) => r.startsWith("e.brief.") || args.packet.refs.some((x) => x.evidence_id === r)));

  if (out.some((b) => !b.client_ready)) blockers.push("blocks_need_attention");
  if (!materialOk) for (const f of material) blockers.push(`unverified_material_fact:${f.fact_id}`);
  if (totalWords > args.plan.word_budget.hard_max) blockers.push("over_word_budget");
  if (args.packet.document_kind !== "proposed_sales" && args.packet.document_kind !== "revised_sales") blockers.push("document_not_confirmed_as_sales_illustration");
  for (const v of verificationItems(args.observations)) review.push(`Verify: ${v.review_action}`);

  const validation: DraftValidation = {
    schema_ok: out.length > 0,
    numeric_concordance_ok: numericOk && tokensOk,
    material_evidence_ok: materialOk,
    source_pointer_ok: pointerOk,
    pii_ok: piiOk,
    prohibited_language_ok: langOk,
    guarantee_conditions_ok: guarOk,
    word_count: totalWords,
    client_release_eligible: false,
  };
  validation.client_release_eligible =
    validation.schema_ok &&
    validation.numeric_concordance_ok &&
    validation.material_evidence_ok &&
    validation.source_pointer_ok &&
    validation.pii_ok &&
    validation.prohibited_language_ok &&
    validation.guarantee_conditions_ok &&
    blockers.length === 0;

  return { blocks: out, validation, release_blockers: [...new Set(blockers)].slice(0, 30), internal_review: [...new Set(review)].slice(0, 20) };
}

/** Strict parse of raw model text: one JSON object, no repairs, no fences. */
export function parseModelJson(raw: unknown): { ok: true; value: unknown } | { ok: false; error: string } {
  if (typeof raw !== "string") return isPlainObject(raw) ? { ok: true, value: raw } : { ok: false, error: "not_text" };
  const t = raw.trim();
  if (!t.startsWith("{") || !t.endsWith("}")) return { ok: false, error: "not_a_json_object" };
  try {
    return { ok: true, value: JSON.parse(t) };
  } catch {
    return { ok: false, error: "invalid_json" };
  }
}
const isPlainObject = (v: unknown) => !!v && typeof v === "object" && !Array.isArray(v);

export function parseWriter(raw: unknown) {
  const j = parseModelJson(raw);
  if (!j.ok) return { ok: false as const, error: j.error };
  const p = writerOutputSchema.safeParse(j.value);
  return p.success ? { ok: true as const, value: p.data } : { ok: false as const, error: `schema:${p.error.issues[0]?.path.join(".")}:${p.error.issues[0]?.message}`.slice(0, 200) };
}

export function parseAnalyst(raw: unknown, observations: Observation[], facts: Map<string, ExtractedFact>): AnalystOutput | null {
  const j = parseModelJson(raw);
  if (!j.ok) return null;
  const p = analystOutputSchema.safeParse(j.value);
  if (!p.success) return null;
  const known = new Set(observations.map((o) => o.observation_id));
  return {
    ...p.data,
    priorities: p.data.priorities.filter((id) => known.has(id)),
    internal_notes: p.data.internal_notes
      .filter((n) => n.fact_ids.every((id) => facts.has(id)))
      .filter((n) => !detectResidual(n.text).length && !injectionSignals(n.text).length),
  };
}

export function assembleDraft(args: {
  case_id: string;
  revision: number;
  packet: EvidencePacket;
  brief: ClientBrief;
  plan: CompanionPlan;
  observations: Observation[];
  guard: GuardResult;
  writer: { model: string | null; workflow_version: string | null };
}): CompanionDraft {
  return {
    schema_version: VERSIONS.draft,
    case_id: args.case_id,
    revision: args.revision,
    document_fingerprint: args.packet.document_fingerprint,
    evidence_packet_version: `${args.packet.schema_version}@${args.packet.built_at}`,
    brief_version: VERSIONS.brief,
    analysis_version: `${VERSIONS.planner}+${VERSIONS.guard}`,
    prompt_version: `${VERSIONS.analyst_prompt}+${VERSIONS.writer_prompt}`,
    rules_version: VERSIONS.rules,
    template_version: VERSIONS.template,
    mode: args.plan.mode,
    plan: args.plan,
    blocks: args.guard.blocks,
    internal_observations: args.observations,
    internal_review: args.guard.internal_review,
    release_blockers: args.guard.release_blockers,
    validation: args.guard.validation,
    writer: args.writer,
  };
}
