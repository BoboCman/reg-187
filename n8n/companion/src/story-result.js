// PolicyPlan Story · Story Result · v1
// Sends the raw writer text to the app. The app is the authority: strict
// parse, the wording guard and the number check against its own playback.
const g = $('Story Context').first().json;
const it = $input.first().json || {};
const fromCheck = typeof it.valid === 'boolean';
const raw = fromCheck ? it.raw : String(it.output ?? '');
return [{
  json: {
    callback_url: g.callback_url,
    callback: {
      stage: 'story',
      job_id: g.job_id,
      case_id: g.case_id,
      revision: g.revision,
      status: 'ok',
      workflow_version: g.workflow_version,
      story: { raw: String(raw).slice(0, 30000), model: 'gpt-6.1-sol', attempts: fromCheck ? 1 : 2 },
    },
  },
}];
