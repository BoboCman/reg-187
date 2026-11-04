"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, Loader2, Pencil, Printer, RefreshCw, ShieldCheck } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/client";
import { letterSchema, type Letter } from "@/lib/policyplan/letter";
import { buildLetterHtml, type LetterBranding } from "@/lib/policyplan/letter-html";
import { cn } from "@/lib/utils";

export interface LetterOutput {
  id: string;
  status: string;
  letter: unknown;
  qa: { passed?: boolean; checks?: { id: string; passed: boolean; detail?: string }[] } | null;
  flag_resolutions: { code: string; resolution_text: string }[] | null;
  adopted_at: string | null;
  completed_at: string | null;
  content_hash: string | null;
  meta: { reason?: string; detail?: string; approved_by_name?: string } | null;
}

const POLL_MS = 5000;
const POLL_MAX_MS = 20 * 60 * 1000;

const QA_LABELS: Record<string, string> = {
  required_sections: "A required section is missing",
  unfavorable_considerations_present: "The “what to weigh” section looks thin",
  tensions_addressed: "A flagged point isn't addressed in the letter",
  numbers_trace_to_packet: "A number in the letter doesn't match the illustration or profile",
  no_overpromising_language: "The letter uses language that may overpromise",
};

const ATTEST =
  "I reviewed this letter and the client information it is based on. It states my recommendation and my reasonable basis for believing the policy is in the client's best interest, including the unfavorable considerations.";

export function LetterWorkspace({
  intakeId,
  preparedFor,
  branding,
  initialOutput,
}: {
  intakeId: string;
  preparedFor: string | null;
  branding: LetterBranding | null;
  initialOutput: LetterOutput | null;
}) {
  const [output, setOutput] = useState<LetterOutput | null>(initialOutput);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const pollStart = useRef<number>(Date.now());

  // ── polling while the workflow runs ──────────────────────────────────────
  const poll = useCallback(async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("policyplan_outputs")
      .select("id, status, letter, qa, flag_resolutions, adopted_at, completed_at, content_hash, meta")
      .eq("id", id)
      .maybeSingle();
    if (data) setOutput(data as LetterOutput);
  }, []);

  useEffect(() => {
    if (output?.status !== "pending") return;
    pollStart.current = Date.now();
    setTimedOut(false);
    const t = setInterval(() => {
      if (Date.now() - pollStart.current > POLL_MAX_MS) {
        setTimedOut(true);
        clearInterval(t);
        return;
      }
      poll(output.id);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [output?.id, output?.status, poll]);

  async function start() {
    setStarting(true);
    setTriggerError(null);
    try {
      const res = await fetch("/api/policyplan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake_id: intakeId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.output_id) throw new Error(j.message || j.error || "Could not start the letter.");
      setOutput({ id: j.output_id, status: "pending", letter: null, qa: null, flag_resolutions: null, adopted_at: null, completed_at: null, content_hash: null, meta: null });
    } catch (e) {
      setTriggerError(e instanceof Error ? e.message : "Could not start the letter.");
    } finally {
      setStarting(false);
    }
  }

  const parsedLetter = useMemo(() => {
    const r = letterSchema.safeParse(output?.letter);
    return r.success ? r.data : null;
  }, [output?.letter]);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AppNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-accent)]">Step 3 of 3 · Letter</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)]">
          {preparedFor ? `Recommendation letter for ${preparedFor}` : "Recommendation letter"}
        </h1>

        {(!output || output.status === "error") && (
          <StateCard tone={output ? "error" : "neutral"}>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {output
                ? `The last attempt didn't finish${output.meta?.detail ? ` (${output.meta.detail})` : output.meta?.reason ? ` (${output.meta.reason})` : ""}.`
                : "The letter hasn't been started yet."}
            </p>
            <button type="button" onClick={start} disabled={starting} className={primaryBtn}>
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {output ? "Try again" : "Generate the letter"}
            </button>
            {triggerError && <p className="text-sm text-[var(--color-error)]">{triggerError}</p>}
          </StateCard>
        )}

        {output?.status === "pending" && (
          <StateCard tone="neutral">
            {!timedOut ? (
              <>
                <Loader2 className="h-7 w-7 animate-spin text-[var(--color-accent)]" />
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Reading the illustration and drafting the letter…</p>
                <p className="text-xs text-[var(--color-text-muted)]">This usually takes 3 to 5 minutes. You can leave this page and come back.</p>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--color-text-secondary)]">This is taking longer than usual.</p>
                <button type="button" onClick={() => output && poll(output.id)} className={secondaryBtn}>
                  <RefreshCw className="h-4 w-4" /> Check again
                </button>
              </>
            )}
          </StateCard>
        )}

        {output && (output.status === "draft" || output.status === "final") && parsedLetter && (
          <LetterReview
            output={output}
            letter={parsedLetter}
            branding={branding}
            preparedFor={preparedFor}
            onApproved={() => poll(output.id)}
          />
        )}

        {output && (output.status === "draft" || output.status === "final") && !parsedLetter && (
          <StateCard tone="error">
            <p className="text-sm text-[var(--color-text-secondary)]">
              This case was drafted by the previous workflow and has no structured letter.
            </p>
            <Link href={`/cases/${intakeId}?view=legacy`} className={secondaryBtn}>Open the previous case view</Link>
            <button type="button" onClick={start} disabled={starting} className={primaryBtn}>Generate a new letter</button>
          </StateCard>
        )}
      </main>
    </div>
  );
}

// ── review / approve ───────────────────────────────────────────────────────

function LetterReview({
  output,
  letter: initial,
  branding,
  preparedFor,
  onApproved,
}: {
  output: LetterOutput;
  letter: Letter;
  branding: LetterBranding | null;
  preparedFor: string | null;
  onApproved: () => void;
}) {
  const final = output.status === "final";
  const [letter, setLetter] = useState<Letter>(initial);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries((output.flag_resolutions ?? []).map((r) => [r.code, r.resolution_text]))
  );
  const [confirmed, setConfirmed] = useState(false);
  const [name, setName] = useState(branding?.advisor_name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setLetter(initial), [initial]);

  const html = useMemo(
    () =>
      buildLetterHtml(letter, branding, {
        date: (final ? output.adopted_at : output.completed_at) ?? new Date().toISOString(),
        preparedFor,
        draft: !final,
        approvedBy: final ? output.meta?.approved_by_name ?? null : null,
        approvedAt: final ? output.adopted_at : null,
      }),
    [letter, branding, final, output, preparedFor]
  );

  const tensions = letter.tensions;
  const notesDone = tensions.every((t) => (notes[t.code] ?? "").trim().length > 0);
  const canApprove = !final && notesDone && confirmed && name.trim().length >= 2 && !saving;
  const failedQa = (output.qa?.checks ?? []).filter((c) => !c.passed);

  async function approve() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/policyplan/letter/${output.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letter, notes, attestation: { confirmed: true, name: name.trim() } }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error === "notes_required" ? "Add a note to every flagged point." : j.error || "Could not approve.");
      onApproved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not approve.");
    } finally {
      setSaving(false);
    }
  }

  const patchSection = (i: number, field: "paragraphs" | "bullets", j: number, v: string) =>
    setLetter((l) => ({
      ...l,
      sections: l.sections.map((s, si) => (si === i ? { ...s, [field]: s[field].map((x, xj) => (xj === j ? v : x)) } : s)),
    }));

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Letter */}
      <div className="space-y-3 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {!final && (
            <button type="button" onClick={() => setEditing((e) => !e)} className={secondaryBtn}>
              <Pencil className="h-4 w-4" /> {editing ? "Done editing" : "Edit text"}
            </button>
          )}
          <a href={`/api/policyplan/letter/${output.id}/pdf`} className={final ? primaryBtn : secondaryBtn}>
            <Download className="h-4 w-4" /> {final ? "Download PDF" : "Download draft PDF"}
          </a>
          <a href={`/api/policyplan/letter/${output.id}/html?print=1`} target="_blank" rel="noreferrer" className={secondaryBtn}>
            <Printer className="h-4 w-4" /> Print
          </a>
          <Link href="/settings/branding" className="ml-auto text-xs text-[var(--color-text-muted)] underline-offset-4 hover:underline">
            Edit letterhead
          </Link>
        </div>

        {editing ? (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-5">
            <EditField label="Greeting" value={letter.salutation} onChange={(v) => setLetter((l) => ({ ...l, salutation: v }))} rows={1} />
            <EditField label="Opening" value={letter.opening} onChange={(v) => setLetter((l) => ({ ...l, opening: v }))} />
            {letter.sections.map((s, i) => (
              <div key={s.id} className="space-y-2">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{s.title}</p>
                {s.paragraphs.map((p, j) => (
                  <EditField key={`p${j}`} value={p} onChange={(v) => patchSection(i, "paragraphs", j, v)} />
                ))}
                {s.bullets.map((p, j) => (
                  <EditField key={`b${j}`} label="Bullet" value={p} onChange={(v) => patchSection(i, "bullets", j, v)} rows={2} />
                ))}
              </div>
            ))}
            <EditField label="Closing" value={letter.closing} onChange={(v) => setLetter((l) => ({ ...l, closing: v }))} />
          </div>
        ) : (
          <iframe
            title="Letter preview"
            srcDoc={html}
            sandbox=""
            className="w-full h-[1100px] rounded-lg border border-[var(--color-border)] bg-white shadow-sm"
          />
        )}
      </div>

      {/* Review panel */}
      <aside className="space-y-4">
        {final ? (
          <div className="rounded-lg border border-[var(--color-success)] bg-[var(--color-success-light)] p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-[var(--color-success)]">
              <CheckCircle2 className="h-4 w-4" /> Approved
            </p>
            <p className="mt-1 text-[var(--color-text-secondary)]">
              {output.meta?.approved_by_name ? `By ${output.meta.approved_by_name}` : "Approved"}
              {output.adopted_at ? ` on ${new Date(output.adopted_at).toLocaleDateString()}` : ""}. This version is locked and saved with the case.
            </p>
            {output.content_hash && (
              <p className="mt-2 font-mono text-[10px] text-[var(--color-text-muted)] break-all">Record {output.content_hash.slice(0, 16)}</p>
            )}
          </div>
        ) : (
          failedQa.length > 0 && (
            <div className="rounded-lg border border-[var(--color-warning)] bg-[var(--color-warning-light)] p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold text-[var(--color-warning)]">
                <AlertTriangle className="h-4 w-4" /> Check before approving
              </p>
              <ul className="mt-2 space-y-1 text-[var(--color-text-secondary)]">
                {failedQa.map((c) => (
                  <li key={c.id}>
                    {QA_LABELS[c.id] ?? c.id}
                    {c.detail ? <span className="text-[var(--color-text-muted)]"> ({c.detail})</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )
        )}

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Points to address</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {tensions.length
              ? "Where the client's answers and the policy pull in different directions. Add a short note on each."
              : "Nothing in the client's answers conflicts with this policy."}
          </p>
          <div className="mt-3 space-y-4">
            {tensions.map((t) => (
              <div key={t.code}>
                <p className="flex items-start gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      t.severity === "high" ? "bg-[var(--color-error)]" : t.severity === "moderate" ? "bg-[var(--color-warning)]" : "bg-[var(--color-text-muted)]"
                    )}
                  />
                  {t.title}
                </p>
                <p className="mt-0.5 pl-4 text-xs text-[var(--color-text-secondary)]">{t.detail}</p>
                <textarea
                  value={notes[t.code] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [t.code]: e.target.value }))}
                  disabled={final}
                  rows={2}
                  placeholder="Why this still fits, or what you discussed with the client"
                  className="mt-2 w-full rounded border border-[var(--color-border-strong)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] disabled:bg-[var(--color-readonly-bg)]"
                />
              </div>
            ))}
          </div>
        </div>

        {!final && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" /> Approve and sign
            </p>
            <label className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
              <span>{ATTEST}</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full rounded border border-[var(--color-border-strong)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)]"
            />
            <button type="button" onClick={approve} disabled={!canApprove} className={cn(primaryBtn, "w-full justify-center")}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve letter
            </button>
            {!notesDone && tensions.length > 0 && (
              <p className="text-xs text-[var(--color-text-muted)]">Add a note to each point above to approve.</p>
            )}
            {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          </div>
        )}
      </aside>
    </div>
  );
}

function EditField({ label, value, onChange, rows = 4 }: { label?: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      {label && <span className="text-xs text-[var(--color-text-muted)]">{label}</span>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1 w-full rounded border border-[var(--color-border-strong)] px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)]"
      />
    </label>
  );
}

function StateCard({ tone, children }: { tone: "neutral" | "error"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mt-8 flex flex-col items-center gap-3 rounded-xl border p-10 text-center",
        tone === "error" ? "border-[var(--color-error)] bg-[var(--color-error-light)]" : "border-[var(--color-border)] bg-[var(--color-surface)]"
      )}
    >
      {children}
    </div>
  );
}

const primaryBtn =
  "inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:pointer-events-none";
const secondaryBtn =
  "inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background)]";
