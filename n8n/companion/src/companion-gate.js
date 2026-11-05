// PolicyPlan Companion · Input Gate · companion-gate v1
// Validates the job from the app before any model runs. The webhook itself is
// protected by the "PolicyPlan webhook auth" header credential; this gate adds
// shape checks, a freshness window and a callback allowlist so results can
// only ever be posted back to an approved PolicyPlan host.
const VERSION = 'policyplan-companion-v1/1.1.0';
const b = ($input.first().json.body) || {};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (m) => { throw new Error('COMPANION_GATE/' + m); };

if (!['extract', 'write', 'story'].includes(b.stage)) fail('stage');
if (!UUID.test(b.job_id || '') || !UUID.test(b.case_id || '')) fail('ids');
if (!Number.isInteger(b.revision) || b.revision < 1) fail('revision');

// n8n's Code sandbox has no global URL, so parse the callback with a strict pattern.
const cb = /^https:\/\/([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(\/[^?#\s@]*)$/i.exec(String(b.callback_url || '').trim());
if (!cb) fail(/^https:\/\//i.test(String(b.callback_url || '')) ? 'callback_url' : 'callback_not_https');
const host = cb[1].toLowerCase();
if (cb[2] !== '/api/companion/callback') fail('callback_path');
const allowed = String($vars.COMPANION_CALLBACK_HOSTS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
if (!allowed.length) fail('COMPANION_CALLBACK_HOSTS_not_set');
if (!allowed.includes(host)) fail('callback_host_not_allowed:' + host);

const issued = Date.parse(b.issued_at || '');
const age = Date.now() - issued;
if (!Number.isFinite(issued) || age < -5 * 60 * 1000 || age > 30 * 60 * 1000) fail('stale_request');

if (b.stage === 'extract') {
  if (typeof b.illustration_text !== 'string' || b.illustration_text.length < 200 || b.illustration_text.length > 900000) fail('illustration_text');
  if (!/--- PAGE 1 ---/.test(b.illustration_text)) fail('page_markers');
}
if (b.stage === 'story') {
  // PolicyPlan Stories: one short writer call over the app's computed playback.
  if (!b.story_input || b.story_input.schema !== 'policyplan_story_input.v1') fail('story_input');
  if (!['apartment'].includes(b.story_input.story_key)) fail('story_key');
}
if (b.stage === 'write') {
  if (!b.writer_input || b.writer_input.schema !== 'companion_writer_input.v1') fail('writer_input');
  if (!b.analyst_input || b.analyst_input.schema !== 'companion_analyst_input.v1') fail('analyst_input');
}

return [{
  json: {
    stage: b.stage,
    job_id: b.job_id,
    case_id: b.case_id,
    revision: b.revision,
    callback_url: 'https://' + host + '/api/companion/callback',
    workflow_version: VERSION,
    prompt_versions: b.prompt_versions || null,
    illustration_text: b.stage === 'extract' ? b.illustration_text : null,
    writer_input: b.stage === 'write' ? b.writer_input : null,
    analyst_input: b.stage === 'write' ? b.analyst_input : null,
    story_input: b.stage === 'story' ? b.story_input : null,
  },
}];
