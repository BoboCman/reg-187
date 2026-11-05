"use client";
import { useRef, useState } from "react";
import { FileText, Loader2, Lock, ShieldCheck, UploadCloud } from "lucide-react";
import { usePDFProcessor, getRedactionCounts } from "@/hooks/usePDFProcessor";
import { screenText } from "@/lib/companion/privacy";
import { US_STATES } from "@/lib/companion/contracts";
import { cn } from "@/lib/utils";
import { api, errorMessage } from "./api";

type Kind = "proposed_sales" | "in_force" | "not_sure";

async function sha256Hex(buf: ArrayBuffer) {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Name tokens that survived both screens (a leak blocks the upload). */
function leakedNames(text: string, names: string[]) {
  const lower = text.toLowerCase();
  return names.flatMap((n) => n.split(/\s+/)).map((t) => t.replace(/[^A-Za-z'\-]/g, "")).filter((t) => t.length >= 3 && new RegExp(`\\b${t.replace(/[-']/g, "\\$&")}\\b`, "i").test(lower));
}

/**
 * Step 1: the carrier's proposed illustration. The PDF never leaves the
 * browser: pdf.js reads it in a worker, client names are removed, and only the
 * screened page text (plus a fingerprint of the file) is sent.
 */
export function UploadStep({
  caseId,
  defaultJurisdiction,
  onCreated,
  onSubmitted,
  storyKey,
}: {
  storyKey?: "apartment";
  caseId: string | null;
  defaultJurisdiction?: string | null;
  onCreated: (id: string) => void;
  onSubmitted: () => void;
}) {
  const { processFile, progress, isProcessing } = usePDFProcessor();
  const [jurisdiction, setJurisdiction] = useState(defaultJurisdiction ?? "");
  const [otherStates, setOtherStates] = useState<"no" | "yes" | "unsure">("no");
  const [label, setLabel] = useState("");
  const [names, setNames] = useState(["", ""]);
  const [kind, setKind] = useState<Kind>("proposed_sales");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const cleanNames = names.map((n) => n.trim()).filter(Boolean);
  const ready = !!file && cleanNames.length > 0 && (caseId || jurisdiction) && kind !== "in_force" && !busy;

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      if (file.type && file.type !== "application/pdf") throw new Error("Upload the carrier illustration as a PDF.");
      if (file.size > 10 * 1024 * 1024) throw new Error("The PDF is larger than 10 MB.");
      const bytes = await file.arrayBuffer();
      const fingerprint = await sha256Hex(bytes);
      const result = await processFile(file, { enableRedaction: true, namesToRedact: cleanNames });
      // Second, pattern-based screen in the browser (the server repeats it).
      const screened = screenText(result.cleanText, cleanNames);
      const leaks = leakedNames(screened.text, cleanNames);
      const warnings = result.warnings.map((w) => String(w.type ?? "warning")).filter((t) => t !== "name_leak_detected");
      if (leaks.length) warnings.push(`name_leak:${leaks.length}`);
      const removed: Record<string, number> = { ...getRedactionCounts(result.redactionLog) };
      for (const r of screened.removed) removed[r.kind] = (removed[r.kind] ?? 0) + r.count;

      let id = caseId;
      if (!id) {
        const c = await api<{ id: string }>("/api/companion/cases", "POST", {
          sales_jurisdiction: jurisdiction,
          other_jurisdictions_involved: otherStates,
          ...(label.trim() ? { case_label: label.trim() } : {}),
          ...(storyKey ? { story_key: storyKey } : {}),
        });
        id = c.id;
        onCreated(id);
      }
      await api(`/api/companion/cases/${id}/illustration`, "POST", {
        text: screened.text,
        page_count: Number(result.metadata?.pageCount ?? 0),
        document_fingerprint: fingerprint,
        file_size: file.size,
        kind_confirmed: kind,
        privacy: { removed, worker_warnings: warnings.slice(0, 20), names_screened: Math.min(cleanNames.length, 10) },
        extractor: "pdfjs-worker",
      });
      onSubmitted();
    } catch (e) {
      setError(errorMessage(e));
      onSubmitted();
    } finally {
      setBusy(false);
    }
  }

  const field = "h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)]";

  return (
    <div className="space-y-5">
      {!caseId && (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Case</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="text-[var(--color-text-secondary)]">State of sale</span>
              <select className={cn(field, "mt-1")} value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}>
                <option value="">Choose…</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-[var(--color-text-secondary)]">Other states involved?</span>
              <select className={cn(field, "mt-1")} value={otherStates} onChange={(e) => setOtherStates(e.target.value as typeof otherStates)}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
                <option value="unsure">Not sure</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-[var(--color-text-secondary)]">Your label (optional)</span>
              <input className={cn(field, "mt-1")} maxLength={60} placeholder="e.g. Case 14" value={label} onChange={(e) => setLabel(e.target.value)} />
            </label>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">Use a label that does not identify the client. Client names are never stored.</p>
        </section>
      )}

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Carrier illustration</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">The carrier&apos;s proposed sales illustration, as the original PDF.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <label key={i} className="block text-sm">
              <span className="text-[var(--color-text-secondary)]">{i === 0 ? "Name on the illustration" : "Second insured (if any)"}</span>
              <input
                className={cn(field, "mt-1")}
                autoComplete="off"
                value={names[i]}
                onChange={(e) => setNames((n) => n.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={i === 0 ? "As printed on the PDF" : "Optional"}
              />
            </label>
          ))}
        </div>
        <p className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Names are used only in this browser to remove the client&apos;s identity from the text. They are not sent or stored.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) setFile(f);
          }}
          onClick={() => input.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
            drag ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]" : "border-[var(--color-border-strong)] hover:bg-[var(--color-readonly-bg)]",
          )}
        >
          {file ? <FileText className="h-7 w-7 text-[var(--color-accent)]" /> : <UploadCloud className="h-7 w-7 text-[var(--color-text-muted)]" />}
          <p className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">{file ? file.name : "Drop the PDF here or choose a file"}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{file ? `${(file.size / 1024).toFixed(0)} KB` : "PDF, up to 10 MB"}</p>
          <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm text-[var(--color-text-secondary)]">What kind of illustration is this?</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["proposed_sales", "Proposed new policy"],
                ["in_force", "In-force (existing policy)"],
                ["not_sure", "Not sure"],
              ] as [Kind, string][]
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "h-9 rounded-lg px-3 text-sm ring-1 ring-inset",
                  kind === k ? "bg-[var(--color-accent)] text-white ring-[var(--color-accent)]" : "bg-[var(--color-surface)] text-[var(--color-text-primary)] ring-[var(--color-border)]",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          {kind === "in_force" && <p className="text-sm text-amber-800">In-force illustrations are not supported in this version.</p>}
        </fieldset>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <ShieldCheck className="h-4 w-4" /> The PDF stays on this device. Only screened text is sent.
          </p>
          <button
            type="button"
            disabled={!ready}
            onClick={submit}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[var(--color-accent-hover)]"
          >
            {busy || isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {isProcessing ? `Reading page ${progress.currentPage || 1}${progress.totalPages ? ` of ${progress.totalPages}` : ""}` : busy ? "Sending…" : "Read illustration"}
          </button>
        </div>
      </section>
    </div>
  );
}
