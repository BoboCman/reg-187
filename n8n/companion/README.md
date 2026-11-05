# PolicyPlan Companion workflow (n8n)

`policyplan-companion-v1.json` is a **new, separate** workflow (webhook `policyplan-companion`). It does the LLM work only; the app verifies every fact and every sentence. It imports inactive.

```
Companion Intake ─ Companion Gate ─ Stage ─┬─ extract: Sanitized Text1 ─┬─ ATLAS-1 → Atlas Parser1 → Light Middleware ─┐
                                           │                            └─ ATLAS-2 → 01 ATLAS-2 Parse + Validate ─────┤ Merge2 → Atlas Evidence Envelope → Extract Result ─┐
                                           └─ write: Companion Analyst → Companion Writer → Writer Check → OK? ─┬─ Write Result ──────────────────────────────────────────┤
                                                                                                                 └─ Companion Writer Retry → Write Result ─────────────────┤
                                              any node error ───────────────────────────────────────────────────────────── Stage Failed ──────────────────────────────┤
                                                                                                    Prepare Callback → Sign Callback (HMAC) → Post to PolicyPlan ◄─┘
```

- ATLAS nodes are **copied** from the letter workflow, never shared, and ship as placeholders in Git. Build a full copy with `python3 n8n/companion/build.py --atlas-from <export.json> --out <file>`.
- Prompts: `prompts/companion_analyst.v1.md`, `prompts/companion_writer.v1.md`. Code nodes: `src/*.js`. Edit there, rebuild, re-import (or paste into the node).
- Needs: header credential **PolicyPlan webhook auth**, OpenAI credential, variables `COMPANION_CALLBACK_SECRET` and `COMPANION_CALLBACK_HOSTS`.
- `tests/companion/n8n-contract.test.ts` runs the Code-node source against the app.

Setup and activation: `docs/policyplan-companion/05-deployment-runbook.md`.
