/**
 * PolicyPlan — 187 Letter QA
 * Version: 1.1.0
 * n8n Code node, mode: Run Once for All Items
 *
 * Parses the Letter Writer's JSON, checks it against the packet, and builds
 * the callback body for POST /api/policyplan/callback (see
 * lib/policyplan/letter.ts, callbackSchema). A letter that fails a soft check
 * is still delivered as a draft with qa.passed = false, so the advisor sees
 * the issue on review. A letter that can't be parsed is sent as an error.
 */

const NODE_VERSION = '1.1.0';
const WORKFLOW_VERSION = 'policyplan-187-letter/1.1.0';

const prep = $('187 Context Prep').first().json;
const packet = prep.packet || {};
const raw = $input.first().json || {};
const text = String(raw.output ?? raw.text ?? raw.response ?? '');

const TITLES = {
  why_we_met: 'What you told me matters most',
  recommendation: 'What I recommend',
  how_it_works: 'How the policy works',
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
      .map((q) => ({ text: q.text.trim().replace(/^["“]|["”]$/g, ''), ...(q.source ? { source: String(q.source) } : {}) })),
  }))
  .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

// ── checks ─────────────────────────────────────────────────────────────────
const checks = [];
const check = (id, passed, detail) => checks.push({ id, passed: !!passed, ...(detail ? { detail } : {}) });
const has = (id) => sections.some((s) => s.id === id && (s.paragraphs.length || s.bullets.length));

// Quotes must be verbatim illustration language. Drop any that aren't, so
// the client never sees a paraphrase presented as carrier wording.
const norm = (t) => String(t).replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
const evidenceText = (packet.illustration_quotes || []).map((q) => norm(q.text));
const dropped = [];
for (const s of sections) {
  s.quotes = s.quotes.filter((q) => {
    const ok = evidenceText.some((e) => e.includes(norm(q.text).replace(/…$/, '')));
    if (!ok) dropped.push(q.text.slice(0, 60));
    return ok;
  });
}
const quoteCount = sections.reduce((a, s) => a + s.quotes.length, 0);
check('quotes_verbatim', dropped.length === 0, dropped.length ? 'removed non-verbatim: ' + dropped.join(' | ') : undefined);
check('quotes_used', quoteCount >= Math.min(2, evidenceText.length), `${quoteCount} verbatim quotes`);

const required = ['why_we_met', 'recommendation', 'why_it_fits', 'what_to_weigh', 'guaranteed_vs_illustrated', 'next_steps'];
if (packet.replacement) required.push('replacement');
if (packet.policy_features) required.push('how_it_works');
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
const pf = packet.policy_features || {};
const cr = pf.crediting || {};
const facts = [];
const fact = (label, value) => { if (value != null && value !== '') facts.push({ label, value: String(value) }); };
const usd = (v) => (v == null ? null : '$' + Math.round(v).toLocaleString('en-US'));
fact('Death benefit option', p.death_benefit_option);
if (cr.index_strategy) fact('Index strategy', cr.index_strategy);
if (cr.participation_rate_current != null) fact('Participation rate', `${cr.participation_rate_current}% current, ${cr.participation_rate_guaranteed ?? '—'}% guaranteed`);
if (cr.floor_percent != null) fact('Floor', `${cr.floor_percent}%`);
if (cr.cap) {
  const m = String(cr.cap).match(/Current:\s*([^;]+);\s*Guaranteed:\s*(.+)/i);
  fact('Cap', m ? (m[1].trim() === m[2].trim() ? m[1].trim() : `${m[1].trim()} current, ${m[2].trim()} guaranteed`) : cr.cap);
}
const g = pf.guaranteed_basis || {};
if (g.lapse_protection_through_age != null) fact(g.lapse_protection_name || 'Lapse protection', `Through age ${g.lapse_protection_through_age}, if premiums are paid as illustrated`);
const sc = pf.surrender_charges || {};
if (sc.charge_year_1 != null) fact('Surrender charge', `${usd(sc.charge_year_1)} in year 1${sc.charges_end_after_year ? `, none after year ${sc.charges_end_after_year}` : ''}`);
const pr = pf.premiums || {};
if (pr.cumulative_premium_all_years != null) fact('Total scheduled premium', `${usd(pr.cumulative_premium_all_years)}${pr.last_premium_age ? ` through age ${pr.last_premium_age}` : ''}`);
const rid = (pf.riders || {}).included || [];
if (rid.length) fact('Riders included', rid.join('; '));
if ((pf.tax || {}).mec_status) fact('Tax status', /not a mec/i.test(pf.tax.mec_status) ? 'Not a modified endowment contract (MEC)' : pf.tax.mec_status);
const callback = {
  status: 'draft',
  output_id: prep.output_id,
  workflow_version: WORKFLOW_VERSION,
  letter: {
    contract_version: '1.1',
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
      facts,
      milestones: (packet.illustrated_values || []).map((m) => ({
        year: m.year, age: m.age, cumulative_premium: m.cumulative_premium,
        sv_guaranteed: m.sv_guaranteed, db_guaranteed: m.db_guaranteed,
        sv_illustrated: m.sv_illustrated, db_illustrated: m.db_illustrated,
      })),
    },
    tensions,
  },
  extraction: {
    proposed_policy: p,
    finances: packet.finances || null,
    replacement: !!packet.replacement,
    quote_count: (packet.illustration_quotes || []).length,
    quotes_used: quoteCount,
    context_version: packet.context_version || null,
  },
  qa,
};

if (!callback.letter.opening || !sections.length || !callback.letter.closing) {
  return [{ json: { callback: { status: 'error', output_id: prep.output_id, workflow_version: WORKFLOW_VERSION, error: 'writer_output_incomplete' } } }];
}

return [{ json: { callback } }];
