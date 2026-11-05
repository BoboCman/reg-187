// PolicyPlan Story · Story Check · v1
// A light pre-check so a malformed answer gets one retry. The app re-parses
// strictly and runs the full wording and number guard; this node never repairs output.
const raw = String(($input.first().json || {}).output ?? '').trim();
const input = $('Companion Gate').first().json.story_input || {};
let reason = '';
let j = null;
if (!raw.startsWith('{') || !raw.endsWith('}')) reason = 'not_a_single_json_object';
else {
  try { j = JSON.parse(raw); } catch (e) { reason = 'invalid_json'; }
}
if (!reason) {
  if (j.schema !== 'policyplan_story.v1') reason = 'wrong_schema';
  else if (!j.story || typeof j.story.where_you_start !== 'string') reason = 'missing_story.where_you_start';
  else if (!Array.isArray(j.story.benefits) || !j.story.benefits.length) reason = 'missing_story.benefits';
  else if (!j.design || typeof j.design.headline !== 'string' || typeof j.design.takeaway !== 'string') reason = 'missing_design';
  else if (!Array.isArray(j.riders)) reason = 'missing_riders';
  else {
    const keys = j.story.benefits.map((b) => b && b.key);
    const need = ['growth', 'access', 'legacy'].filter((k) => !keys.includes(k));
    if (need.length) reason = 'missing_benefits:' + need.join(',');
    const known = (input.riders || []);
    const unknown = j.riders.filter((r) => !r || !known.includes(r.name));
    if (!reason && unknown.length) reason = 'unknown_riders';
  }
}
return [{ json: { valid: !reason, reason, raw, attempt: 1 } }];
