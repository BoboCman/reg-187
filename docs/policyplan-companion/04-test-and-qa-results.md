# 04 · Test and QA results

Run on 2026-11-05 on branch `claude/project-thread-g74ftp`.

## 1. Automated tests: 57 passed, 0 failed

`pnpm test:companion` (TypeScript compile + `node:test`). With `COMPANION_FIXTURE_DIR` pointing at the de-identified real test 1 extraction (kept out of Git), the real-illustration test runs too; without it that one test is skipped.

| File | Covers |
| --- | --- |
| `evidence.test.ts` | Core facts and page pointers on all samples; gross vs net values; zero and `Lapse` ledger cells by column; survivorship ages and guarantee basis; unstated basis → review; invented extractor values never verified; contradictory premium; in-force and term blocked; missing extraction fails closed; corrections verified only on the cited page; real test 1 (Symetra IUL): premium, guarantee age 86, coverage ages, excerpts resolve |
| `guard.test.ts` | All three samples pass; 13 adversarial rewrites rejected (recommendation, suitability, tax, guaranteed premium, Reg 187, typed number, disallowed figure, instruction injection, phone number, markup, missing figure, guarantee without condition, safety/performance); negation allowed; survivorship first/second death; unverified figure blocks release; missing/unplanned blocks; strict JSON parsing; analyst filtering; ≤3 considerations; existing coverage and funding raise verification items; horizon rule; amount below need; privacy screen; injection detection; release gate (no policy, disabled, state, product class, expired); approval hash; renderer watermark, sample label and HTML escaping |
| `service.test.ts` | Full flow upload → export with audit trail; callback HMAC: tampered, stale, wrong secret, unconfigured, replayed and unknown jobs refused; cross-advisor access refused; producer edits re-checked and audited; open verification items block approval; brief change supersedes the approval, which re-renders identically from frozen evidence; idempotent analysis; upload gates (in-force, name leak, server screen, page mismatch, image-only); server strips identifiers before n8n; extraction retry and outage; fact correction revision; snapshot immutability |
| `n8n-contract.test.ts` | Runs the workflow's own Code-node source with a mocked n8n runtime: gate rejects foreign hosts, http, stale jobs, bad ids, missing allowlist; extract and write stages signed like the Crypto node and accepted by the app; writer check routes fenced or digit-bearing output to the retry; error path closes the job |

<details><summary>Raw results</summary>

```
ok 1 - every sample verifies its core facts against its own page text
ok 2 - net surrender value and policy value are kept apart (gross vs net)
ok 3 - zero and Lapse ledger cells verify only by column position
ok 4 - survivorship: second insured ages and the guarantee's life basis are explicit
ok 5 - survivorship guarantee endpoint without a stated life basis needs review
ok 6 - extractor values that are not in the page text are never verified
ok 7 - conflicting premium sources are marked contradictory and block release
ok 8 - in-force illustrations and term products are blocked as unsupported
ok 9 - missing extraction fails closed
ok 10 - a producer correction is verified only when the value is on the cited page
ok 11 - real test illustration (if available): core facts verified, page pointers resolve
ok 12 - all three sample companions pass every check
ok 13 - guard rejects: first-person recommendation
ok 14 - guard rejects: suitability
ok 15 - guard rejects: tax claim
ok 16 - guard rejects: guaranteed income\\/return\\/premium
ok 17 - guard rejects: Reg 187
ok 18 - guard rejects: number typed as text
ok 19 - guard rejects: not allowed
ok 20 - guard rejects: instruction-like
ok 21 - guard rejects: identifiers
ok 22 - guard rejects: markup
ok 23 - guard rejects: Missing required figure
ok 24 - guard rejects: without its conditions
ok 25 - guard rejects: safety claim|performance promise
ok 26 - negated or descriptive wording is not flagged
ok 27 - survivorship copy must name the second death and never the first
ok 28 - unverified figures cannot be printed
ok 29 - missing core blocks and unplanned blocks are caught
ok 30 - unknown tokens render as [unverified], never as raw braces
ok 31 - writer output is parsed strictly, with no repair
ok 32 - analyst output is filtered to known observations and facts
ok 33 - blockIssues refuses a block that is not in the plan
ok 34 - at most three considerations reach the client page
ok 35 - existing coverage and uncertain funding are raised and need producer verification
ok 36 - a horizon past the guarantee is flagged; a guarantee to the end of the ledger is not
ok 37 - a coverage amount below the stated need is flagged
ok 38 - privacy screen removes names and identifiers but keeps ledger figures
ok 39 - injection-like text in an illustration is detected
ok 40 - producer approval alone never opens client export
ok 41 - approval scope hash changes with any block edit or verification change
ok 42 - draft renders carry the watermark; samples are labelled; branding is escaped
ok 43 - gate rejects foreign callback hosts, stale jobs and bad shapes
ok 44 - extract stage: workflow output is accepted by the app and builds verified evidence
ok 45 - write stage: writer check, retry routing, error path and signed delivery
ok 46 - full flow: upload → facts → brief → draft → approve → export
ok 47 - callbacks: bad signature, stale timestamp, wrong secret and replay are refused
ok 48 - another advisor cannot see or act on a case
ok 49 - producer edits are re-checked; a bad edit blocks approval, a fix re-opens it
ok 50 - open verification items block approval
ok 51 - changing the brief after approval supersedes the snapshot, which still renders from its frozen evidence
ok 52 - analysis requests are idempotent while a job is in flight
ok 53 - illustration gates: in-force, name leak, residual identifiers, page mismatch, image-only
ok 54 - the server's second privacy screen strips identifiers before n8n sees the text
ok 55 - a failed extraction can be retried, and a workflow outage fails closed
ok 56 - a fact correction creates a new revision and must be on the cited page to verify
ok 57 - database immutability rule is mirrored: a final snapshot can only be superseded
# tests 57
# pass 57
# fail 0
# skipped 0
```
</details>

## 2. Database migration

Applied twice (idempotent) to a local PostgreSQL 16 with Supabase-style `auth` stubs and roles, after the four earlier migrations (`supabase/tests/illustration_companion_test.sql`):

- Legacy Reg 187 rows: advisor insert and update still work; they default to `case_type = 'reg187_letter'`.
- Advisor (anon key) cannot insert a companion row, flip a legacy row into one, or update companion evidence.
- Service role writes companion rows; a final snapshot cannot be edited, deleted or moved back to draft, only superseded; a superseded row cannot change.
- Audit events cannot be updated or deleted.
- Release policy: advisor can read own row, cannot write it.
- Another advisor sees no cases, outputs, audit events or policies.

## 3. Production build

`next build` passes (Next.js 16.2.10, TypeScript clean). 13 Companion API routes, the workspace pages and three statically generated sample pages build cleanly.

## 4. Browser run-through

`next start` in Chromium (Playwright). Browser API calls were answered by the real `service.ts` on an in-memory store; n8n was simulated by signed callbacks built from the fictional indexed UL fixture. Supabase auth was a local stub. The PDF was a real 6-page PDF made from the fictional illustration with the name "Avery Quinlan" printed on every page.

- Upload: pdf.js read 6 pages; the name was removed before sending (verified on the payload); the case URL updated in place.
- Facts: every key fact verified with its page; "View source" opened the page text with the excerpt highlighted.
- Brief: six questions plus the design follow-ups; phone layout checked at 390 px.
- Review: draft preview with watermark, all six checks green, 226 words on one page. A producer edit "This is the best and safest choice for your family." was flagged as prohibited wording and blocked approval; reverting re-opened it.
- Approval: reference `PPC-…` issued; with no firm release policy the export stayed closed with the reason shown; after recording one, the client render had no watermark and carried the reference.
- 0 page errors. Bugs found and fixed during the run: the facts screen jumped to step 2 when extraction finished; a failed extraction would have opened the Review step.
- `/sample-letter` → 308 → `/sample-companion`.

Screenshots: `/mnt/project-files/companion/screenshots/`.

## 5. Samples

Three fictional companions rendered through the real pipeline (each must pass its own checks or the page refuses to render): guaranteed UL ($750,000, guarantee to 121), indexed UL ($500,000, no-lapse guarantee to 49, guaranteed-basis coverage to 81), survivorship ($4,000,000, 25-pay, trust-owned). Each fits one US Letter page (PDF checked with `pdfinfo`). Files in `public/samples/`.

## 6. Not tested here, and why

- Live n8n and OpenAI: no credentials in this environment. The writer output in every test is a fixture; real model output will be checked by the same guard, but its quality must be reviewed in the preview with real cases.
- Live Supabase and the PDFShift PDF route: no credentials; the store is covered by the in-memory tests and the SQL test.
- Real-carrier variety beyond test 1: run the preview on several carrier illustrations (IUL, GUL, WL, survivorship) before any client use.
