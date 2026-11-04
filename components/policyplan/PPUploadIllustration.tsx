"use client";
import { useCallback, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Lock, UploadCloud, X } from "lucide-react";
import { usePDFProcessor, getRedactionCounts } from "@/hooks/usePDFProcessor";
import { usePPWizard } from "@/lib/policyplan/wizard-context";
import { Button } from "@/components/ui/button";
import { PPQuickTap } from "@/components/policyplan/PPQuickTap";
import { PP_SAMPLE_CASE } from "@/lib/policyplan/sample-case";
import { cn } from "@/lib/utils";

/**
 * Step 1 of the journey: the proposed sales illustration.
 * The PDF is read and names are redacted in the browser (Web Worker, pdf.js);
 * only the redacted text is kept and later sent to the letter workflow.
 */
export function PPUploadIllustration() {
  const { illustration, setIllustration, setUploadDone, formData, patch, loadSample } = usePPWizard();
  const { processFile, progress, isProcessing, error, reset } = usePDFProcessor();

  const existing = formData.insured_owner?.insureds ?? [];
  const [name1, setName1] = useState(existing[0]?.name ?? "");
  const [name2, setName2] = useState(existing[1]?.name ?? "");
  const [ownership, setOwnership] = useState<"individual" | "trust" | "business">(
    formData.insured_owner?.ownership_type ?? "individual"
  );
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const names = [name1, name2].map((n) => n.trim()).filter(Boolean);
  const canUpload = names.length > 0 && !isProcessing;

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const result = await processFile(file, { enableRedaction: true, namesToRedact: names });
        setIllustration({
          text: result.cleanText,
          filename: file.name,
          size_bytes: file.size,
          page_count: Number(result.metadata?.pageCount ?? 0),
          redaction_counts: getRedactionCounts(result.redactionLog),
          extracted_at: new Date().toISOString(),
        });
      } catch {
        // error state is surfaced by the hook
      }
    },
    [processFile, names, setIllustration]
  );

  function onContinue() {
    // Names and ownership are the whole "who" of the short profile; age, sex
    // and rating class come from the illustration.
    const prev = formData.insured_owner?.insureds ?? [];
    patch({
      insured_owner: {
        ...formData.insured_owner,
        ownership_type: ownership,
        insureds: names.map((name, i) => ({ ...prev[i], name })),
      },
    });
    setUploadDone(true);
  }

  const removed = illustration
    ? Object.values(illustration.redaction_counts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Who is the client?</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            We use these names to strip the client&apos;s identity from the illustration before anything is uploaded.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-[var(--color-text-secondary)]">Insured</span>
            <input
              value={name1}
              onChange={(e) => setName1(e.target.value)}
              disabled={!!illustration}
              placeholder="First and last name"
              className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] disabled:bg-[var(--color-readonly-bg)]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--color-text-secondary)]">Second insured (optional)</span>
            <input
              value={name2}
              onChange={(e) => setName2(e.target.value)}
              disabled={!!illustration}
              placeholder="For joint or survivorship"
              className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] disabled:bg-[var(--color-readonly-bg)]"
            />
          </label>
        </div>
        <PPQuickTap
          question="Who will own the policy?"
          options={[
            { value: "individual", label: "The insured" },
            { value: "trust", label: "A trust" },
            { value: "business", label: "A business" },
          ]}
          value={ownership}
          onChange={setOwnership}
        />
      </section>

      {!illustration ? (
        <section
          onDragOver={(e) => {
            e.preventDefault();
            if (canUpload) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f && canUpload) handleFile(f);
          }}
          className={cn(
            "rounded-xl border-2 border-dashed p-10 text-center transition-colors",
            dragOver ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]" : "border-[var(--color-border-strong)] bg-[var(--color-surface)]",
            !canUpload && !isProcessing && "opacity-60"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          {isProcessing ? (
            <div className="space-y-3">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--color-accent)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">
                Reading page {progress.currentPage || 1}
                {progress.totalPages ? ` of ${progress.totalPages}` : ""} and removing client names…
              </p>
              <div className="mx-auto h-1.5 w-64 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div className="h-full bg-[var(--color-accent)] transition-all" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <UploadCloud className="mx-auto h-9 w-9 text-[var(--color-accent)]" />
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                Drop the proposed sales illustration here
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">PDF, up to 10 MB, all pages</p>
              <Button type="button" onClick={() => inputRef.current?.click()} disabled={!canUpload}>
                Choose PDF
              </Button>
              {names.length === 0 && (
                <p className="text-xs text-[var(--color-text-muted)]">Enter the insured&apos;s name first.</p>
              )}
            </div>
          )}
          {error && (
            <p className="mt-4 text-sm text-[var(--color-error)]">
              {error}{" "}
              <button type="button" className="underline" onClick={reset}>
                Try again
              </button>
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-[var(--color-success)]" />
            <div className="flex-1 min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                <FileText className="h-4 w-4" />
                <span className="truncate">{illustration.filename}</span>
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {illustration.page_count} pages read. {removed} identifying {removed === 1 ? "detail" : "details"} removed.
              </p>
            </div>
            <button
              type="button"
              aria-label="Remove illustration"
              onClick={() => {
                setIllustration(null);
                reset();
              }}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </section>
      )}

      <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        <Lock className="h-3.5 w-3.5" />
        The PDF never leaves your browser. Only the redacted text is saved with the case.
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              loadSample(PP_SAMPLE_CASE);
              setUploadDone(true);
            }}
            className="text-sm text-[var(--color-text-muted)] underline-offset-4 hover:underline"
          >
            Try the sample case
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={names.length === 0}
            className="text-sm text-[var(--color-text-muted)] underline-offset-4 hover:underline disabled:opacity-40"
          >
            Skip the upload
          </button>
        </div>
        <Button type="button" onClick={onContinue} disabled={!illustration}>
          Continue to client profile
        </Button>
      </div>
    </div>
  );
}
