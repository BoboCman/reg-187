# 03 · Privacy and compliance review

Owner and counsel should read this before any client use. Nothing here is legal advice; it records what the software does.

## 1. What data goes where

| Data | Browser | App database | n8n / OpenAI |
| --- | --- | --- | --- |
| PDF file | read locally | **not stored** (fingerprint and size only; no filename) | not sent |
| Client names typed by the producer | used to redact, discarded | not stored (count only) | not sent |
| Screened page text | produced | `policyplan_intakes.illustration_text` | sent for extraction |
| Brief answers | entered | `policyplan_intakes.brief` | structured codes; free-text notes re-screened before sending |
| Case label | entered | `case_meta` (producer is told not to use identifying labels) | not sent |
| Drafts, approvals, audit | – | `policyplan_outputs`, `policyplan_audit_events` | – |

Screening: names (whole words ≥3 letters, case-insensitive), email, SSN, phone (punctuated forms only, so ledger rows are safe), dates of birth, account-like numbers. The browser screens, then the server screens again and **blocks** the upload if a typed name survived. Generated copy is also checked for identifiers.

## 2. Findings from the audit (pre-existing system)

1. **Test 1 PII leak (Reg 187 letter flow).** The redacted text of the real test illustration still contained a personal name in page footers and a phone number, and it was sent to n8n/OpenAI. Cause: the worker's `name_leak` warnings were dropped by `usePDFProcessor`, and nothing screened server-side. Fixed for the Companion: the hook now returns warnings, a leak blocks the upload, and the server screens patterns again. The legacy Reg 187 flow is retired from new work (flag off); its stored rows are unchanged. **Action for the owner:** decide whether the stored test 1 row should be deleted and whether OpenAI retention terms for that request need review.
2. Client names were stored in the legacy intake and used in the letter salutation. The Companion stores and prints no client name.
3. The legacy callback used a shared secret header only. The Companion callback is HMAC-signed with a timestamp and single-use job ids; the workflow refuses callback hosts outside `COMPANION_CALLBACK_HOSTS`.
4. Legacy RLS lets an owner update their own final outputs with the anon key. For Companion rows a trigger blocks every browser write, and final snapshots are immutable even for the server.
5. A failed ATLAS run left legacy outputs pending forever. The Companion workflow posts an error callback on any node failure, and the producer can retry.
6. `/privacy` and `/terms` returned 404. They now exist as **placeholders with no legal text** (see §4).

## 3. Product classification and wording

- Positioning: an advisor-support and communication tool. It does not recommend or approve products, replace carrier illustrations or forms, or determine compliance with any law or firm rule (scope text on the site footer and FAQ).
- Every companion states that the carrier illustration is authoritative, that non-guaranteed values are not guaranteed, and that it is not a contract, a carrier document or a recommendation, and does not address tax or legal questions.
- Prohibited wording is enforced on model and producer text alike (doc 02 §5).
- Two approvals are separate: the producer's case approval, and the firm's approval of client use (release policy). Without the second, only a watermarked draft can be downloaded.
- Removed from the public site: "best-interest letter", "built to the Reg 187 standard", "every case in every state", "three-minute profile", "signed letter", BGA and Reg 187 comparison sections.

## 4. Open items for counsel and the owner (block public go-live)

- Approved Privacy Policy and Terms of Use text for `/privacy` and `/terms`.
- Confirm the OpenAI processing terms (retention, training) before the site says anything about them; the FAQ currently names OpenAI and does not promise anything else.
- Review the companion footer notice, the acknowledgement text producers sign (`ACKNOWLEDGEMENT` in `service.ts`) and the scope text.
- Decide per firm: states, product classes and whether the numbers-enhanced format is allowed, then record it in `policyplan_release_policies`.
- Carrier rules on supplemental sales material: some carriers require approval of any material used with their illustration. The release policy is the place to record that; the software cannot check it.
