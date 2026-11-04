/**
 * PolicyPlan — 187 Letter QA
 * Version: 1.0.0
 * n8n Code node, mode: Run Once for All Items
 *
 * Parses the Letter Writer's JSON, checks it against the packet, and builds
 * the callback body for POST /api/policyplan/callback (see
 * lib/policyplan/letter.ts, callbackSchema). A letter that fails a soft check
 * is still delivered as a draft with qa.passed = false, so the advisor sees
 * the issue on review. A letter that can't be parsed is sent as an error.
 */

const NODE_VERSION = '1.0.0';
const WORKFLOW_VERSION = 'policyplan-187-letter/1.0.0';

const prep = $('187 Context Prep').first().json;
const packet = prep.packet || {};
const raw = $input.first().json || {};
const text = String(raw.output ?? raw.text ?? raw.response ?? '');

const TITLES = {
  why_we_met: 'What you told me matters most',
  recommendation: 'What I recommend',
  why_it_fits: 'Why it fits you',
  what_to_weigh: 'What to weigh before you decide',
  guaranteed_vs_illustrated: 'What is guaranteed and what is not',
  replacement: 'Replacing your current coverage',
  next_steps: 'Next steps',
};
const ORDER = Object.keys(TITLES);

function parseJson(t) {
  let s = t.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('no JSON object in writer output');
  return JSON.parse(s.slice(a, b + 1));
}

let letter;
try {
  letter = parseJson(text);
} catch (e) {
  return [{ json: { callback: { status: 'error', output_id: prep.output_id, workflow_version: WORKFLOW_VERSION, error: 'writer_output_unparseable: ' + e.message } } }];
}

const strArr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : []);
const sections = (Array.isArray(letter.sections) ? letter.sections : [])
  .filter((s) => s && ORDER.includes(s.id))
  .map((s) => ({
    id: s.id,
    title: typeof s.title === 'string' && s.title.trim() ? s.title.trim() : TITLES[s.id],
    paragraphs: strArr(s.paragraphs),
    bullets: strArr(s.bullets),
    quotes: (Array.isArray(s.quotes) ? s.quotes : [])
      .filter((q) => q && typeof q.text === 'string' && q.text.trim())
      .map((q) => ({ text: q.text.trim(), ...(q.source ? { source: String(q.source) } : {}) })),
  }))
  .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

// ── checks ─────────────────────────────────────────────────────────────────
const checks = [];
const check = (id, passed, detail) => checks.push({ id, passed: !!passed, ...(detail ? { detail } : {}) });
const has = (id) => sections.some((s) => s.id === id && (s.paragraphs.length || s.bullets.length));

const required = ['why_we_met', 'recommendation', 'why_it_fits', 'what_to_weigh', 'guaranteed_vs_illustrated', 'next_steps'];
if (packet.replacement) required.push('replacement');
const missing = required.filter((id) => !has(id));
check('required_sections', missing.length === 0, missing.length ? 'missing: ' + missing.join(', ') : undefined);

const weigh = sections.find((s) => s.id === 'what_to_weigh');
const weighWords = weigh ? (weigh.paragraphs.join(' ') + ' ' + weigh.bullets.join(' ')).split(/\s+/).length : 0;
check('unfavorable_considerations_present', weighWords >= 60, `what_to_weigh has ${weighWords} words`);

const tensionCodes = (packet.tensions || []).map((t) => t.code);
const addressed = new Set(strArr(letter.tensions_addressed));
const unaddressed = tensionCodes.filter((c) => !addressed.has(c));
check('tensions_addressed', unaddressed.length === 0, unaddressed.length ? 'not addressed: ' + unaddressed.join(', ') : undefined);

// Every number in the letter should trace to the packet.
const packetNums = new Set();
(function collect(v) {
  if (v == null) return;
  if (typeof v === 'number') { packetNums.add(v); return; }
  if (typeof v === 'string') { (v.match(/\d[\d,]*\.?\d*/g) || []).forEach((m) => packetNums.add(Number(m.replace(/,/g, '')))); return; }
  if (Array.isArray(v)) return v.forEach(collect);
  if (typeof v === 'object') Object.values(v).forEach(collect);
})(packet);
const pk = [...packetNums].filter((n) => Number.isFinite(n));
const allText = [letter.opening, letter.closing, ...sections.flatMap((s) => [...s.paragraphs, ...s.bullets, ...s.quotes.map((q) => q.text)])].join(' ');
const letterNums = (allText.match(/\$?\d[\d,]*\.?\d*%?/g) || [])
  .map((m) => Number(m.replace(/[$,%]/g, '')))
  .filter((n) => Number.isFinite(n) && n >= 10 && !(n >= 1900 && n <= 2100));
const close = (n) => pk.some((p) => p === n || (p !== 0 && Math.abs(p - n) / Math.abs(p) <= 0.01) || Math.round(p) === n || Math.round(p * 10) / 10 === n);
const untraced = [...new Set(letterNums.filter((n) => !close(n)))];
check('numbers_trace_to_packet', untraced.length === 0, untraced.length ? 'untraced: ' + untraced.slice(0, 10).join(', ') : undefined);

const banned = /\b(guaranteed to (grow|earn|return)|risk[- ]free|can't lose|cannot lose|no risk)\b/i;
check('no_overpromising_language', !banned.test(allText));

const qa = { passed: checks.every((c) => c.passed), node_version: NODE_VERSION, checks };

// Tensions shown to the producer on review (from the packet, not the model).
const tensions = (packet.tensions || []).map((t) => ({ code: t.code, severity: t.severity, title: t.title, detail: t.detail }));

const p = packet.proposed_policy || {};
const callback = {
  status: 'draft',
  output_id: prep.output_id,
  workflow_version: WORKFLOW_VERSION,
  letter: {
    contract_version: '1.0',
    salutation: String(letter.salutation || 'Dear client,'),
    opening: String(letter.opening || ''),
    sections,
    closing: String(letter.closing || ''),
    policy_snapshot: {
      carrier: p.carrier ?? null,
      product: p.product ?? null,
      product_type: p.product_type ?? null,
      face_amount: p.face_amount ?? null,
      annual_premium: p.annual_premium ?? null,
      premium_years: p.premium_stop_year != null ? String(p.premium_stop_year) : null,
      insured_age: p.issue_age ?? null,
      risk_class: p.risk_class ?? null,
      illustrated_rate: p.illustrated_rate != null ? String(p.illustrated_rate) : null,
      illustration_date: p.illustration_date != null ? String(p.illustration_date) : null,
    },
    tensions,
  },
  extraction: {
    proposed_policy: p,
    finances: packet.finances || null,
    replacement: !!packet.replacement,
    quote_count: (packet.illustration_quotes || []).length,
    context_version: packet.context_version || null,
  },
  qa,
};

if (!callback.letter.opening || !sections.length || !callback.letter.closing) {
  return [{ json: { callback: { status: 'error', output_id: prep.output_id, workflow_version: WORKFLOW_VERSION, error: 'writer_output_incomplete' } } }];
}

return [{ json: { callback } }];
