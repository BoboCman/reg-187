/**
 * POLICYPLAN — 187 LETTER CONTRACT (v1.0)
 *
 * The shape the n8n "PolicyPlan 187 Letter" workflow posts back to
 * /api/policyplan/callback. The workflow's Letter QA node emits exactly this.
 * The letter is written in the advisor's first-person voice, to the client,
 * and must carry both the favorable and unfavorable considerations
 * (11 NYCRR 224.4(f)(1)).
 */

import { z } from "zod";

export const LETTER_CONTRACT_VERSION = "1.0";

export const letterSectionIdEnum = z.enum([
  "why_we_met",
  "recommendation",
  "why_it_fits",
  "what_to_weigh",
  "guaranteed_vs_illustrated",
  "replacement",
  "next_steps",
]);
export type LetterSectionId = z.infer<typeof letterSectionIdEnum>;

export const LETTER_SECTION_TITLES: Record<LetterSectionId, string> = {
  why_we_met: "What you told me matters most",
  recommendation: "What I recommend",
  why_it_fits: "Why it fits you",
  what_to_weigh: "What to weigh before you decide",
  guaranteed_vs_illustrated: "What is guaranteed and what is not",
  replacement: "Replacing your current coverage",
  next_steps: "Next steps",
};

const quoteSchema = z.object({
  text: z.string().min(1),
  source: z.string().optional(), // e.g. "Illustration p. 4"
});

export const letterSectionSchema = z.object({
  id: letterSectionIdEnum,
  title: z.string().min(1),
  paragraphs: z.array(z.string()).default([]),
  bullets: z.array(z.string()).default([]),
  quotes: z.array(quoteSchema).default([]),
});
export type LetterSection = z.infer<typeof letterSectionSchema>;

export const policySnapshotSchema = z
  .object({
    carrier: z.string().nullish(),
    product: z.string().nullish(),
    product_type: z.string().nullish(),
    face_amount: z.number().nullish(),
    annual_premium: z.number().nullish(),
    premium_years: z.string().nullish(),
    insured_age: z.number().nullish(),
    risk_class: z.string().nullish(),
    illustrated_rate: z.string().nullish(),
    illustration_date: z.string().nullish(),
  })
  .partial();
export type PolicySnapshot = z.infer<typeof policySnapshotSchema>;

export const letterTensionSchema = z.object({
  code: z.string(),
  severity: z.enum(["high", "moderate", "low"]).default("moderate"),
  title: z.string(),
  detail: z.string(),
});
export type LetterTension = z.infer<typeof letterTensionSchema>;

export const letterSchema = z.object({
  contract_version: z.string().default(LETTER_CONTRACT_VERSION),
  salutation: z.string().min(1),
  opening: z.string().min(1),
  sections: z.array(letterSectionSchema).min(1),
  closing: z.string().min(1),
  policy_snapshot: policySnapshotSchema.default({}),
  tensions: z.array(letterTensionSchema).default([]),
});
export type Letter = z.infer<typeof letterSchema>;

export const qaSchema = z
  .object({
    passed: z.boolean(),
    checks: z
      .array(z.object({ id: z.string(), passed: z.boolean(), detail: z.string().optional() }))
      .default([]),
  })
  .passthrough();

export const callbackSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("draft"),
    output_id: z.string().uuid(),
    workflow_version: z.string().optional(),
    letter: letterSchema,
    extraction: z.record(z.unknown()).optional(),
    qa: qaSchema.optional(),
  }),
  z.object({
    status: z.literal("error"),
    output_id: z.string().uuid(),
    workflow_version: z.string().optional(),
    error: z.string().max(2000).default("workflow_error"),
  }),
]);
export type CallbackBody = z.infer<typeof callbackSchema>;

/**
 * Markdown rendering of the letter. Stored in policyplan_outputs.advisor_letter
 * so the existing DocumentRenderer can show it until the letter view lands.
 */
export function letterToMarkdown(letter: Letter): string {
  const out: string[] = [letter.salutation, "", letter.opening, ""];
  for (const s of letter.sections) {
    out.push(`## ${s.title}`, "");
    for (const p of s.paragraphs) out.push(p, "");
    if (s.bullets.length) {
      for (const b of s.bullets) out.push(`- ${b}`);
      out.push("");
    }
    for (const q of s.quotes) {
      out.push(`> ${q.text}${q.source ? ` (${q.source})` : ""}`, "");
    }
  }
  out.push(letter.closing);
  return out.join("\n").trim() + "\n";
}
