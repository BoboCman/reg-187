/**
 * Page-numbered, redacted source packet: the exact text the extractor saw.
 * Evidence pointers are resolved against these strings, nothing else.
 */

export type SourcePage = { page_number: number; text: string };

const MARKER = /---\s*PAGE\s+(\d+)\s*---/gi;

/** Splits worker output ("--- PAGE n ---" markers) into normalized pages. */
export function splitPages(redactedText: string): SourcePage[] {
  const pages: SourcePage[] = [];
  const matches = [...redactedText.matchAll(MARKER)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? redactedText.length : redactedText.length;
    pages.push({ page_number: Number(m[1]), text: normalize(redactedText.slice(start, end)) });
  }
  return pages;
}

export function joinPages(pages: SourcePage[]): string {
  return pages.map((p) => `--- PAGE ${p.page_number} ---\n${p.text}`).join("\n");
}

export function normalize(s: string): string {
  return s.replace(/ /g, " ").replace(/[ \t\r\n]+/g, " ").trim();
}

/** Parses ATLAS page lists like "13,30-31" or "p=29-30" into numbers. */
export function parsePageList(raw: unknown): number[] {
  if (raw == null) return [];
  const s = String(raw);
  const out = new Set<number>();
  for (const part of s.replace(/p=/gi, "").split(/[,;\s]+/)) {
    const r = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (r) {
      const a = Number(r[1]);
      const b = Number(r[2]);
      if (b >= a && b - a < 40) for (let i = a; i <= b; i++) out.add(i);
    } else if (/^\d+$/.test(part)) out.add(Number(part));
  }
  return [...out].filter((n) => n > 0 && n < 1000);
}

export type Located = { page_number: number; start: number; end: number; excerpt: string };

function excerptAround(text: string, start: number, end: number, pad = 90): string {
  const a = Math.max(0, start - pad);
  const b = Math.min(text.length, end + pad);
  return (a > 0 ? "…" : "") + text.slice(a, b).trim() + (b < text.length ? "…" : "");
}

/**
 * Finds the first needle on the preferred pages, then anywhere. Needles are
 * literal strings (matched case-insensitively, whole-token for numbers).
 */
export function locate(pages: SourcePage[], needles: string[], preferred: number[] = []): Located | null {
  const order = [
    ...pages.filter((p) => preferred.includes(p.page_number)),
    ...pages.filter((p) => !preferred.includes(p.page_number)),
  ];
  for (const needle of needles) {
    if (!needle || needle.length < 2) continue;
    const re = tokenRegex(needle);
    for (const p of order) {
      const m = re.exec(p.text);
      re.lastIndex = 0;
      if (m && m.index != null) {
        const start = m.index + (m[1] ? m[0].indexOf(m[1]) : 0);
        const end = start + (m[1] ?? m[0]).length;
        return { page_number: p.page_number, start, end, excerpt: excerptAround(p.text, start, end) };
      }
    }
  }
  return null;
}

/** Number needles bounded so "575" does not match inside "22,575". */
function tokenRegex(needle: string): RegExp {
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  if (/^[$\d]/.test(needle)) return new RegExp(`(?:^|[^\\d,.])(${esc})(?![\\d]|[,.]\\d)`, "i");
  return new RegExp(`(${esc})`, "i");
}

/** Text variants an illustration may print for a dollar amount. */
export function moneyNeedles(v: number): string[] {
  const whole = Math.round(v);
  const comma = whole.toLocaleString("en-US");
  const out = [`$${comma}.00`, `$${comma}`, `${comma}.00`, comma];
  if (whole >= 1000 && whole % 1000 === 0) out.push(`${whole / 1000}K`);
  if (!out.includes(String(whole))) out.push(String(whole));
  return out;
}

export function percentNeedles(v: number): string[] {
  const fixed2 = v.toFixed(2);
  const out = [`${fixed2}%`, `${v}%`, `(${fixed2}%)`, fixed2];
  if (Number.isInteger(v)) out.push(`${v}.0%`);
  return out;
}

/** Locates a ledger row by "year age …" and checks a value sits inside that row. */
export function locateLedgerValue(
  pages: SourcePage[],
  year: number,
  age: number | null,
  value: number,
  preferred: number[] = [],
): Located | null {
  const order = [
    ...pages.filter((p) => preferred.includes(p.page_number)),
    ...pages.filter((p) => !preferred.includes(p.page_number)),
  ];
  const valueRe = new RegExp(
    `(?:^|[^\\d,.])(${moneyNeedles(value)
      .filter((n) => !n.startsWith("$") && !n.endsWith("K"))
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})(?![\\d]|[,.]\\d)`,
  );
  const rowStart = age != null ? new RegExp(`(?:^|\\s)${year}\\s+${age}\\s`, "g") : new RegExp(`(?:^|\\s)${year}\\s`, "g");
  for (const p of order) {
    rowStart.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rowStart.exec(p.text))) {
      const rowBegin = m.index;
      // A row ends where the next "year+1 age+1" begins, or after ~160 chars.
      const nextRe = age != null ? new RegExp(`\\s${year + 1}\\s+${age + 1}\\s`) : new RegExp(`\\s${year + 1}\\s`);
      const rest = p.text.slice(rowBegin + 1);
      const nx = nextRe.exec(rest);
      const rowEnd = Math.min(rowBegin + 1 + (nx ? nx.index : 160), rowBegin + 200, p.text.length);
      const row = p.text.slice(rowBegin, rowEnd);
      const vm = valueRe.exec(row);
      if (vm) {
        const start = rowBegin + vm.index + vm[0].indexOf(vm[1]);
        return { page_number: p.page_number, start, end: start + vm[1].length, excerpt: row.trim() };
      }
    }
  }
  return null;
}

/** True when the excerpt appears verbatim (whitespace-normalized) on that page. */
export function excerptResolves(pages: SourcePage[], page: number, excerpt: string): boolean {
  const p = pages.find((x) => x.page_number === page);
  if (!p) return false;
  const core = normalize(excerpt.replace(/^…|…$/g, ""));
  return core.length > 0 && p.text.includes(core);
}

/**
 * Positional check of one ledger cell: finds the row that starts with
 * "year age", splits it into tokens and compares the token in the column the
 * extractor reported. Works for zeros and "Lapse" cells, which a plain text
 * search cannot pin down.
 */
export function locateLedgerCell(
  pages: SourcePage[],
  columns: string[],
  year: number,
  age: number | null,
  field: string,
  value: number | null,
  preferred: number[] = [],
): Located | null {
  const col = columns.indexOf(field);
  if (col < 0 || columns[0] !== "year") return null;
  const order = [
    ...pages.filter((p) => preferred.includes(p.page_number)),
    ...pages.filter((p) => !preferred.includes(p.page_number)),
  ];
  const head = age != null && columns[1] === "age" ? `${year} ${age} ` : `${year} `;
  for (const p of order) {
    let from = 0;
    while (true) {
      const i = p.text.indexOf(head, from);
      if (i < 0) break;
      from = i + 1;
      if (i > 0 && !/\s/.test(p.text[i - 1])) continue;
      const tokens: { t: string; at: number }[] = [];
      const re = /\S+/g;
      re.lastIndex = i;
      let m: RegExpExecArray | null;
      while (tokens.length < columns.length && (m = re.exec(p.text))) tokens.push({ t: m[0], at: m.index });
      if (tokens.length < columns.length) continue;
      const cell = tokens[col];
      const clean = cell.t.replace(/[$,]/g, "");
      const ok = value == null ? /^(lapse|lapsed|\*+|-+)$/i.test(cell.t) : /^-?\d+(\.\d+)?$/.test(clean) && Math.round(Number(clean)) === Math.round(value);
      // All numeric cells before it must look like numbers or lapse markers (it really is a row).
      const rowLike = tokens.slice(0, col).every((x) => /^(\$?-?[\d,]+(\.\d+)?|lapse|lapsed)$/i.test(x.t));
      if (ok && rowLike) {
        const last = tokens[tokens.length - 1];
        return { page_number: p.page_number, start: cell.at, end: cell.at + cell.t.length, excerpt: p.text.slice(i, last.at + last.t.length) };
      }
    }
  }
  return null;
}
