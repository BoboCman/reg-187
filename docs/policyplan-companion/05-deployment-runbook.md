# 05 · Deployment and activation runbook

Nothing below has been done. Each step is yours to run, in order. Production is untouched until step 6.

## 0. What is in the PR

- App code, the additive migration, the new workflow file, prompts, docs and samples.
- Merging deploys production on Vercel. **Do steps 1–5 on the preview first**, and only merge when you are ready for step 6.

## 1. Database (Supabase SQL editor)

1. Back up: Database → Backups (or `pg_dump`) before running anything.
2. Run `supabase/migrations/20261105000000_illustration_companion.sql`. It is additive and safe to run twice.
3. Check: `select case_type, count(*) from policyplan_intakes group by 1;` → all existing rows show `reg187_letter`.
4. If `policyplan_outputs.status` has a check constraint in your project (none is in the repo's migrations), make sure it allows `superseded`:
   `select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.policyplan_outputs'::regclass and contype = 'c';`

The preview and production share this database, so the migration is live for both once run. It does not change how the current production site behaves.

## 2. Secrets

Generate one new secret (do not reuse the letter callback secret):

```
openssl rand -hex 32     # → COMPANION_CALLBACK_SECRET
```

## 3. n8n (new workflow, stays inactive until step 6)

1. Import `policyplan-companion-v1.with-atlas.json` (in the project files; it already contains the ATLAS-1/ATLAS-2 nodes copied from the letter workflow). The repo copy `n8n/companion/policyplan-companion-v1.json` has placeholders instead. To rebuild: `python3 n8n/companion/build.py --atlas-from <letter-workflow-export.json> --out full.json`.
2. It imports **inactive**, as a separate workflow named "PolicyPlan Companion v1" on webhook path `policyplan-companion`. It does not touch PolicyReview, PolicyMatch or the 187 letter workflow.
3. On **Companion Intake**, select the existing **PolicyPlan webhook auth** header credential (header `policyplan-auth`).
4. On the four OpenAI model nodes, select your OpenAI credential and check the model (the file sets `gpt-6.1-sol` for analyst and writer, ATLAS keeps its copied settings).
5. Add n8n variables:
   - `COMPANION_CALLBACK_SECRET` = the value from step 2.
   - `COMPANION_CALLBACK_HOSTS` = comma-separated exact hosts that may receive results, e.g. `your-preview-host.vercel.app` for testing, later `your-production-domain`. Do not use a wildcard.
6. Test without activating: open the workflow, use **Test workflow / Listen for test event**, and copy the **test** webhook URL.

## 4. Vercel environment variables

Set for **Preview** first:

| Name | Value |
| --- | --- |
| `N8N_COMPANION_WEBHOOK_URL` | the n8n **test** URL from 3.6 (production URL in step 6) |
| `N8N_POLICYPLAN_WEBHOOK_SECRET` | existing; same value as the n8n header credential |
| `COMPANION_CALLBACK_SECRET` | step 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | existing (already used by the letter callback) |
| `COMPANION_CALLBACK_URL` | optional; e.g. `https://<preview-host>/api/companion/callback` if the preview sits behind Vercel deployment protection |
| `PDF_API_KEY` | existing (PDFShift) for PDF downloads |
| `NEXT_PUBLIC_LEGACY_REG187_ENABLED` | leave unset. Set `true` only to bring back the old letter wizard |

Redeploy the preview after changing variables. If Vercel deployment protection is on for previews, n8n's callback will be blocked; either add a protection bypass to `COMPANION_CALLBACK_URL` or test with protection off.

## 5. Preview test (internal only)

1. Sign in on the preview, **New companion**, upload a real proposed illustration with the client's name typed in.
2. Wait for the facts (2–4 minutes), check several against the PDF, confirm.
3. Answer the six questions, draft, review the text, try an edit, tick the verification items, approve.
4. Download the watermarked draft PDF. Client export stays closed: that is expected.
5. Repeat with an IUL, a GUL or WL, and a survivorship case. Check `policyplan_audit_events` for the trail.

To test client export, record a release policy for your own account:

```sql
insert into policyplan_release_policies (advisor_id, external_client_export_allowed, approved_jurisdictions, approved_product_classes, approval_reference, effective_at, updated_by)
values ('<your auth.users id>', true, '{}', '{}', 'INTERNAL-TEST', now(), 'owner')
on conflict (advisor_id) do update set external_client_export_allowed = excluded.external_client_export_allowed, approval_reference = excluded.approval_reference, updated_at = now();
```

Remove or set `external_client_export_allowed = false` after testing unless a firm has approved client use.

## 6. Production activation (your decision)

1. Counsel-approved text in `/privacy` and `/terms` (`app/privacy/page.tsx`, `app/terms/page.tsx`).
2. Merge the PR (deploys production).
3. In n8n, **activate** "PolicyPlan Companion v1", copy the **production** webhook URL, and add the production host to `COMPANION_CALLBACK_HOSTS`.
4. In Vercel **Production** env: same variables as step 4 with the production webhook URL. Redeploy.
5. Run one internal case end to end on production.
6. Record release policies only for firms whose compliance approval you hold (`approval_reference` = their approval number).

## 7. Rollback

- App: revert the merge commit in GitHub (Vercel redeploys), or promote the previous deployment in Vercel.
- Old wizard: set `NEXT_PUBLIC_LEGACY_REG187_ENABLED=true` and redeploy.
- n8n: deactivate "PolicyPlan Companion v1". The letter workflow is unchanged.
- Database: the migration only adds columns, tables and triggers; leaving it in place is safe. To stop Companion writes entirely, deactivate the workflow and unset `N8N_COMPANION_WEBHOOK_URL`. Do not drop the audit or snapshot tables, since they are the record.
