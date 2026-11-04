/**
 * PolicyPlan — 187 Context Prep
 * Version: 1.0.0
 * n8n Code node, mode: Run Once for All Items
 *
 * Input:  the Atlas Evidence Envelope (factSpine + atlas2Parsed), and the
 *         intake posted to the "PolicyPlan Intake" webhook.
 * Output: { packet, letterUserMessage } for the 187 Letter Writer.
 *
 * This node does NOT write prose. It turns codes into plain labels, computes
 * the few ratios the letter may cite, and decides deterministically which
 * tensions the letter must address. The writer may only use what is here.
 */

const NODE_VERSION = '1.0.0';
const env = $input.first().json || {};
const body = $('PolicyPlan Intake').first().json.body || {};

// ── helpers ────────────────────────────────────────────────────────────────
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function get(o, path) {
  if (!o) return undefined;
  let cur = o;
  for (const p of path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)) {
    if (cur == null || !Object.prototype.hasOwnProperty.call(cur, p)) return undefined;
    cur = cur[p];
  }
  return cur;
}
// Unwrap { value } / { amount } style facts, and drop "NOT SHOWN" markers.
function val(v) {
  if (v == null) return null;
  if (isObj(v)) {
    for (const k of ['value', 'amount', 'total', 'age', 'label', 'name']) {
      if (v[k] != null) return val(v[k]);
    }
    return null;
  }
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t || /^not\s*shown$/i.test(t) || /^n\/?a$/i.test(t) || t === 'null') return null;
    return t;
  }
  return v;
}
function first(o, paths) {
  for (const p of paths) {
    const v = val(get(o, p));
    if (v != null) return v;
  }
  return null;
}
function num(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[$,%\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}
const n0 = (v) => num(v) ?? 0;
const money = (v) => (v == null ? null : '$' + Math.round(v).toLocaleString('en-US'));
const pct = (v) => (v == null ? null : (Math.round(v * 10) / 10) + '%');

// ── labels (copy layer, mirrors lib/policyplan/schema.ts) ──────────────────
const OBJECTIVE = {
  income_replacement: 'Replace income for the family',
  mortgage_debt_payoff: 'Pay off a mortgage or other debts',
  education_funding: 'Fund education',
  final_expenses: 'Cover final expenses',
  cash_accumulation: 'Build cash value',
  supplemental_retirement_income: 'Supplement retirement income',
  long_term_care_funding: 'Help pay for long-term care',
  estate_tax_liquidity: 'Provide cash for estate taxes',
  wealth_transfer: 'Pass wealth to heirs',
  estate_equalization: 'Equalize an estate among heirs',
  charitable_giving: 'Make a charitable gift',
  business_succession_buy_sell: 'Fund a business buy-sell or succession plan',
  key_person_protection: 'Protect the business against loss of a key person',
  executive_benefit: 'Provide an executive benefit',
};
const RISK = {
  financial_experience: { q: 'Experience with financial products', limited: 'Limited', moderate: 'Moderate', extensive: 'Extensive' },
  value_variability_tolerance: { q: 'Comfort with policy values that move year to year', prefer_stability: 'Prefers stability', balanced: 'Balanced', accept_variability: 'Accepts variability' },
  guarantee_vs_upside: { q: 'Guarantees versus upside', strongly_prefer_guarantees: 'Strongly prefers guarantees', lean_guarantees: 'Leans toward guarantees', lean_upside: 'Leans toward upside', strongly_prefer_upside: 'Strongly prefers upside' },
  nonguaranteed_elements: { q: 'Willingness to rely on non-guaranteed elements', accept: 'Accepts them', accept_with_limits: 'Accepts them within limits', prefer_to_avoid: 'Prefers to avoid them' },
  premium_funding_commitment: { q: 'Ability to pay more premium if needed', able_and_willing: 'Able and willing', willing_if_necessary: 'Willing if necessary', unable_or_unwilling: 'Unable or unwilling' },
  cash_value_access_need: { q: 'When cash value may be needed', none_expected: 'No access planned', long_term: 'In 10 or more years', medium_term: 'In 5 to 10 years', near_term: 'Within 5 years' },
  complexity_tolerance: { q: 'Comfort with product complexity', prefer_simple: 'Prefers simple', comfortable_with_complexity: 'Comfortable with complexity' },
};
const OWNERSHIP = { individual: 'Individually owned', business: 'Business owned', trust: 'Trust owned' };

// ── 1. client profile ──────────────────────────────────────────────────────
const io = body.insured_owner || {};
const insureds = (io.insureds || []).map((i, idx) => ({
  label: idx === 0 ? 'Insured' : 'Second insured',
  first_name: (i.name || '').trim().split(/\s+/)[0] || null,
  age: i.dob ? Math.floor((Date.now() - new Date(i.dob).getTime()) / (365.25 * 864e5)) : null,
  gender: i.gender || null,
  nicotine: i.nicotine_use || null,
}));

const obj = body.objectives || {};
const objectives = {
  primary: OBJECTIVE[obj.primary] || obj.primary || null,
  secondary: (obj.selected || []).filter((o) => o !== obj.primary).map((o) => OBJECTIVE[o] || o),
};

const cols = (body.financial && body.financial.columns) || {};
const colList = [cols.client_1, cols.client_2, cols.joint].filter(isObj);
const sum = (k) => colList.reduce((a, c) => a + n0(c[k]), 0);
const liquidAssets = sum('cash_cds_securities') + sum('qualified_plans');
const otherAssets = sum('business_interests') + sum('real_estate') + sum('residence') + sum('other_assets');
const liabilities = sum('mortgage_amount') + sum('revolving_debt') + sum('other_liability_amount');
const income = sum('annual_income');
const lnw = num(body.liquid_net_worth) ?? liquidAssets - liabilities;
const taxRate = colList.map((c) => num(c.income_tax_rate)).find((v) => v != null) ?? null;

const rp = body.risk_preferences || {};
const riskProfile = Object.keys(RISK).filter((k) => rp[k]).map((k) => ({ question: RISK[k].q, answer: RISK[k][rp[k]] || rp[k], code: rp[k] }));

const ec = body.existing_coverage || {};
const existing = (ec.policies || []).map((p) => ({
  carrier: p.insurance_company || null,
  type: p.policy_type || null,
  death_benefit: num(p.death_benefit),
  cash_surrender_value: num(p.cash_surrender_value),
  loan_balance: num(p.policy_loan_balance),
  premium: num(p.premium_amount),
  purpose: p.purpose_of_policy || null,
  being_replaced: p.under_replacement_consideration === 'yes',
}));
// Short profile asks one question (existing_coverage.replacing); older
// intakes flag replacement per policy.
const replacement = ec.replacing === 'yes' || existing.some((p) => p.being_replaced);

// ── 2. proposed policy (ATLAS-1 fact spine + ATLAS-2 identity) ─────────────
const fs = env.factSpine || {};
const a2 = env.atlas2Parsed || {};
const policy = {
  carrier: first(fs, ['provenance.carrier']) ?? first(a2, ['policyIdentity.carrier', 'policyIdentity.carrierName']),
  product: first(fs, ['provenance.product']) ?? first(a2, ['policyIdentity.product', 'policyIdentity.productName']),
  product_type: first(fs, ['chassis.type']),
  product_subtype: first(fs, ['chassis.subtype']),
  face_amount: num(first(fs, ['analysis_facts.coverage_identity.contractual_face.total', 'chassis.face_amount', 'chassis.specified_amount'])),
  death_benefit_option: first(fs, ['chassis.db_option']),
  annual_premium: num(first(fs, ['premiums.annualized', 'premiums.scheduled', 'ledger.Y1.premium_as_extracted'])),
  premium_mode: first(fs, ['premiums.mode']),
  premium_pattern: first(fs, ['premiums.schedule_pattern']),
  premium_stop_year: first(fs, ['premiums.stop_year']),
  issue_age: num(first(fs, ['provenance.issue_age', 'provenance.stated_issue_age'])),
  gender: first(fs, ['provenance.gender']),
  risk_class: first(fs, ['provenance.issue_class']),
  state: first(fs, ['provenance.state']),
  illustration_date: first(fs, ['provenance.illustration_date']),
  illustrated_rate: first(fs, ['product_specific.iul.illustrated_rate', 'product_specific.vul.illustrated_rate_gross']),
  no_lapse_guarantee: first(fs, ['chassis.no_lapse_guarantee', 'chassis.coverage_guarantees[0].label']),
  no_lapse_end_age: num(first(fs, ['chassis.no_lapse_end_age'])),
  guaranteed_coverage_through_age: num(first(fs, ['analysis_facts.coverage_support.guaranteed.coverage_shown_through.age', 'dashboard_facts.guarantee_relationship.guaranteed_values_sustain_through_age'])),
  guaranteed_values_exhausted_age: num(first(fs, ['analysis_facts.coverage_support.guaranteed.value_exhausted.age'])),
  maturity_age: num(first(fs, ['provenance.maturity_age', 'analysis_facts.coverage_support.ledger_end.maturity_age'])),
  illustrated_distributions: get(fs, 'distributions.illustrated') ?? null,
  loan_rate: first(fs, ['loans.rate_current', 'loans.rate_current_value', 'loans.current_active_rate']),
};
const variableOrIndexed = /index|iul|variable|vul/i.test(String(policy.product_type || '') + ' ' + String(policy.product_subtype || ''));

// Selected ATLAS-2 verbatim language the letter may quote. ATLAS-2 stores each
// passage as { sourceText, sourcePageLabel, sourceHeading } under a named field;
// we walk the whole object (except identity) and rank warnings first.
const quotes = [];
function walk(node, path, depth) {
  if (node == null || depth > 6) return;
  if (Array.isArray(node)) { node.forEach((x, i) => walk(x, path, depth + 1)); return; }
  if (!isObj(node)) return;
  if (typeof node.sourceText === 'string') {
    const t = node.sourceText.trim();
    if (t.length >= 30 && t.length <= 1200) {
      quotes.push({ field: path, page: node.sourcePageLabel || null, text: t });
    }
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === 'sourceText') continue;
    walk(v, path ? path + '.' + k : k, depth + 1);
  }
}
for (const [k, v] of Object.entries(a2)) if (k !== 'policyIdentity') walk(v, k, 0);
const PRIORITY = /warning|lapse|surrender|nonGuaranteed|guarantee|loan|cap|floor|charge|mec/i;
quotes.sort((x, y) => (PRIORITY.test(y.field) ? 1 : 0) - (PRIORITY.test(x.field) ? 1 : 0));
quotes.splice(40);
quotes.forEach((q, i) => { q.ref = 'Q' + (i + 1); });

// ── 3. derived ratios ──────────────────────────────────────────────────────
const prem = policy.annual_premium;
const derived = {
  annual_income: income || null,
  liquid_assets: liquidAssets || null,
  other_assets: otherAssets || null,
  liabilities: liabilities || null,
  liquid_net_worth: lnw,
  income_tax_rate: taxRate,
  premium_to_income_pct: prem && income ? Math.round((prem / income) * 1000) / 10 : null,
  premium_to_liquid_net_worth_pct: prem && lnw > 0 ? Math.round((prem / lnw) * 1000) / 10 : null,
};

// ── 4. tensions the letter MUST address (deterministic) ────────────────────
const tensions = [];
const add = (code, severity, title, detail) => tensions.push({ code, severity, title, detail });

if (variableOrIndexed && ['strongly_prefer_guarantees', 'lean_guarantees'].includes(rp.guarantee_vs_upside)) {
  add('GUARANTEE_PREFERENCE_VS_PRODUCT', rp.guarantee_vs_upside === 'strongly_prefer_guarantees' ? 'high' : 'moderate',
    'Preference for guarantees, policy relies on non-guaranteed growth',
    `The client ${RISK.guarantee_vs_upside[rp.guarantee_vs_upside].toLowerCase()}, and the proposed ${policy.product_type || 'policy'} depends on non-guaranteed crediting.`);
}
if (variableOrIndexed && rp.nonguaranteed_elements === 'prefer_to_avoid') {
  add('NONGUARANTEED_AVOIDANCE', 'high', 'Client prefers to avoid non-guaranteed elements',
    'The illustrated values depend on non-guaranteed rates and charges.');
}
if (derived.premium_to_income_pct != null && derived.premium_to_income_pct > 20) {
  add('PREMIUM_TO_INCOME', derived.premium_to_income_pct > 35 ? 'high' : 'moderate', 'Premium is a large share of income',
    `The annual premium of ${money(prem)} is about ${pct(derived.premium_to_income_pct)} of reported annual income.`);
}
if (derived.premium_to_liquid_net_worth_pct != null && derived.premium_to_liquid_net_worth_pct > 25) {
  add('PREMIUM_TO_LIQUID_NET_WORTH', 'moderate', 'Premium is large relative to liquid net worth',
    `The annual premium is about ${pct(derived.premium_to_liquid_net_worth_pct)} of liquid net worth.`);
}
if (lnw != null && lnw <= 0) {
  add('NO_LIQUID_CUSHION', 'high', 'No liquid net worth reported', 'Liabilities equal or exceed liquid assets, so there is no cushion if premiums must rise.');
}
if (rp.premium_funding_commitment === 'unable_or_unwilling' && variableOrIndexed) {
  add('FUNDING_FLEXIBILITY', 'high', 'Cannot pay more premium if needed',
    'If credited rates fall short of the illustration, more premium may be needed to keep coverage in force.');
}
if (rp.cash_value_access_need === 'near_term') {
  add('NEAR_TERM_ACCESS', 'moderate', 'Cash value may be needed soon', 'Early-year surrender charges and lower early cash values limit near-term access.');
}
if (rp.complexity_tolerance === 'prefer_simple' && variableOrIndexed) {
  add('COMPLEXITY', 'low', 'Client prefers simple products', `The proposed ${policy.product_type || 'policy'} has more moving parts than a guaranteed design.`);
}
if (replacement) {
  add('REPLACEMENT', 'high', 'This policy would replace existing coverage',
    'The letter must cover what the client gives up: surrender charges, a new contestability period, changes in cost, and any lost features.');
}
// Tensions the app already detected (and the producer's notes on them).
for (const f of body.suitability_flags || []) {
  const note = (body.flag_resolutions || {})[f.code];
  add(f.code, f.severity === 'material' || f.severity === 'warning' ? 'high' : 'moderate', f.code.replace(/_/g, ' ').toLowerCase(),
    f.description + (note && note.note ? ` Producer note: ${note.note}` : ''));
}

// ── 5. packet + writer message ─────────────────────────────────────────────
const b = body.branding || {};
const packet = {
  context_version: NODE_VERSION,
  advisor: {
    name: b.advisor_name || null,
    title: b.advisor_title || null,
    credentials: b.advisor_credentials || null,
    firm: b.firm_name || null,
  },
  client: {
    insureds,
    ownership: OWNERSHIP[io.ownership_type] || io.ownership_type || null,
    state: io.state_of_ownership || policy.state || null,
    premium_source: (body.financial && body.financial.expected_source_of_premium) || null,
    notes: body.notes || null,
  },
  objectives,
  risk_profile: riskProfile,
  finances: derived,
  existing_coverage: existing,
  replacement,
  proposed_policy: policy,
  illustration_quotes: quotes,
  tensions,
};

const lines = [];
lines.push('## 187 LETTER PACKET (the only source you may use)');
lines.push('```json');
lines.push(JSON.stringify(packet, null, 2));
lines.push('```');
lines.push('');
lines.push(`Sections required: why_we_met, recommendation, why_it_fits, what_to_weigh, guaranteed_vs_illustrated${replacement ? ', replacement' : ''}, next_steps.`);
lines.push(`Address every tension in packet.tensions inside what_to_weigh${replacement ? ' or replacement' : ''}.`);

return [{
  json: {
    packet,
    letterUserMessage: lines.join('\n'),
    output_id: body.output_id,
    callback_url: body.callback_url,
    _contextPrep: { nodeVersion: NODE_VERSION, tensionCount: tensions.length, quoteCount: quotes.length, hasFactSpine: isObj(env.factSpine), hasAtlas2: isObj(env.atlas2Parsed) },
  },
}];
