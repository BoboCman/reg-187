# 02 · Design and contracts

How the Illustration Companion is built, what each part is allowed to decide, and the versioned contracts between them.

## 1. Authority

| Part | Decides | Never decides |
| --- | --- | --- |
| Browser | Reads the PDF (pdf.js worker), removes the names the producer types, fingerprints the file (SHA-256) | Facts, wording, approval |
| n8n (`policyplan-companion-v1`) | LLM work only: ATLAS-1/ATLAS-2 extraction, analyst notes, writer text | Whether a figure is verified, what the client sees, approval |
| App server (`lib/companion`) | Evidence verification, rules, plan, claim guard, approval, release gate, rendering | — |
| Producer | Corrects facts, answers the brief, edits wording, verifies items, approves | Firm approval of client use |
| Platform operator | Firm release policy (`policyplan_release_policies`), set in SQL after the firm's compliance approval | Case content |

The model can only suggest text; every sentence passes the server's guard, and every number in the document is substituted by the server from a verified fact.

## 2. Pipeline

```
PDF ─(browser: pdf.js, name removal, fingerprint)→ screened page text
   → POST /api/companion/cases/[id]/illustration   (server re-screens; gates: in-force, page markers, image-only, name leak, residual identifiers)
   → n8n stage "extract" (ATLAS-1 + ATLAS-2, copied nodes) → signed callback
   → evidence.ts: buildEvidencePacket → applyCorrections → validatePointers      (companion-evidence.v1)
   → producer confirms facts / corrects with a cited page (new revision)
   → brief (companion-brief.v1, 6 questions + conditional follow-ups)
   → rules.ts runRules (companion-rules.v1) → planner.ts buildPlan (companion-planner.v1)
   → n8n stage "write": analyst (companion_analyst.v1) + writer (companion_writer.v1, one retry) → signed callback
   → guard.ts parseWriter (strict) → guardDraft (companion-guard.v1) → assembleDraft (companion.v1)
   → producer edits (re-guarded), verifies items, approves → immutable snapshot (scope hash, frozen evidence)
   → release.ts releaseGate (firm policy) → render.ts (companion-template.v1) → HTML / PDF
```

## 3. Evidence

- `ExtractedFact`: `fact_id` (`f.*`), label, value, unit, status (`verified` · `needs_review` · `not_found` · `contradictory`), `material`, `source_refs`.
- `SourceRef`: page number, text span, redacted excerpt, measure identity (for example `net_surrender_value` vs `policy_value`), scenario (`guaranteed` / `current`).
- A fact is **verified only if its value is found on the cited page** of the screened text. Ledger cells are checked by column position, so `0` and `Lapse` cells cannot be matched by accident.
- Survivorship: issue ages of both insureds and the age basis of the guarantee are explicit; an unstated basis is `needs_review`.
- Contradictions (for example planned premium vs annualized premium) are `contradictory` and block release.
- Blockers: missing/truncated extraction, in-force illustration, term or unknown product class, unresolved core facts (insurer, product, planned premium, initial death benefit), pointer validation failure.
- Brief answers become `f.brief.*` facts with `e.brief.*` refs, so client statements have lineage too.

## 4. Rules, plan and copy

- Observations (≤3 on the client page, more on page 2 only in the approved two-page format): guarantee conditions, horizon beyond the guarantee, reliance on assumptions, funding commitment, access to cash, income strategy, amount below or not established, existing coverage, ownership, temporary coverage, dividends, market risk, gaps for unverified material facts. Priority = severity × 10 + boost (+2 when verified).
- Verification items (must be ticked before approval): material `verification_required` observations and any existing-coverage connection.
- Blocks: `b.objective`, `b.mechanism_benefit`, `b.mechanism_funding`, `b.guaranteed`, `b.illustrated`, `b.consider_1..3`. Each has allowed and required fact ids and a word budget (page total 180–325 words).
- Fact band: death benefit, planned outlay, payment period, guarantee, each with a qualifier.

## 5. Claim guard (`companion-guard.v1`)

Per block: only allowed, verified tokens; required tokens present; no digits typed in prose; no markup or links; prohibited wording (recommendation, suitability, best interest, evaluative and superlative words, safety, guaranteed income/return/premium, paid-up, lifetime coverage, cost claims, tax claims, compliance, Reg 187, approval claims, performance promises), negation-aware; a guarantee must cite guarantee facts and its condition; no "lifetime" guarantee without evidence; survivorship must name the second death and never the first; client statements only in objective and discussion blocks; no redaction markers, identifiers or instruction-like text; length. Draft-level: material evidence, pointers, word budget, document kind. `client_release_eligible` requires all of it.

## 6. Contracts

| Contract | Where |
| --- | --- |
| App → n8n job | `{ stage, job_id, case_id, revision, callback_url, issued_at, illustration_text }` or `{ …, prompt_versions, analyst_input, writer_input }` · header `policyplan-auth` |
| n8n → app callback | `callbackSchema` in `service.ts` · headers `x-companion-timestamp` (unix s), `x-companion-signature` = hex HMAC-SHA256(`COMPANION_CALLBACK_SECRET`, `${ts}.${rawBody}`), skew ≤ 15 min, job id single use, revision must match |
| Writer input/output | `companion_writer_input.v1` / `companion_writer.v1` (`writerOutputSchema`) |
| Analyst input/output | `companion_analyst_input.v1` / `companion_analyst.v1` |
| Draft | `companion.v1` (`companionDraftSchema`) stored in `policyplan_outputs.companion` |
| Approval | `policyplan_outputs.approval` = scope hash, verified items, name, time, acknowledgement, revision, frozen evidence and brief |

## 7. States (`state.ts`)

`created → document_received → extraction_pending → extracted_needs_review → intake_ready → analysis_pending → draft_ready → producer_review → approved → exported`, plus `failed_retryable`, `blocked_privacy`, `blocked_unsupported`, `blocked_evidence`, `superseded`, `archived`. Transitions are checked; a new illustration, a fact correction or a brief change after a draft creates a new revision and supersedes earlier drafts and approvals.

## 8. Data model (additive migration `20261105000000_illustration_companion.sql`)

- `policyplan_intakes` (the case): `case_type`, `companion_phase`, `companion_revision`, `case_meta`, `brief`, `extraction`, `evidence`, `fact_corrections`, `facts_confirmed`, `updated_at`. Existing rows default to `reg187_letter`.
- `policyplan_outputs` (drafts and snapshots): `case_type`, `revision`, `job_id` (unique), `companion`, `approval`, `artifact_id`, `superseded_at`.
- `policyplan_audit_events` (append-only), `policyplan_release_policies` (operator-set, producer read-only).
- Triggers: companion rows writable by the service role only; final snapshots only move to `superseded`, never edited or deleted.

## 9. Known gaps (deliberate, for later)

- Tenancy is the advisor account; there is no firm or admin role, so release policy is operator-set in SQL.
- In-force, term and scanned illustrations are refused, not handled.
- The numbers-enhanced format (milestone table, page 2) exists in the planner and renderer but is off unless the release policy allows it.
