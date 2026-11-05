/**
 * Renders the fictional demonstration companions through the real pipeline:
 * evidence builder → rules → planner → guard → renderer. Used by the public
 * /sample-companion page and by the tests. Nothing here calls a model.
 */
import type { CompanionDraft, EvidencePacket, ExtractedFact } from "./contracts";
import { buildEvidencePacket } from "./evidence";
import { assembleDraft, guardDraft } from "./guard";
import { splitPages } from "./pages";
import { allFacts, buildPlan } from "./planner";
import { buildCompanionHtml, type CompanionBranding } from "./render";
import { runRules } from "./rules";
import { sampleByKey, type SampleCase } from "./samples";

export const SAMPLE_BRANDING: CompanionBranding = {
  advisor_name: "Jordan Ellis",
  advisor_credentials: "CLU, ChFC",
  firm_name: "Example Financial Group",
  phone: "(555) 010-0100",
  email: "jordan.ellis@example.com",
  brand_primary_color: "#1f3a5f",
};

export function buildSample(sample: SampleCase): { draft: CompanionDraft; packet: EvidencePacket; facts: Map<string, ExtractedFact> } {
  const pages = splitPages(sample.pagesText);
  const packet = buildEvidencePacket({ atlas1: sample.atlas1, atlas2Registry: sample.atlas2Registry }, pages, { fingerprint: sample.fingerprint, page_count: sample.pageCount }, "2026-11-05T00:00:00.000Z");
  const observations = runRules(packet, sample.brief);
  const plan = buildPlan(packet, sample.brief, observations, { numbersEnhanced: false });
  const guard = guardDraft({ plan, packet, brief: sample.brief, observations, blocks: sample.writer.blocks.map((b) => ({ ...b, author: "ai" as const })) });
  const draft = assembleDraft({ case_id: `sample-${sample.key}`, revision: 1, packet, brief: sample.brief, plan, observations, guard, writer: { model: "fixture", workflow_version: null } });
  return { draft, packet, facts: allFacts(packet, sample.brief) };
}

export function sampleHtml(key: string | null | undefined): string {
  const s = sampleByKey(key);
  const { draft, packet, facts } = buildSample(s);
  if (!draft.validation.client_release_eligible) throw new Error(`sample ${s.key} failed its own checks: ${draft.release_blockers.join(", ")}`);
  return buildCompanionHtml(draft, packet, facts, SAMPLE_BRANDING, { state: "sample", preparedAt: "2026-11-05T00:00:00.000Z" });
}
