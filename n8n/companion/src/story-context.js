// PolicyPlan Story · Story Context · v1
// One place the story nodes read their job from. Two ways in:
//  · stage 'story' (generate again): the job came in on the webhook (checked by the gate);
//  · stage 'extract' with the form answers: the app answered the extract callback with
//    story_job, so the same run goes on to write the story. Nothing else triggers it.
const g = $('Companion Gate').first().json;
const r = $input.first().json || {};
const job = g.stage === 'story' ? { job_id: g.job_id, revision: g.revision, story_input: g.story_input } : r.story_job;
const ok = job && typeof job === 'object'
  && /^[0-9a-f-]{36}$/i.test(String(job.job_id))
  && Number.isInteger(job.revision) && job.revision > 0
  && job.story_input && job.story_input.schema === 'policyplan_story_input.v1'
  && ['apartment'].includes(job.story_input.story_key);
if (!ok) throw new Error('STORY_CONTEXT/invalid_story_job');
return [{
  json: {
    stage: 'story',
    job_id: String(job.job_id),
    case_id: g.case_id,
    revision: job.revision,
    callback_url: g.callback_url,
    workflow_version: g.workflow_version,
    story_input: job.story_input,
  },
}];
