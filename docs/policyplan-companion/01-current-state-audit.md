# 01 · Current-state audit (before the Illustration Companion refresh)

Audited 2026-11-05 at `main` = `8f689bc` (merge of PR #28). Everything below was read in the code or in the exported n8n workflow. Where the public site claimed something the code does not do, it is listed as a **gap**.

## 1. Stack, deploy and baseline

| Item | Finding |
| --- | --- |
| Framework | Next.js 16.2 (App Router, Turbopack), React 19, Tailwind 4, zod 3.25, `@supabase/ssr` |
| Package manager | pnpm (`pnpm-lock.yaml`; a stale `package-lock.json` also exists) |
| Hosting | Vercel GitHub integration. Every PR gets a preview, and merging to `main` deploys production. There is no `vercel.json`, and `next.config.ts` is empty |
| CI / tests / lint | None. `next build` on Vercel is the only check. No test runner is installed |
| Baseline build | `next build` passes on `8f689bc` (run locally 2026-11-05) |
| Database | A dedicated Supabase project. Migrations live in `supabase/migrations/` and are **applied by hand** in the SQL editor, never by the deploy |

## 2. Routes and protection

`middleware.ts` → `lib/supabase/proxy.ts` refreshes the Supabase session and redirects signed-out users away from `/app`, `/dashboard`, `/cases` and `/settings`. API routes check the session themselves.

| Path | Type | Auth | Notes |
| --- | --- | --- | --- |
| `/` | public | – | Reg 187-first landing page (`components/landing/*`) |
| `/sample-letter` | public | – | Fictional survivorship "best-interest letter" (`app/sample-letter/route.ts`, `lib/policyplan/sample-letter.ts`) |
| `/login`, `/auth/callback` | public | – | Supabase magic link and OAuth |
| `/coming-soon` | public | – | Calendly link |
| `/privacy`, `/terms` | **missing** | – | Linked from `LandingFooter.tsx` and return 404 (**gap**) |
| `/app` | gated | session | Upload → Goals → Finances wizard (`PPWizardShell`) |
| `/dashboard` | gated | session | Letters list (`DashboardClient.tsx`) |
| `/cases/[id]` | gated | session + RLS | `LetterWorkspace` (v1.1 letters) or legacy `CaseWorkspace` |
| `/settings/branding` | gated | session + RLS | Letterhead (`advisor_branding`) |
| `POST /api/policyplan/generate` | API | session, ownership | Inserts a `pending` output and fires the n8n webhook with header `policyplan-auth` |
| `POST /api/policyplan/callback` | API | shared-secret header `policyplan-callback-auth` | Service-role write of the letter. There is **no timestamp, HMAC or replay protection** (**gap**) |
| `/api/policyplan/letter/[id]/{approve,html,pdf}` | API | session, ownership | Producer attestation, print view, PDFShift PDF |
| `/api/admin/backfill-output-status` | API | session | Old maintenance route |

**Roles and tenancy:** there is no firm, tenant or role model. Every row is scoped to `advisor_id = auth.uid()` by RLS. A "tenant" is therefore one advisor account (**gap** against spec §13.2 firm roles).

## 3. Data model (Supabase)

| Table | Purpose | RLS |
| --- | --- | --- |
| `policyplan_intakes` | One row per case. `payload` jsonb (the Reg 187 intake, schema 2.0.0), plus `illustration` jsonb (file metadata) and `illustration_text` (redacted text) | insert, select and update own. No delete |
| `policyplan_outputs` | One row per generation run. `letter` jsonb, `advisor_letter` md, `qa`, `extraction`, `status` pending/draft/final/error, and attestation fields | insert, select and update own. **The owner can update a `final` row from the browser with the anon key** (**gap**: approvals are not immutable at DB level) |
| `advisor_branding` | Letterhead per advisor | all own |

There is no audit-event table and no release-policy table. A trigger normalises the legacy `complete` status to `draft`.

## 4. Illustration intake and privacy (actual behaviour)

- `components/policyplan/PPUploadIllustration.tsx` with `hooks/usePDFProcessor.ts` and `workers/pdfWorker.ts` (v6.4.0, shared with ip-ai-pro-2026). pdf.js reads the PDF in a Web Worker. Text is joined per page with `--- PAGE n ---` markers. Names typed by the user, plus SSN, DOB, address, phone and email patterns, are scrubbed. The PDF bytes stay in the browser.
- **The redacted text is stored** in `policyplan_intakes.illustration_text` and sent to n8n and on to OpenAI.
- **The client names are stored and sent.** They go in `payload.insured_owner.insureds[].name`, are spread into the webhook body, and the writer puts them in the salutation ("Dear chwalk" in test 1) (**gap**).
- **Residual PII in the transmitted text (verified on the user's test 1 run).** The text that reached n8n still contained a full personal name and a phone number in the page footers, because the user typed one token and the scrubber needs two. The worker returns `warnings: name_leak_detected`, but the hook drops them, so the UI shows "N details removed" and never warns (**gap**: spec §13.1).
- There is no detection of image-only or scanned PDFs, and no handling of encrypted PDFs beyond the raw pdf.js error. There is no file fingerprint, and the filename is stored as typed by the OS (**gap**).
- The 10 MB limit is enforced in the hook. There is no page limit.

## 5. n8n (workflow `PolicyPlan 187 Letter`, webhook `policyplan-letter`)

Source: `n8n/build.py`, `n8n/src/*`, `n8n/policyplan-187-letter.json`. The full copy with ATLAS is kept out of git at `/mnt/project-files/n8n/policyplan-187-letter.with-atlas.json`.

```
Webhook (header auth) → Has illustration? → Sanitized Text1 ─┬─ ATLAS-1 Technical Extraction (gpt-6-sol, 353k-char prompt) → Atlas Parser v8.8.5 → Light Middleware v1.9.6 ─┐
                                                              └─ ATLAS-2 Contextual Quotes (gpt-6-sol) → ATLAS-2 Parse + Validate v2.0.1 ─────────────────────────────┤
                                                                                                         Merge → Atlas Evidence Envelope v2.0.1 → 187 Context Prep → 187 Letter Writer (gpt-6.1-sol) → 187 Letter QA → POST callback
```

- The ATLAS nodes are **copies** of the PolicyReview production nodes, pasted into a separate PolicyPlan workflow. The PolicyReview workflow itself is not touched by PolicyPlan.
- The callback URL comes from the request body and is not allow-listed (**gap**).
- Errors: the writer has `onError: continueRegularOutput`. An ATLAS failure stops the execution with no callback, so the output stays `pending` forever (**gap**: spec §10.2 #13).
- n8n execution history keeps the full redacted text and the writer prompts (default n8n retention).
- ATLAS-1 output (`atlas_parsed`) is rich and well suited to the Companion. It has carrier/product/form, scenario-locked ledger columns (`ledger_table.rows`, current versus guaranteed, net surrender versus policy value), coverage components, `coverage_guarantees[]` with end age, conditions and pages, premiums with schedule pattern and step changes, riders, loans, distributions, and diagnostics (`scenario_completeness`, `coverage_identity`, `ledger_table` completeness).

## 6. Letter, PDF and branding

- `lib/policyplan/letter.ts` (contract 1.1) and `lib/policyplan/letter-html.ts`: one HTML builder for the preview, print and PDF. PDF goes through PDFShift (`lib/reports/pdfshift.ts`, `PDF_API_KEY`). The letter is long, multi-page and first-person ("I recommend").
- Branding: logo data URI, colours, advisor identity and disclosures are reusable as-is.
- Approval: `approve` requires a note on every tension plus a typed-name attestation quoting 11 NYCRR 224. It sets `status=final` and `content_hash`. It does not scope by document fingerprint or template version, and there is no audit trail.

## 7. Public site claims versus reality

| Claim on `/` (PR #28) | Reality |
| --- | --- |
| "Every client deserves a best-interest letter", "built to the Reg 187 standard" | Retired by the spec. It is positioning, not a capability |
| "Client names are removed before upload" | Partly true. A name and a phone number survived in test 1 (§4) |
| "Producer signs", "approval record" | Approval exists, but the record is editable by the owner (§3) |
| `/privacy`, `/terms` links | 404 |
| Sample letter | Fictional, but long and recommendation-style |

## 8. What is retained, modified or replaced

| Keep as-is | Modify | Replace / retire from default path |
| --- | --- | --- |
| Supabase auth, middleware gating, RLS-per-advisor | Upload component: adds a privacy gate, fingerprint, scanned and encrypted detection, page limit, and no stored names or filename | Reg 187 wizard `/app` → behind `NEXT_PUBLIC_LEGACY_REG187_ENABLED` |
| pdf.js worker (shared file, untouched) | `usePDFProcessor` passes `warnings` through (additive) | 187 letter prompt and QA (kept only for the legacy workflow) |
| `advisor_branding`, PDFShift | Dashboard lists Companion cases and legacy letters side by side | Landing page and `/sample-letter` → `/sample-companion` |
| ATLAS-1 and ATLAS-2 nodes (copied, unchanged) | `policyplan_intakes` and `policyplan_outputs` get additive columns | Callback secret header → HMAC + timestamp + single-use job id |
| Legacy cases `/cases/[id]` (read-only, unchanged) | | |

No shared PolicyReview or PolicyMatch workflow, and no Insurance Planner AI code, is modified.
