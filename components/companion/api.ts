"use client";
import type { caseView } from "@/lib/companion/service";

export type CaseView = Awaited<ReturnType<typeof caseView>>;
export type Draft = NonNullable<NonNullable<CaseView["output"]>["draft"]>;

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    public detail: unknown,
  ) {
    super(code);
  }
}

const MESSAGES: Record<string, string> = {
  unauthorized: "Your session has ended. Sign in again.",
  not_found: "This case could not be found.",
  not_configured: "The Companion service is not configured on this deployment yet.",
  workflow_unavailable: "The drafting service did not respond. Nothing was lost; try again in a minute.",
  unsupported_in_force: "In-force illustrations are not supported. Upload the proposed sales illustration.",
  unreadable_document: "The page text could not be matched to the PDF's pages. Upload the carrier's original PDF.",
  image_only_pdf: "Most pages have no readable text (a scanned or image-only PDF). Upload the carrier's original PDF.",
  privacy_name_leak: "A client name was still present after redaction, so nothing was sent. Check the spelling of the names and try again.",
  privacy_residual: "Personal identifiers were still present after redaction, so nothing was sent.",
  facts_not_confirmed: "Confirm the illustration facts first.",
  brief_incomplete: "Answer every question in the client objective first.",
  core_facts_unresolved: "Some core facts could not be verified. Correct them from the carrier illustration first.",
  stale_revision: "The case changed in another tab. Reload to see the latest version.",
  verification_items_open: "Tick every item under “Verify before sharing” first.",
  validation_failed: "Some blocks still need attention. Fix the flagged wording first.",
  release_gate_closed: "Client export is not open for your account yet.",
  not_approved: "Approve the companion first.",
  still_running: "The extraction is still running. Give it a few more minutes.",
  too_many_attempts: "Extraction failed several times. Contact support with the case reference.",
  invalid_input: "Some answers are not valid. Check the highlighted fields.",
  pdf_unavailable: "PDF service unavailable. Open the page and use your browser's Print instead.",
  pdf_failed: "The PDF could not be generated. Open the page and use your browser's Print instead.",
  conflict: "Another change landed at the same time. Reload and try again.",
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const d = err.detail as { message?: string; reasons?: string[] } | null;
    return d?.message ?? MESSAGES[err.code] ?? `Something went wrong (${err.code}).`;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

export async function api<T = unknown>(path: string, method: "GET" | "POST" | "PUT" = "GET", body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError((json as { error?: string }).error ?? `http_${r.status}`, r.status, (json as { detail?: unknown }).detail ?? null);
  return json as T;
}
