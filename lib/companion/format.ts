/** Deterministic display formatting for fact values. The only place numbers become text. */
import type { ExtractedFact } from "./contracts";

export function formatUsd(v: number): string {
  return "$" + Math.round(v).toLocaleString("en-US");
}

export function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function formatFactValue(f: Pick<ExtractedFact, "value" | "unit">): string {
  const v = f.value;
  if (v == null) return "";
  if (Array.isArray(v)) return v.join("; ");
  if (typeof v === "boolean") return v ? "yes" : "no";
  switch (f.unit) {
    case "usd":
      return typeof v === "number" ? formatUsd(v) : String(v);
    case "percent":
      return typeof v === "number" ? `${v.toFixed(2)}%` : String(v);
    case "date":
      return formatDate(String(v));
    case "age":
    case "years":
    case "policy_year":
    case "count":
      return typeof v === "number" ? String(Math.round(v)) : String(v);
    default:
      return String(v);
  }
}

export const TOKEN_RE = /\{\{\s*(f\.[a-z0-9_.]+)\s*\}\}/g;

/** Replaces {{f.id}} tokens with formatted values. Unknown tokens render as a visible marker. */
export function substituteTokens(body: string, facts: Map<string, ExtractedFact>): string {
  return body.replace(TOKEN_RE, (_, id: string) => {
    const f = facts.get(id);
    return f && f.value != null ? formatFactValue(f) : "[unverified]";
  });
}

export function tokensIn(body: string): string[] {
  return [...body.matchAll(TOKEN_RE)].map((m) => m[1]);
}

export function wordCount(s: string): number {
  return s.replace(TOKEN_RE, "X").split(/\s+/).filter(Boolean).length;
}
