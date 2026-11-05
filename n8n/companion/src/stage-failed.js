// PolicyPlan Companion · Stage Failed · v1
// Any node error on either stage lands here, so the app never waits forever.
// Once the run has moved on to the story, a failure closes the story job, not the extract job.
const gate = $('Companion Gate').first().json;
let sc = null;
try {
  const n = $('Story Context');
  const j = n.isExecuted === false ? null : n.first().json;
  if (j && j.job_id && j.stage === 'story') sc = j;
} catch (e) {
  sc = null;
}
const g = sc || gate;
const e = $input.first().json || {};
const raw = e.error && (e.error.message || e.error.description || e.error) || e.message || 'workflow_error';
const error = String(raw).replace(/\s+/g, ' ').slice(0, 200);
return [{
  json: {
    callback_url: g.callback_url,
    callback: { stage: g.stage, job_id: g.job_id, case_id: g.case_id, revision: g.revision, status: 'error', workflow_version: g.workflow_version, error },
  },
}];
