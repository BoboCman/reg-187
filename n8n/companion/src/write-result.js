// PolicyPlan Companion · Write Result · v1
// Sends the raw writer text (and the analyst notes) to the app. The app is
// the authority: strict parse, token verification and the claim guard.
const g = $('Companion Gate').first().json;
const it = $input.first().json || {};
const fromCheck = typeof it.valid === 'boolean';
const raw = fromCheck ? it.raw : String(it.output ?? '');
let analyst = null;
try { analyst = $('Companion Analyst').first().json.output ?? null; } catch (e) { analyst = null; }
return [{
  json: {
    callback_url: g.callback_url,
    callback: {
      stage: 'write',
      job_id: g.job_id,
      case_id: g.case_id,
      revision: g.revision,
      status: 'ok',
      workflow_version: g.workflow_version,
      writer: { raw: String(raw).slice(0, 60000), analyst_raw: analyst == null ? null : String(analyst).slice(0, 20000), model: 'gpt-6.1-sol', attempts: fromCheck ? 1 : 2 },
    },
  },
}];
