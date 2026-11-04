# PolicyPlan 187 Letter workflow (n8n)

`policyplan-187-letter.json` can be imported into n8n through **Import from File**.

```
PolicyPlan Intake (webhook) ─ Has illustration? ─┬─ Sanitized Text1 ─┬─ ATLAS-1: Technical Extraction1 → Atlas Parser1 → Light Middleware ─┐
                                                 │                   └─ ATLAS-2: Contextual Quotes1 → 01 ATLAS-2 Parse + Validate ───────┤
                                                 │                                                                       Merge2 → Atlas Evidence Envelope
                                                 │                                   → 187 Context Prep → 187 Letter Writer (OpenAI Sol) → 187 Letter QA ─┐
                                                 └─ No illustration ──────────────────────────────────────────────────────────────────── Post to PolicyPlan
```

The ATLAS nodes have the same names, inputs and outputs as in the PolicyReview workflow. This repo ships them as **placeholders**, so the ATLAS prompts and parsers are never copied into Git. You can fill them in either of these ways:

- Paste the current ATLAS-1 and ATLAS-2 prompts and the four parser Code nodes from PolicyReview into the nodes with the same names, or
- Build a ready-to-import copy from a PolicyReview export: `python3 n8n/build.py --atlas-from policyreview-export.json --out /tmp/policyplan-187-letter.full.json`

## Setup in n8n

1. Create a **Header Auth** credential called `PolicyPlan webhook auth`. Set the header name to `policyplan-auth` and the value to the same secret as Vercel's `N8N_POLICYPLAN_WEBHOOK_SECRET`. Select it on the **PolicyPlan Intake** node.
2. Add an n8n variable called `POLICYPLAN_CALLBACK_SECRET` with the same value as Vercel's `POLICYPLAN_CALLBACK_SECRET`.
3. On **OpenAI Sol**, choose your OpenAI credential and the Sol model from the dropdown. The JSON sets `gpt-6.1-sol`.
4. Activate the workflow, then copy its production webhook URL into Vercel's `N8N_POLICYPLAN_WEBHOOK_URL`.

## Vercel env vars

| Name | New? | Purpose |
| --- | --- | --- |
| `N8N_POLICYPLAN_WEBHOOK_URL` | existing | Production URL of this workflow's webhook |
| `N8N_POLICYPLAN_WEBHOOK_SECRET` | existing | Sent as the `policyplan-auth` header |
| `POLICYPLAN_CALLBACK_SECRET` | new | n8n sends this back as the `policyplan-callback-auth` header |
| `SUPABASE_SERVICE_ROLE_KEY` | new | Lets the callback route write the letter (server only) |
| `POLICYPLAN_CALLBACK_URL` | optional | Overrides `<site>/api/policyplan/callback`, for example to point previews at a public URL |
| `PDF_API_KEY` | later (PR 3) | PDFShift key, same as ip-ai-pro |

## Editing the PolicyPlan nodes

The source for the PolicyPlan nodes lives in `n8n/src/`:

- `187-context-prep.js` turns the intake and the ATLAS envelope into the letter packet and the deterministic tensions.
- `187-letter-writer.system.md` is the writer's system prompt.
- `187-letter-qa.js` checks the letter and builds the callback body (`lib/policyplan/letter.ts`, `callbackSchema`).

After you edit any of them, run `python3 n8n/build.py` and re-import the workflow.

To update a workflow that is already live without re-importing, paste each file into its node instead: `187-context-prep.js` into the **187 Context Prep** code, `187-letter-writer.system.md` into the **187 Letter Writer** system message, and `187-letter-qa.js` into the **187 Letter QA** code. Save, then retry a run.

### v1.1 (letter grounded in the illustration)

- Context Prep reads the ATLAS-2 evidence registry, so the writer gets the carrier's own wording (v1.0 found none because ATLAS-2 stores plain strings).
- Context Prep adds `policy_features` (crediting, riders, surrender charges, premium totals, guaranteed vs illustrated path, loans, MEC status) and `illustrated_values` (ledger milestones) from ATLAS-1, plus three policy-aware tensions.
- The writer adds a "How the policy works" section and must quote the illustration at least three times.
- Letter QA removes any quote that isn't verbatim, and adds a deterministic "Your policy at a glance" table to `policy_snapshot`, which the app prints after "How the policy works".
