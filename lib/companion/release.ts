/**
 * Release gate and approval scope. Two separate levels (spec §13.3):
 *   1. Case-level technical verification by the producer (validation + checks).
 *   2. Firm/legal approval of the document format for client use, recorded in
 *      policyplan_release_policies by the platform operator. A producer click
 *      can never set level 2.
 */
import { createHash } from "node:crypto";
import type { CompanionDraft, ReleasePolicy } from "./contracts";

export type GateInput = {
  draft: CompanionDraft;
  policy: ReleasePolicy | null;
  jurisdiction: string | null;
  productClass: string;
  now?: Date;
};

export type GateResult = {
  client_export_allowed: boolean;
  enhanced_allowed: boolean;
  reasons: string[];
};

export function releaseGate({ draft, policy, jurisdiction, productClass, now = new Date() }: GateInput): GateResult {
  const reasons: string[] = [];
  if (!policy || !policy.external_client_export_allowed) reasons.push("Your firm's approval of this document for client use is not recorded.");
  if (policy?.effective_at && new Date(policy.effective_at) > now) reasons.push("The firm approval is not yet effective.");
  if (policy?.expires_at && new Date(policy.expires_at) <= now) reasons.push("The firm approval has expired.");
  if (policy && jurisdiction && policy.approved_jurisdictions.length && !policy.approved_jurisdictions.includes(jurisdiction))
    reasons.push(`Client use is not approved for ${jurisdiction}.`);
  if (policy && policy.approved_product_classes.length && !policy.approved_product_classes.includes(productClass))
    reasons.push(`Client use is not approved for ${productClass} illustrations.`);
  if (draft.mode === "numbers_enhanced" && !policy?.enhanced_numeric_mode_allowed) reasons.push("The numbers-enhanced format is not approved for your firm.");
  if (!draft.validation.client_release_eligible) reasons.push("The draft has unresolved checks.");
  return { client_export_allowed: reasons.length === 0, enhanced_allowed: !!policy?.enhanced_numeric_mode_allowed, reasons };
}

/** Everything an approval is scoped to. Any change produces a different hash. */
export function approvalScope(args: {
  case_id: string;
  revision: number;
  draft: CompanionDraft;
  advisor_id: string;
  verified_items: string[];
}) {
  const scope = {
    case_id: args.case_id,
    revision: args.revision,
    tenant: args.advisor_id,
    document_fingerprint: args.draft.document_fingerprint,
    evidence_packet_version: args.draft.evidence_packet_version,
    brief_version: args.draft.brief_version,
    analysis_version: args.draft.analysis_version,
    prompt_version: args.draft.prompt_version,
    rules_version: args.draft.rules_version,
    template_version: args.draft.template_version,
    mode: args.draft.mode,
    blocks: args.draft.blocks.map((b) => ({ id: b.block_id, body: b.body, author: b.author })),
    fact_band: args.draft.plan.fact_band,
    verified_items: [...args.verified_items].sort(),
  };
  return { scope, hash: sha256(stableStringify(scope)) };
}

export function sha256(s: string | Uint8Array): string {
  return createHash("sha256").update(s).digest("hex");
}

export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .filter((k) => o[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(",")}}`;
}
