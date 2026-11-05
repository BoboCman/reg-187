/**
 * PolicyPlan · Illustration Companion — versioned contracts.
 *
 * Every payload that crosses a trust boundary (browser → API, n8n → callback,
 * LLM → guard, DB → renderer) is parsed with one of these schemas. Never cast
 * parsed JSON to these types without going through `.parse`/`.safeParse`.
 *
 * Imports in lib/companion are relative on purpose: the same modules are
 * compiled stand-alone for the test runner (tsconfig.test.json).
 */
import { z } from "zod";

export const VERSIONS = {
  brief: "companion-brief.v1",
  evidence: "companion-evidence.v1",
  rules: "companion-rules.v1",
  planner: "companion-planner.v1",
  analyst_prompt: "companion_analyst.v1",
  writer_prompt: "companion_writer.v1",
  guard: "companion-guard.v1",
  template: "companion-template.v1",
  draft: "companion.v1",
} as const;

/* ── Evidence ──────────────────────────────────────────────────────────── */

export const evidenceStatus = z.enum(["verified", "needs_review", "not_found", "contradictory"]);
export type EvidenceStatus = z.infer<typeof evidenceStatus>;

export const evidenceKind = z.enum([
  "illustration_fact",
  "ledger_value",
  "guarantee_provision",
  "client_declaration",
  "advisor_note",
  "derived_calculation",
  "advisor_correction",
]);
export type EvidenceKind = z.infer<typeof evidenceKind>;

export const scenarioId = z.enum(["current", "guaranteed", "alternate"]);
export type ScenarioId = z.infer<typeof scenarioId>;

export const sourceRefSchema = z
  .object({
    evidence_id: z.string().regex(/^e\.[a-z0-9_.-]+$/),
    source_document_id: z.string().nullable(),
    page_number: z.number().int().positive().optional(),
    table_id: z.string().max(40).optional(),
    row_id: z.string().max(40).optional(),
    text_span: z.object({ start: z.number().int().nonnegative(), end: z.number().int().nonnegative() }).optional(),
    raw_excerpt_redacted: z.string().max(400).optional(),
    scenario_id: scenarioId.optional(),
    policy_year: z.number().int().positive().optional(),
    age_basis: z.string().max(60).optional(),
    measure_identity: z.string().max(60).optional(),
    evidence_type: evidenceKind,
    verification_status: evidenceStatus,
  })
  .strict();
export type SourceRef = z.infer<typeof sourceRefSchema>;

export const factValue = z.union([z.string().max(600), z.number(), z.boolean(), z.null(), z.array(z.string().max(200)).max(20)]);

export const factUnit = z.enum(["usd", "age", "years", "policy_year", "percent", "date", "text", "list", "bool", "count"]);
export type FactUnit = z.infer<typeof factUnit>;

export const extractedFactSchema = z
  .object({
    fact_id: z.string().regex(/^f\.[a-z0-9_.]+$/),
    semantic_key: z.string().max(60),
    label: z.string().max(80),
    value: factValue,
    unit: factUnit,
    source_refs: z.array(z.string()).max(8),
    scenario_id: scenarioId.optional(),
    policy_year: z.number().int().positive().optional(),
    age_basis: z.string().max(60).optional(),
    status: evidenceStatus,
    material: z.boolean(),
    notes: z.array(z.string().max(300)).max(6).optional(),
    corrected: z
      .object({
        original_value: factValue,
        reason: z.string().max(500),
        source_page: z.number().int().positive().nullable(),
        by: z.string(),
        at: z.string(),
      })
      .optional(),
  })
  .strict();
export type ExtractedFact = z.infer<typeof extractedFactSchema>;

export const documentKind = z.enum(["proposed_sales", "revised_sales", "in_force", "other", "unknown"]);
export type DocumentKind = z.infer<typeof documentKind>;

export const productClass = z.enum(["UL", "GUL", "IUL", "WL", "VUL", "TERM", "UNKNOWN"]);
export type ProductClass = z.infer<typeof productClass>;

export const evidencePacketSchema = z
  .object({
    schema_version: z.literal("companion-evidence.v1"),
    source_document_id: z.string(),
    document_fingerprint: z.string(),
    page_count: z.number().int().nonnegative(),
    document_kind: documentKind,
    product_class: productClass,
    insured_structure: z.enum(["single", "survivorship", "joint_first_death", "unknown"]),
    extractor: z.object({ atlas1: z.string().nullable(), atlas2: z.string().nullable(), parser: z.string().nullable() }),
    facts: z.array(extractedFactSchema),
    refs: z.array(sourceRefSchema),
    ledger: z
      .array(
        z.object({
          policy_year: z.number().int().positive(),
          age: z.number().int().nullable(),
          premium: z.number().nullable(),
          sv_guaranteed: z.number().nullable(),
          db_guaranteed: z.number().nullable(),
          sv_current: z.number().nullable(),
          db_current: z.number().nullable(),
          lapsed_guaranteed: z.boolean(),
          // Optional columns used by the story playback (older packets do not carry them).
          cv_current: z.number().nullable().optional(),
          distribution: z.number().nullable().optional(),
        }),
      )
      .max(130),
    extraction_warnings: z.array(z.string().max(300)).max(40),
    blockers: z.array(z.string().max(120)).max(20),
    built_at: z.string(),
  })
  .strict();
export type EvidencePacket = z.infer<typeof evidencePacketSchema>;

/* ── Case metadata and client objective brief ──────────────────────────── */

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA",
  "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR",
  "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

const shortText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((s) => !/[<>]/.test(s), "Angle brackets are not allowed.");

export const caseMetaSchema = z
  .object({
    sales_jurisdiction: z.enum(US_STATES),
    other_jurisdictions_involved: z.enum(["no", "yes", "unsure"]).default("no"),
    producer_display_name: shortText(120).optional(),
    case_label: shortText(60).optional(), // advisor's own non-identifying label, e.g. "Case 14"
    story_key: z.enum(["apartment"]).optional(), // a PolicyPlan Story case; absent for the original Companion flow
  })
  .strict();
export type CaseMeta = z.infer<typeof caseMetaSchema>;

export const objectiveCode = z.enum([
  "family_protection",
  "lifetime_coverage",
  "estate_liquidity",
  "business_continuity",
  "cash_accumulation",
  "supplemental_income",
  "other",
]);
export type ObjectiveCode = z.infer<typeof objectiveCode>;

export const priorityCode = z.enum(["guarantees", "flexibility", "cash_access", "growth", "low_outlay", "other"]);
export type PriorityCode = z.infer<typeof priorityCode>;

export const clientBriefSchema = z
  .object({
    version: z.literal("companion-brief.v1"),
    // Q1
    primary_objective: objectiveCode.nullable(),
    primary_objective_other: shortText(160).nullable().optional(),
    secondary_objective: objectiveCode.nullable().optional(),
    objective_holder: z.enum(["insured", "owner_trust", "owner_business", "family", "not_discussed"]).nullable().optional(),
    // Q2
    coverage_need_basis: z.enum(["advisor_analysis", "client_target", "existing_plan", "not_yet_determined"]).nullable(),
    coverage_need_amount: z.number().int().positive().max(1_000_000_000).nullable().optional(),
    // Q3
    target_horizon: z
      .object({
        type: z.enum(["age", "years", "lifetime", "second_death", "unknown"]),
        value: z.number().int().positive().max(121).nullable().optional(),
      })
      .strict()
      .nullable(),
    // Q4
    funding_comfort: z.enum(["expected", "uncertain", "not_discussed", "requires_source", "other"]).nullable(),
    funding_notes: shortText(300).nullable().optional(),
    // Q5
    top_priority: priorityCode.nullable(),
    secondary_priority: priorityCode.nullable().optional(),
    // Q6
    existing_policy_connection: z.enum(["no", "yes", "unsure"]).nullable(),
    existing_policy_notes: shortText(300).nullable().optional(),
    // Conditional follow-ups (only asked when triggered)
    followups: z
      .object({
        access_start: z.enum(["within_10_years", "after_10_years", "not_planned", "not_discussed"]).nullable().optional(),
        access_need: z.enum(["needed", "desired", "not_discussed"]).nullable().optional(),
        guarantee_central: z.enum(["guarantee_central", "accumulation_central", "both", "not_discussed"]).nullable().optional(),
        owner_role_note: shortText(200).nullable().optional(),
        rider_matters: z.enum(["yes", "no", "not_discussed"]).nullable().optional(),
      })
      .strict()
      .default({}),
    other_notes: shortText(500).nullable().optional(),
    declarant_role: z.literal("producer_reporting_client_statements").default("producer_reporting_client_statements"),
  })
  .strict();
export type ClientBrief = z.infer<typeof clientBriefSchema>;

export const EMPTY_BRIEF: ClientBrief = {
  version: "companion-brief.v1",
  primary_objective: null,
  coverage_need_basis: null,
  target_horizon: null,
  funding_comfort: null,
  top_priority: null,
  existing_policy_connection: null,
  followups: {},
  declarant_role: "producer_reporting_client_statements",
};

/** A brief is complete when every core question has an answer ("not discussed" counts as an answer). */
export function briefMissing(b: ClientBrief): string[] {
  const missing: string[] = [];
  if (!b.primary_objective) missing.push("primary_objective");
  if (b.primary_objective === "other" && !b.primary_objective_other) missing.push("primary_objective_other");
  if (!b.coverage_need_basis) missing.push("coverage_need_basis");
  if (b.coverage_need_basis && b.coverage_need_basis !== "not_yet_determined" && !b.coverage_need_amount)
    missing.push("coverage_need_amount");
  if (!b.target_horizon) missing.push("target_horizon");
  if (b.target_horizon && (b.target_horizon.type === "age" || b.target_horizon.type === "years") && !b.target_horizon.value)
    missing.push("target_horizon.value");
  if (!b.funding_comfort) missing.push("funding_comfort");
  if (!b.top_priority) missing.push("top_priority");
  if (!b.existing_policy_connection) missing.push("existing_policy_connection");
  return missing;
}

/* ── Observations, plan and blocks ─────────────────────────────────────── */

export const observationSchema = z
  .object({
    observation_id: z.string().regex(/^o\.[a-z0-9_]+$/),
    category: z.enum([
      "payment_conditions",
      "guarantee_scope",
      "reliance_on_assumptions",
      "access_to_cash",
      "income_strategy",
      "horizon",
      "coverage_amount",
      "existing_coverage",
      "ownership_structure",
      "rider_dependency",
      "coverage_components",
      "evidence_gap",
    ]),
    trigger: z.string().max(160),
    related_objective: z.string().max(60).optional(),
    fact_ids: z.array(z.string()).max(10),
    source_refs: z.array(z.string()).max(12),
    rule_id: z.string(),
    severity: z.enum(["material", "moderate", "minor"]),
    status: z.enum(["supported", "verification_required", "suppressed"]),
    external_candidate: z.boolean(),
    client_heading: z.string().max(40).optional(),
    editorial_guidance: z.string().max(500),
    review_action: z.string().max(300),
    priority_score: z.number(),
  })
  .strict();
export type Observation = z.infer<typeof observationSchema>;

export const blockPurpose = z.enum(["objective", "mechanism", "guaranteed", "illustrated", "consideration"]);
export type BlockPurpose = z.infer<typeof blockPurpose>;

/** What the trusted planner hands the writer for one block. */
export const plannedBlockSchema = z
  .object({
    block_id: z.string().regex(/^b\.[a-z0-9_]+$/),
    purpose: blockPurpose,
    label: z.string().max(60),
    guidance: z.string().max(600),
    allowed_fact_ids: z.array(z.string()).max(12),
    required_fact_ids: z.array(z.string()).max(6),
    observation_id: z.string().optional(),
    max_words: z.number().int().positive().max(80),
    page: z.union([z.literal(1), z.literal(2)]),
  })
  .strict();
export type PlannedBlock = z.infer<typeof plannedBlockSchema>;

export const factBandItemSchema = z
  .object({
    key: z.string(),
    label: z.string().max(50),
    fact_ids: z.array(z.string()).min(1).max(3),
    display: z.string().max(80), // rendered value, e.g. "$22,575 a year"
    qualifier: z.string().max(90).optional(), // e.g. "If premiums are paid as illustrated"
  })
  .strict();
export type FactBandItem = z.infer<typeof factBandItemSchema>;

export const milestoneRowSchema = z
  .object({
    policy_year: z.number().int().positive(),
    age: z.number().int().nullable(),
    cumulative_outlay_fact: z.string().nullable(),
    sv_guaranteed_fact: z.string().nullable(),
    db_guaranteed_fact: z.string().nullable(),
    sv_current_fact: z.string().nullable(),
    db_current_fact: z.string().nullable(),
  })
  .strict();

export const companionPlanSchema = z
  .object({
    schema_version: z.literal("companion-planner.v1"),
    design_family: z.enum(["protection", "accumulation", "income", "survivorship_estate", "whole_life", "variable"]),
    fact_band: z.array(factBandItemSchema).max(4),
    blocks: z.array(plannedBlockSchema).max(10),
    milestones: z.array(milestoneRowSchema).max(5),
    mode: z.enum(["explanatory", "numbers_enhanced"]),
    word_budget: z.object({ target_min: z.number(), target_max: z.number(), hard_max: z.number() }),
    two_page: z.boolean(),
    source_pages: z.array(z.number().int().positive()).max(20),
  })
  .strict();
export type CompanionPlan = z.infer<typeof companionPlanSchema>;

/** Text-only block returned by the writer (validated by the guard). */
export const writerBlockSchema = z
  .object({
    block_id: z.string().regex(/^b\.[a-z0-9_]+$/),
    body: z.string().min(1).max(700),
    fact_ids: z.array(z.string()).max(12),
    client_ready: z.boolean(),
  })
  .strict();

export const writerOutputSchema = z
  .object({
    schema: z.literal("companion_writer.v1"),
    blocks: z.array(writerBlockSchema).min(1).max(10),
    internal_review: z.array(z.string().max(300)).max(10),
    length_flag: z.enum(["fits", "needs_second_page", "over_budget"]),
  })
  .strict();
export type WriterOutput = z.infer<typeof writerOutputSchema>;

export const analystOutputSchema = z
  .object({
    schema: z.literal("companion_analyst.v1"),
    priorities: z.array(z.string().regex(/^o\.[a-z0-9_]+$/)).max(10),
    internal_notes: z
      .array(z.object({ text: z.string().max(300), fact_ids: z.array(z.string()).max(6) }).strict())
      .max(8),
    verification_questions: z.array(z.string().max(300)).max(6),
    blockers: z.array(z.string().max(200)).max(6),
  })
  .strict();
export type AnalystOutput = z.infer<typeof analystOutputSchema>;

/** Rendered, guarded block persisted on a draft. */
export const companionBlockSchema = z
  .object({
    block_id: z.string(),
    purpose: blockPurpose,
    label: z.string().max(60),
    body: z.string().max(900), // contains {{f.fact_id}} tokens, never raw numbers
    fact_ids: z.array(z.string()).max(12),
    evidence_refs: z.array(z.string()).max(24),
    client_ready: z.boolean(),
    author: z.enum(["ai", "producer"]),
    page: z.union([z.literal(1), z.literal(2)]),
    issues: z.array(z.string().max(200)).max(10),
  })
  .strict();
export type CompanionBlock = z.infer<typeof companionBlockSchema>;

export const validationSchema = z
  .object({
    schema_ok: z.boolean(),
    numeric_concordance_ok: z.boolean(),
    material_evidence_ok: z.boolean(),
    source_pointer_ok: z.boolean(),
    pii_ok: z.boolean(),
    prohibited_language_ok: z.boolean(),
    guarantee_conditions_ok: z.boolean(),
    word_count: z.number().int().nonnegative(),
    client_release_eligible: z.boolean(),
  })
  .strict();
export type DraftValidation = z.infer<typeof validationSchema>;

export const companionDraftSchema = z
  .object({
    schema_version: z.literal("companion.v1"),
    case_id: z.string(),
    revision: z.number().int().positive(),
    document_fingerprint: z.string(),
    evidence_packet_version: z.string(),
    brief_version: z.string(),
    analysis_version: z.string(),
    prompt_version: z.string(),
    rules_version: z.string(),
    template_version: z.string(),
    mode: z.enum(["explanatory", "numbers_enhanced"]),
    plan: companionPlanSchema,
    blocks: z.array(companionBlockSchema),
    internal_observations: z.array(observationSchema),
    internal_review: z.array(z.string().max(300)).max(20),
    release_blockers: z.array(z.string().max(200)),
    validation: validationSchema,
    writer: z.object({ model: z.string().nullable(), workflow_version: z.string().nullable() }).strict(),
  })
  .strict();
export type CompanionDraft = z.infer<typeof companionDraftSchema>;

/* ── Release policy (firm/legal approval of the document format) ───────── */

export const releasePolicySchema = z.object({
  advisor_id: z.string(),
  external_client_export_allowed: z.boolean(),
  enhanced_numeric_mode_allowed: z.boolean(),
  approved_jurisdictions: z.array(z.string()),
  approved_product_classes: z.array(z.string()),
  approval_reference: z.string().nullable(),
  effective_at: z.string().nullable(),
  expires_at: z.string().nullable(),
});
export type ReleasePolicy = z.infer<typeof releasePolicySchema>;

/* ── Case phases ───────────────────────────────────────────────────────── */

export const casePhase = z.enum([
  "created",
  "document_received",
  "extraction_pending",
  "extracted_needs_review",
  "intake_ready",
  "analysis_pending",
  "draft_ready",
  "producer_review",
  "approved",
  "exported",
  "failed_retryable",
  "blocked_privacy",
  "blocked_unsupported",
  "blocked_evidence",
  "superseded",
  "archived",
]);
export type CasePhase = z.infer<typeof casePhase>;
