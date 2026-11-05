/**
 * Second-pass privacy gate for the model-facing text. Runs in the browser on
 * the exact string that will be transmitted, and again on the server.
 *
 * The pdf.js worker already scrubs names the producer typed, SSNs, dates of
 * birth, addresses, phones and e-mails. This pass catches what the worker is
 * known to miss (single-token names, phone formats) and reports residue
 * honestly instead of claiming the text is clean.
 */

export type PrivacyFinding = { kind: "name" | "phone" | "email" | "ssn" | "dob" | "account"; count: number };
export type PrivacyResult = { text: string; removed: PrivacyFinding[]; residual: PrivacyFinding[] };

const PATTERNS: { kind: PrivacyFinding["kind"]; re: RegExp; tag: string }[] = [
  { kind: "email", re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, tag: "[REDACTED EMAIL]" },
  { kind: "ssn", re: /\b\d{3}-\d{2}-\d{4}\b/g, tag: "[REDACTED SSN]" },
  {
    kind: "phone",
    // Parenthesised area code, or dash/dot separators. Space-only triples are
    // left alone so ledger rows ("110 999 1000") are never mistaken for phones.
    re: /(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?\d{3}[\s.-]\d{4}|\b\d{3}[.-]\d{3}[.-]\d{4})\b/g,
    tag: "[REDACTED PHONE]",
  },
  {
    kind: "dob",
    re: /\b(?:date of birth|DOB|birth ?date)\s*[:#]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/gi,
    tag: "[REDACTED DOB]",
  },
  {
    kind: "account",
    re: /\b(?:policy|contract|account)\s*(?:no\.?|number|#)\s*[:#]?\s*[A-Z]{0,3}\d{6,14}[A-Z]?\b/gi,
    tag: "[REDACTED NUMBER]",
  },
];

function nameRegex(name: string): RegExp | null {
  const tokens = name
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[^A-Za-z'\-]/g, ""))
    .filter((t) => t.length >= 3);
  if (!tokens.length) return null;
  const alt = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`\\b(?:${alt})\\b`, "gi");
}

/** Removes residual identifiers. `names` are only available in the browser. */
export function screenText(text: string, names: string[] = []): PrivacyResult {
  let out = text;
  const removed: PrivacyFinding[] = [];
  // Patterns first, so an email such as first.last@x is removed whole.
  for (const p of PATTERNS) {
    const c = (out.match(p.re) ?? []).length;
    if (c) {
      out = out.replace(p.re, p.tag);
      bump(removed, p.kind, c);
    }
  }
  for (const n of names) {
    const re = nameRegex(n);
    if (!re) continue;
    const c = (out.match(re) ?? []).length;
    if (c) {
      out = out.replace(re, "[REDACTED NAME]");
      bump(removed, "name", c);
    }
  }
  return { text: out, removed, residual: detectResidual(out) };
}

/** Server-side check: anything still matching after the browser pass is residue. */
export function detectResidual(text: string): PrivacyFinding[] {
  const residual: PrivacyFinding[] = [];
  for (const p of PATTERNS) {
    const c = (text.match(p.re) ?? []).length;
    if (c) bump(residual, p.kind, c);
  }
  return residual;
}

function bump(list: PrivacyFinding[], kind: PrivacyFinding["kind"], n: number) {
  const f = list.find((x) => x.kind === kind);
  if (f) f.count += n;
  else list.push({ kind, count: n });
}

/** Prompt-injection markers in source text; reported, and fenced as data downstream. */
export function injectionSignals(text: string): string[] {
  const hits: string[] = [];
  const checks: [string, RegExp][] = [
    ["ignore_instructions", /ignore (?:all |any )?(?:previous|prior|above) (?:instructions|rules)/i],
    ["system_prompt", /\b(?:system prompt|you are (?:now )?(?:chatgpt|an ai|the assistant))\b/i],
    ["role_tag", /<\/?(?:system|assistant|instructions?)>/i],
    ["output_override", /\b(?:respond only with|output the following|disregard the schema)\b/i],
  ];
  for (const [k, re] of checks) if (re.test(text)) hits.push(k);
  return hits;
}
