/** Case phase machine with explicit allowed transitions (spec §9). */
import type { CasePhase } from "./contracts";

const T: Record<CasePhase, CasePhase[]> = {
  created: ["document_received", "archived"],
  document_received: ["extraction_pending", "blocked_privacy", "blocked_unsupported", "archived"],
  extraction_pending: ["extracted_needs_review", "failed_retryable", "blocked_unsupported", "blocked_evidence", "document_received", "archived"],
  extracted_needs_review: ["intake_ready", "document_received", "blocked_evidence", "archived"],
  intake_ready: ["analysis_pending", "extracted_needs_review", "document_received", "archived"],
  analysis_pending: ["draft_ready", "failed_retryable", "intake_ready", "extracted_needs_review", "archived"],
  draft_ready: ["producer_review", "approved", "analysis_pending", "intake_ready", "extracted_needs_review", "document_received", "archived"],
  producer_review: ["approved", "analysis_pending", "intake_ready", "extracted_needs_review", "document_received", "archived"],
  approved: ["exported", "superseded", "intake_ready", "extracted_needs_review", "document_received", "archived"],
  exported: ["exported", "superseded", "intake_ready", "extracted_needs_review", "document_received", "archived"],
  failed_retryable: ["extraction_pending", "analysis_pending", "document_received", "intake_ready", "extracted_needs_review", "archived"],
  blocked_privacy: ["document_received", "archived"],
  blocked_unsupported: ["document_received", "archived"],
  blocked_evidence: ["extracted_needs_review", "extraction_pending", "document_received", "archived"],
  superseded: ["archived"],
  archived: [],
};

export function canTransition(from: CasePhase, to: CasePhase): boolean {
  return from === to || T[from].includes(to);
}

export function assertTransition(from: CasePhase, to: CasePhase) {
  if (!canTransition(from, to)) throw new Error(`illegal_transition:${from}->${to}`);
}

/** Which of the four visible steps a phase belongs to. */
export function stepOf(phase: CasePhase): 1 | 2 | 3 | 4 {
  switch (phase) {
    case "created":
    case "document_received":
    case "extraction_pending":
    case "blocked_privacy":
    case "blocked_unsupported":
    case "blocked_evidence":
    case "extracted_needs_review": // facts are confirmed on the Illustration step
      return 1;
    case "intake_ready":
      return 2;
    case "analysis_pending":
    case "draft_ready":
    case "producer_review":
    case "failed_retryable":
      return 3;
    default:
      return 4;
  }
}
