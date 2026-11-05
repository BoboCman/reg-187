"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, ExternalLink, FileCheck2, Loader2, Lock, Sparkles } from "lucide-react";
import { formatFactValue } from "@/lib/companion/format";
import { cn } from "@/lib/utils";
import { api, errorMessage, type CaseView, type Draft } from "./api";

const ACK =
  "I reviewed this companion against the carrier illustration. It correctly reflects the illustrated facts and the client's stated objectives as I understand them, and sharing it is permitted by my firm's and the carrier's procedures.";

function Preview({ outputId, version }: { outputId: string; version: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-slate-100">
      <iframe
        key={version}
        title="Companion preview"
        src={`/api/companion/outputs/${outputId}/html?kind=preview&v=${encodeURIComponent(version)}`}
        className="h-[78vh] w-full bg-white"
        sandbox="allow-same-origin"
      />
    </div>
  );
}

function BlockEditor({ block, planned, view, value, onChange }: { block: Draft["blocks"][number]; planned?: Draft["plan"]["blocks"][number]; view: CaseView; value: string; onChange: (v: string) => void }) {
  const facts = new Map((view.evidence?.facts ?? []).map((f) => [f.fact_id, f]));
  const allowed = (planned?.allowed_fact_ids ?? []).filter((id) => id.startsWith("f.brief.") || facts.get(id)?.status === "verified");
  return (
    <div className={cn("rounded-lg border p-3", block.client_ready ? "border-[var(--color-border)]" : "border-amber-300 bg-amber-50/40")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {block.label}
          {block.page === 2 ? " · page 2" : ""}
        </p>
        <span className="text-xs text-[var(--color-text-muted)]">{block.author === "producer" ? "Edited by you" : "Drafted"}</span>
      </div>
      <textarea className="mt-2 h-24 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm leading-relaxed" maxLength={700} value={value} onChange={(e) => onChange(e.target.value)} />
      {allowed.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {allowed.slice(0, 10).map((id) => {
            const f = facts.get(id);
            return (
              <button key={id} type="button" title={id} onClick={() => onChange(`${value.trimEnd()} {{${id}}}`)} className="rounded bg-[var(--color-readonly-bg)] px-1.5 py-0.5 text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-light)]">
                + {f ? `${f.label}: ${formatFactValue(f)}` : id.replace("f.brief.", "client: ")}
              </button>
            );
          })}
        </div>
      )}
      {block.issues.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-amber-900">
          {block.issues.map((i, k) => (
            <li key={k} className="flex gap-1.5">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {i}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Step 3: draft, review, edit, verify, approve. */
export function ReviewStep({ view, onChange }: { view: CaseView; onChange: () => void }) {
  const out = view.output;
  const draft = out?.draft ?? null;
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => {
    setEdits({});
  }, [draft?.validation.word_count, out?.id]);

  const dirty = useMemo(() => !!draft && draft.blocks.some((b) => edits[b.block_id] != null && edits[b.block_id] !== b.body), [edits, draft]);
  const ready = !!view.facts_confirmed && view.brief_missing.length === 0;

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      onChange();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (!ready)
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-secondary)]">
        {!view.facts_confirmed ? "Confirm the illustration facts first." : "Answer the six client objective questions first."}
      </div>
    );

  if (!out || out.status === "superseded" || out.status === "error" || (!draft && out.status !== "pending")) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Draft the companion</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            The rules engine picks what the client most needs to understand, and the writer drafts plain-language text using only the verified figures. Every sentence is then checked before you see it.
          </p>
        </div>
        {out?.status === "error" && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">The last draft did not finish ({out.error}). Nothing was shown to anyone; try again.</p>}
        {view.release.policy?.enhanced_numeric_mode_allowed && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={enhanced} onChange={(e) => setEnhanced(e.target.checked)} /> Include the milestone table (numbers-enhanced format)
          </label>
        )}
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("analyze", () => api(`/api/companion/cases/${view.id}/analyze`, "POST", { numbers_enhanced: enhanced }))}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Draft the companion
        </button>
      </div>
    );
  }

  if (out.status === "pending" || !draft)
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--color-accent)]" />
        <p className="mt-3 text-sm font-medium">Drafting</p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Usually under a minute.</p>
      </div>
    );

  const final = out.status === "final";
  const items = view.verification_items;
  const allChecked = items.every((i) => checked.includes(i.id));
  const v = draft.validation;
  const version = `${out.id}:${draft.blocks.map((b) => b.body.length).join(".")}:${out.status}`;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-3">
        <Preview outputId={out.id} version={version} />
        <div className="flex flex-wrap gap-2 text-sm">
          <a href={`/api/companion/outputs/${out.id}/html?kind=preview`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3">
            <ExternalLink className="h-4 w-4" /> Open draft
          </a>
          <a href={`/api/companion/outputs/${out.id}/pdf?kind=preview`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3">
            <Download className="h-4 w-4" /> Draft PDF (watermarked)
          </a>
        </div>
      </div>

      <div className="space-y-4">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="text-sm font-semibold">Checks</h3>
          <ul className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
            {(
              [
                ["Figures match the illustration", v.numeric_concordance_ok],
                ["Material facts verified", v.material_evidence_ok],
                ["Every figure has a page", v.source_pointer_ok],
                ["No personal identifiers", v.pii_ok],
                ["No recommendation or claims", v.prohibited_language_ok],
                ["Guarantees stated with conditions", v.guarantee_conditions_ok],
              ] as [string, boolean][]
            ).map(([l, ok]) => (
              <li key={l} className={cn("flex items-center gap-1.5", ok ? "text-emerald-700" : "text-red-700")}>
                {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />} {l}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">{v.word_count} words · {draft.plan.two_page ? "two pages" : "one page"}</p>
          {draft.release_blockers.length > 0 && <p className="mt-2 text-xs text-red-700">Open items: {draft.release_blockers.join(", ")}</p>}
        </section>

        {!final && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Edit the text</h3>
            <p className="text-xs text-[var(--color-text-muted)]">Figures appear as {"{{…}}"} and are filled in from the verified facts. Type no numbers yourself; insert a figure instead.</p>
            {draft.blocks.map((b) => (
              <BlockEditor key={b.block_id} block={b} planned={draft.plan.blocks.find((p) => p.block_id === b.block_id)} view={view} value={edits[b.block_id] ?? b.body} onChange={(x) => setEdits((e) => ({ ...e, [b.block_id]: x }))} />
            ))}
            {dirty && (
              <button
                type="button"
                disabled={!!busy}
                onClick={() =>
                  run("edits", () =>
                    api(`/api/companion/outputs/${out.id}/edits`, "POST", {
                      blocks: Object.entries(edits)
                        .filter(([id, body]) => draft.blocks.find((b) => b.block_id === id)?.body !== body)
                        .map(([block_id, body]) => ({ block_id, body })),
                    }),
                  )
                }
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 text-sm font-semibold text-white"
              >
                {busy === "edits" && <Loader2 className="h-4 w-4 animate-spin" />} Save and re-check
              </button>
            )}
          </section>
        )}

        {draft.internal_review.length > 0 && (
          <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Notes for you (not shown to the client)</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--color-text-secondary)]">
              {draft.internal_review.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </details>
        )}

        {!final && (
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
            <h3 className="text-sm font-semibold">Verify before sharing</h3>
            {items.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">No case-specific items.</p>
            ) : (
              items.map((i) => (
                <label key={i.id} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={checked.includes(i.id)} onChange={(e) => setChecked((c) => (e.target.checked ? [...c, i.id] : c.filter((x) => x !== i.id)))} />
                  <span>{i.action}</span>
                </label>
              ))
            )}
            <label className="block text-sm">
              <span className="text-[var(--color-text-secondary)]">Your name</span>
              <input className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <span>{ACK}</span>
            </label>
            {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
            <button
              type="button"
              disabled={!!busy || dirty || !ack || name.trim().length < 2 || !allChecked || !v.client_release_eligible}
              onClick={() => run("approve", () => api(`/api/companion/outputs/${out.id}/approve`, "POST", { acknowledged: true, name: name.trim(), verified_items: checked, revision: view.revision }))}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />} Approve this companion
            </button>
            {dirty && <p className="text-xs text-amber-800">Save your edits first.</p>}
          </section>
        )}
        {final && err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      </div>
    </div>
  );
}

/** Step 4: the approved companion and the firm release gate. */
export function CompanionStep({ view }: { view: CaseView }) {
  const out = view.output;
  if (!out || out.status !== "final")
    return <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-secondary)]">Approve a draft in Review first.</div>;
  const gate = view.release.gate;
  const approval = out.approval as { by_name?: string; at?: string } | null;
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> Approved{approval?.by_name ? ` by ${approval.by_name}` : ""}
          {approval?.at ? ` on ${new Date(approval.at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : ""}
        </p>
        <p className="mt-1 text-sm text-emerald-900">Reference {out.artifact_id}. This version is locked; any change to the illustration, facts or objective starts a new revision.</p>
      </section>

      {gate?.client_export_allowed ? (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
          <h3 className="text-sm font-semibold">Share with the client</h3>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/companion/outputs/${out.id}/pdf?kind=client`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white">
              <Download className="h-4 w-4" /> Download client PDF
            </a>
            <a href={`/api/companion/outputs/${out.id}/html?kind=client`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--color-border-strong)] px-4 text-sm">
              <ExternalLink className="h-4 w-4" /> Open printable page
            </a>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">Give it to the client with the carrier illustration, which stays the authoritative document.</p>
        </section>
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 space-y-2">
          <p className="flex items-center gap-2 font-semibold">
            <Lock className="h-4 w-4" /> Client export is not open yet
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {(gate?.reasons ?? ["Your firm's approval of this document for client use is not recorded."]).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p>Your approval checks this case. Using the format with clients also needs your firm&apos;s compliance approval, which is recorded separately. Until then you can download the watermarked draft for internal review.</p>
          <a href={`/api/companion/outputs/${out.id}/pdf?kind=preview`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3">
            <Download className="h-4 w-4" /> Watermarked draft PDF
          </a>
        </section>
      )}

      {view.history.length > 1 && (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="text-sm font-semibold">History</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {view.history.map((h) => (
              <li key={h.id} className="flex justify-between gap-3">
                <span>
                  Revision {h.revision} · {h.artifact_id}
                </span>
                <span className="text-[var(--color-text-muted)]">{h.status === "superseded" ? "Superseded" : "Current"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
