// PolicyPlan Companion · Stage Failed · v1
// Any node error on either stage lands here, so the app never waits forever.
const g = $('Companion Gate').first().json;
const e = $input.first().json || {};
const raw = e.error && (e.error.message || e.error.description || e.error) || e.message || 'workflow_error';
const error = String(raw).replace(/\s+/g, ' ').slice(0, 200);
return [{
  json: {
    callback_url: g.callback_url,
    callback: { stage: g.stage, job_id: g.job_id, case_id: g.case_id, revision: g.revision, status: 'error', workflow_version: g.workflow_version, error },
  },
}];
