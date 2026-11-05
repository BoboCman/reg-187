// PolicyPlan Companion · Extract Result · v1
// Transport only: forwards the ATLAS envelope to the app, which builds and
// verifies the evidence itself. No insurance interpretation happens here.
const g = $('Companion Gate').first().json;
const env = $input.first().json || {};
if (!env.factSpine) throw new Error('COMPANION_EXTRACT/no_fact_spine');
return [{
  json: {
    callback_url: g.callback_url,
    callback: {
      stage: 'extract',
      job_id: g.job_id,
      case_id: g.case_id,
      revision: g.revision,
      status: 'ok',
      workflow_version: g.workflow_version,
      extraction: {
        atlas1: env.factSpine,
        atlas2: env.atlas2Parsed ?? null,
        atlas2_registry: env.atlas2EvidenceRegistry ?? null,
      },
    },
  },
}];
