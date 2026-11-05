"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Loader2, PenLine, RefreshCw, X } from "lucide-react";
import { formatFactValue } from "@/lib/companion/format";
import type { ExtractedFact } from "@/lib/companion/contracts";
import { cn } from "@/lib/utils";
import { api, errorMessage, type CaseView } from "./api";

const KEY_FACTS = [
  "f.insurer",
  "f.product_name",
  "f.product_class",
  "f.illustration_date",
  "f.insured_structure",
  "f.issue_age",
  "f.issue_age_insured_1",
  "f.issue_age_insured_2",
  "f.underwriting_class",
  "f.initial_death_benefit",
  "f.death_benefit_option",
  "f.planned_premium_outlay",
  "f.premium_mode",
  "f.premium_payment_years",
  "f.last_premium_age",
  "f.guarantee_name",
  "f.guarantee_end_age",
  "f.guarantee_conditions",
  "f.guaranteed_scenario_coverage_through_age",
  "f.illustrated_coverage_through_age",
  "f.illustrated_rate",
  "f.guaranteed_rate",
  "f.surrender_charge_end_year",
  "f.riders_included",
  "f.distributions_illustrated",
];

const STATUS: Record<ExtractedFact["status"], { label: string; cls: string }> = {
  verified: { label: "Found on page", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  needs_review: { label: "Check", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  not_found: { label: "Not found", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
  contradictory: { label: "Conflicting", cls: "bg-red-50 text-red-700 ring-red-200" },
};

export function SourcePanel({ caseId, page, onClose, highlight }: { caseId: string; page: number; onClose: () => void; highlight?: string | null }) {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    api<{ page_number: number; text: string }>(`/api/companion/cases/${caseId}/source?page=${page}`)
      .then((p) => live && setText(p.text))
      .catch((e) => live && setErr(errorMessage(e)));
    return () => {
      live = false;
    };
  }, [caseId, page]);
  const parts = text && highlight ? text.split(highlight) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-t-2xl bg-[var(--color-surface)] shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <p className="text-sm font-semibold">Illustration page {page} (screened text)</p>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-[var(--color-readonly-bg)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {err ? (
            <p className="text-sm text-red-700">{err}</p>
          ) : text === null ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--color-text-secondary)]">
              {parts && parts.length > 1
                ? parts.map((p, i) => (
                    <span key={i}>
                      {p}
                      {i < parts.length - 1 && <mark className="bg-amber-200">{highlight}</mark>}
                    </span>
                  ))
                : text}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function CorrectForm({ caseId, fact, pages, onDone }: { caseId: string; fact: ExtractedFact; pages: number[]; onDone: (msg?: string) => void }) {
  const [value, setValue] = useState(fact.value == null ? "" : String(fact.value));
  const [reason, setReason] = useState("");
  const [page, setPage] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const numeric = ["usd", "age", "years", "policy_year", "percent", "count"].includes(fact.unit);
  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const v = numeric ? Number(value.replace(/[$,%\s]/g, "")) : value.trim();
      if (numeric && !Number.isFinite(v)) throw new Error("Enter a number.");
      await api(`/api/companion/cases/${caseId}/facts/correct`, "POST", { fact_id: fact.fact_id, value: v, reason, source_page: page ? Number(page) : null });
      onDone("Correction saved. It counts as verified only if the value appears on the page you cited.");
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const field = "h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm";
  return (
    <div className="mt-2 space-y-2 rounded-lg bg-[var(--color-readonly-bg)] p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
        <input className={field} value={value} onChange={(e) => setValue(e.target.value)} aria-label="Corrected value" />
        <select className={field} value={page} onChange={(e) => setPage(e.target.value)} aria-label="Page">
          <option value="">Page…</option>
          {pages.map((p) => (
            <option key={p} value={p}>
              Page {p}
            </option>
          ))}
        </select>
      </div>
      <input className={field} placeholder="Why (e.g. typed from the ledger on page 6)" value={reason} onChange={(e) => setReason(e.target.value)} />
      {err && <p className="text-xs text-red-700">{err}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy || reason.trim().length < 5} onClick={save} className="h-8 rounded-md bg-[var(--color-accent)] px-3 text-xs font-semibold text-white disabled:opacity-50">
          Save correction
        </button>
        <button type="button" onClick={() => onDone()} className="h-8 rounded-md px-3 text-xs">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function FactsStep({ view, onChange }: { view: CaseView; onChange: () => void }) {
  const [source, setSource] = useState<{ page: number; excerpt?: string | null } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ev = view.evidence;
  const ex = view.extraction;

  if (view.phase === "extraction_pending" || (ex.status === "pending" && !ev)) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--color-accent)]" />
        <p className="mt-3 text-sm font-medium">Reading the illustration</p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Finding each figure and the page it is on. This usually takes two to four minutes.</p>
        <RetryButton view={view} onChange={onChange} quiet />
      </div>
    );
  }
  if (view.phase === "failed_retryable" && !ev) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-800">The illustration could not be read</p>
        <p className="mt-1 text-sm text-red-700">{ex.error ? `Reason: ${String(ex.error)}` : "The extraction service did not finish."}</p>
        <RetryButton view={view} onChange={onChange} />
      </div>
    );
  }
  if (!ev) return null;

  const refs = new Map(ev.refs.map((r) => [r.evidence_id, r]));
  const byId = new Map(ev.facts.map((f) => [f.fact_id, f]));
  const shown = KEY_FACTS.map((id) => byId.get(id)).filter((f): f is ExtractedFact => !!f && !(f.status === "not_found" && !f.material));
  const unsupported = ev.blockers.filter((b) => b.startsWith("unsupported_"));
  const confirmed = !!view.facts_confirmed;

  async function confirm() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/companion/cases/${view.id}/facts/confirm`, "POST", { revision: view.revision });
      onChange();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {unsupported.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">This illustration is not supported yet</p>
          <p className="mt-1">
            {unsupported.includes("unsupported_in_force") ? "It appears to be an in-force illustration. " : ""}
            {unsupported.includes("unsupported_product_class") ? "Term and unrecognized products are not supported in this version. " : ""}
            Upload a proposed sales illustration for permanent life insurance.
          </p>
        </div>
      )}
      {ev.warnings.length > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <summary className="cursor-pointer font-medium">{ev.warnings.length} extraction note{ev.warnings.length === 1 ? "" : "s"}</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {ev.warnings.slice(0, 12).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex flex-col gap-1 border-b border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Illustration facts</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Each figure is checked against the page it came from. Only verified figures can appear in the companion.</p>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">
            {ev.product_class} · {ev.insured_structure === "survivorship" ? "Survivorship" : "Single life"} · {ev.page_numbers.length} pages
          </span>
        </div>
        <ul className="divide-y divide-[var(--color-border)]">
          {shown.map((f) => {
            const ref = refs.get(f.source_refs[0]);
            const s = STATUS[f.status];
            return (
              <li key={f.fact_id} className="px-5 py-3">
                <div className="grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-1 sm:grid-cols-[220px_1fr_auto]">
                  <p className="text-sm text-[var(--color-text-secondary)]">{f.label}</p>
                  <span className={cn("justify-self-end rounded-full px-2 py-0.5 text-xs ring-1 ring-inset sm:order-3", s.cls)}>{f.corrected ? "Corrected · " : ""}{s.label}</span>
                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] break-words">{formatFactValue(f) || "—"}</p>
                    {f.notes?.length ? <p className="text-xs text-[var(--color-text-muted)]">{f.notes[0]}</p> : null}
                    <div className="mt-1 flex gap-3 text-xs">
                      {ref?.page_number && (
                        <button type="button" className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline" onClick={() => setSource({ page: ref.page_number!, excerpt: ref.raw_excerpt_redacted ?? null })}>
                          <Eye className="h-3.5 w-3.5" /> Page {ref.page_number}
                        </button>
                      )}
                      {!f.fact_id.startsWith("f.brief.") && (
                        <button type="button" className="inline-flex items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" onClick={() => setEditing(editing === f.fact_id ? null : f.fact_id)}>
                          <PenLine className="h-3.5 w-3.5" /> Correct
                        </button>
                      )}
                    </div>
                    {editing === f.fact_id && (
                      <CorrectForm
                        caseId={view.id}
                        fact={f}
                        pages={ev.page_numbers}
                        onDone={(m) => {
                          setEditing(null);
                          if (m) {
                            setMsg(m);
                            onChange();
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {msg && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{msg}</p>}
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      {!unsupported.length && (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {confirmed ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Facts confirmed for revision {view.revision}.
              </span>
            ) : (
              "Check the figures against the carrier PDF, then confirm."
            )}
          </p>
          {!confirmed && (
            <button type="button" disabled={busy} onClick={confirm} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} These facts match the illustration
            </button>
          )}
        </div>
      )}
      {shown.some((f) => f.status === "contradictory" || (f.material && f.status !== "verified")) && (
        <p className="flex items-start gap-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Figures that are not verified stay out of the client page and are listed for your review.
        </p>
      )}
      {source && <SourcePanel caseId={view.id} page={source.page} highlight={source.excerpt} onClose={() => setSource(null)} />}
    </div>
  );
}

function RetryButton({ view, onChange, quiet }: { view: CaseView; onChange: () => void; quiet?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const started = view.extraction.requested_at ? new Date(String(view.extraction.requested_at)).getTime() : 0;
  if (quiet && Date.now() - started < 12 * 60 * 1000) return null;
  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            await api(`/api/companion/cases/${view.id}/retry`, "POST", {});
            onChange();
          } catch (e) {
            setErr(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium"
      >
        <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} /> Try again
      </button>
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
    </div>
  );
}
