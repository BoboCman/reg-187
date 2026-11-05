"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Building2, Check, CheckCircle2, ChevronDown, Download, ExternalLink, FileText, Loader2, Lock, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { GOAL_LABELS, STORY_CATALOG } from "@/lib/companion/story-catalog";
import { usePDFProcessor, getRedactionCounts } from "@/hooks/usePDFProcessor";
import { screenText } from "@/lib/companion/privacy";
import { US_STATES } from "@/lib/companion/contracts";
import { cn } from "@/lib/utils";
import { api, errorMessage, type CaseView } from "./api";
import { leakedNames, sha256Hex } from "./UploadStep";
import { FactsStep } from "./FactsStep";

type StoryGoal = keyof typeof GOAL_LABELS;
type StoryDraft = NonNullable<NonNullable<CaseView["output"]>["story"]>;
type Cover = { title: string; subtitle: string; prepared_for: string; advisor_name: string; firm_name: string };
export type BrandingDefaults = { advisor_name: string; firm_name: string; has_logo: boolean };

const POLL = new Set(["extraction_pending", "analysis_pending", "document_received"]);
const GOALS = Object.keys(GOAL_LABELS) as StoryGoal[];
const STORY_ACK =
  "I reviewed this story against the carrier illustration. It correctly reflects the illustrated design and the client's goals as I understand them, it is not a recommendation on its own, and sharing it is permitted by my firm's and the carrier's procedures.";
const field = "h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)]";
const card = "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6";
const usd = (v: unknown) => (typeof v === "number" ? "$" + Math.round(v).toLocaleString("en-US") : null);

function coverPayload(cover: Cover) {
  return Object.fromEntries(Object.entries(cover).map(([k, v]) => [k, v.trim() || undefined]));
}
function subtitleOk(s: string) {
  const lines = s.split(/\r?\n/);
  return lines.length <= 2 && lines.every((l) => l.length <= 70);
}

/* ── Story picker ─────────────────────────────────────────────────────── */

export function StoryPicker() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AppNav hideNewIntake />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <ArrowLeft className="h-4 w-4" /> Stories
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Choose a story</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Each story explains a proposed policy design in plain terms, built from the carrier&apos;s sales illustration.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {STORY_CATALOG.map((s) => {
            const body = (
              <>
                <div className="flex items-center justify-between">
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", s.available ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "bg-[var(--color-readonly-bg)] text-[var(--color-text-muted)]")}>
                    <Building2 className="h-5 w-5" />
                  </span>
                  {!s.available && <span className="rounded-full bg-[var(--color-readonly-bg)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">Coming soon</span>}
                </div>
                <h2 className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">{s.name}</h2>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{s.designs}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{s.tagline}</p>
                {s.available && <span className="mt-4 inline-flex h-9 items-center rounded-lg bg-[var(--color-accent)] px-4 text-sm font-semibold text-white">Start this story</span>}
              </>
            );
            return s.available ? (
              <Link key={s.key} href={`/companion/new?story=${s.key}`} className={cn(card, "block transition-shadow hover:shadow-md")}>
                {body}
              </Link>
            ) : (
              <div key={s.key} className={cn(card, "opacity-70")} aria-disabled>
                {body}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

/* ── Workspace ────────────────────────────────────────────────────────── */

const STOP_TEXT: Record<string, string> = {
  core_facts_unresolved: "We read the illustration, but the carrier, product or death benefit could not be matched to the pages. Check the facts below, then create the report.",
  workflow_unavailable: "The story service did not respond. Create the report again below.",
  story_blocked: "This illustration can't be told as this story yet.",
};

export function StoryWorkspace({ initial, storyKey, branding }: { initial: CaseView | null; storyKey: "apartment"; branding?: BrandingDefaults | null }) {
  const [view, setView] = useState<CaseView | null>(initial);
  const [caseId, setCaseId] = useState<string | null>(initial?.id ?? null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const story = STORY_CATALOG.find((s) => s.key === storyKey)!;

  const refresh = useCallback(
    async (id = caseId): Promise<CaseView | null> => {
      if (!id) return null;
      try {
        const v = await api<CaseView>(`/api/companion/cases/${id}`);
        setView(v);
        setLoadErr(null);
        return v;
      } catch (e) {
        setLoadErr(errorMessage(e));
        return null;
      }
    },
    [caseId],
  );

  const phase = view?.phase ?? "created";
  const pending = !!view && (POLL.has(phase) || view.output?.status === "pending");
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => refresh(), 4000);
    return () => clearInterval(t);
  }, [pending, refresh]);

  const draft = view?.output?.story ?? null;
  const auto = view?.story?.auto ?? null;
  // The intake (PDF + form) until a readable illustration is in; then progress, then the report.
  const intake = !view || replacing || phase.startsWith("blocked_") || (!view.evidence && !POLL.has(phase) && phase !== "failed_retryable");
  const waitingForAuto = !!view?.evidence && auto?.status === "waiting" && phase === "extracted_needs_review";
  const working = !intake && !draft && (pending || waitingForAuto);
  const stopped = !intake && !draft && !working;
  const meta = (view?.case_meta ?? {}) as { case_label?: string; sales_jurisdiction?: string };
  const step = intake ? 2 : draft ? 3 : working ? 3 : 2;
  const STEPS = ["Story", "Policy and goals", "Report"];

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-24">
      <AppNav hideNewIntake />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              <ArrowLeft className="h-4 w-4" /> Stories
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{story.name}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">{[meta.case_label, meta.sales_jurisdiction, view ? `Revision ${view.revision}` : null].filter(Boolean).join(" · ") || story.designs}</p>
          </div>
        </div>

        <ol className="grid grid-cols-3 gap-1 sm:gap-2" aria-label="Steps">
          {STEPS.map((label, idx) => {
            const i = idx + 1;
            const ok = i < step || (i === 3 && view?.output?.status === "final");
            return (
              <li key={label} className={cn("flex items-center gap-2 rounded-lg border px-2 py-2 sm:px-3", i === step ? "border-[var(--color-accent)] bg-[var(--color-surface)] shadow-sm" : "border-transparent")}>
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold", ok ? "bg-emerald-600 text-white" : i === step ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-readonly-bg)] text-[var(--color-text-muted)]")}>
                  {ok ? <Check className="h-3.5 w-3.5" /> : i}
                </span>
                <span className={cn("text-xs sm:text-sm", i === step ? "font-semibold" : "text-[var(--color-text-secondary)]")}>{label}</span>
              </li>
            );
          })}
        </ol>

        {loadErr && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadErr}</p>}
        {view && phase.startsWith("blocked_") && !replacing && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {phase === "blocked_privacy" ? "Nothing was sent: a client name was still present after redaction. Check the names and submit again." : "This document is not supported (in-force, scanned or unreadable). Attach the carrier's proposed sales illustration."}
          </p>
        )}

        {intake ? (
          <StoryIntake
            storyKey={storyKey}
            caseId={caseId}
            initial={view?.story?.last_inputs ?? null}
            defaultJurisdiction={meta.sales_jurisdiction}
            branding={branding ?? (view?.story ? { advisor_name: view.story.cover_defaults.advisor_name, firm_name: view.story.cover_defaults.firm_name, has_logo: view.story.cover_defaults.has_logo } : null)}
            onCreated={(id) => {
              setCaseId(id);
              window.history.replaceState(null, "", `/companion/${id}`);
            }}
            onSubmitted={(id) => {
              setReplacing(false);
              if (id) refresh(id);
            }}
          />
        ) : working ? (
          view && <Progress view={view} />
        ) : (
          view && (
            <>
              {stopped && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {view.output?.status === "error" || phase === "failed_retryable"
                    ? view.evidence
                      ? "The story could not be written this time. Create the report again below."
                      : "Reading the illustration did not finish. Try again below."
                    : auto?.status === "stopped"
                      ? (auto.message ? `${STOP_TEXT.story_blocked} ${auto.message}` : STOP_TEXT[auto.error ?? ""] ?? STOP_TEXT.workflow_unavailable)
                      : "Check what we read, then create the report."}
                </p>
              )}
              <WeRead view={view} startOpen={stopped && auto?.error === "core_facts_unresolved"} onChange={() => refresh()} onReplace={() => setReplacing(true)} />
              {stopped && view.evidence && <StoryForm key={`${view.id}:${view.revision}`} view={view} onGenerated={() => refresh()} />}
              {draft && <ReportReview view={view} draft={draft} onChange={() => refresh()} />}
              {draft && (
                <details className={cn(card, "group")}>
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                    Change goals, riders or cover
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-4">
                    <StoryForm key={`${view.id}:${view.revision}`} view={view} embedded onGenerated={() => refresh()} />
                  </div>
                </details>
              )}
            </>
          )
        )}
      </main>
    </div>
  );
}

/* ── Intake: attach the policy, answer the questions, submit once ─────── */

function StoryIntake({
  storyKey,
  caseId,
  initial,
  defaultJurisdiction,
  branding,
  onCreated,
  onSubmitted,
}: {
  storyKey: "apartment";
  caseId: string | null;
  initial: NonNullable<CaseView["story"]>["last_inputs"] | null;
  defaultJurisdiction?: string | null;
  branding: BrandingDefaults | null;
  onCreated: (id: string) => void;
  onSubmitted: (id: string | null) => void;
}) {
  const { processFile, progress, isProcessing } = usePDFProcessor();
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [names, setNames] = useState(["", ""]);
  const [jurisdiction, setJurisdiction] = useState(defaultJurisdiction ?? "");
  const [label, setLabel] = useState("");
  const [goals, setGoals] = useState<StoryGoal[]>(initial?.goals ?? []);
  const [beneficiary, setBeneficiary] = useState(initial?.beneficiary ?? "");
  const [cover, setCover] = useState<Cover>({
    title: initial?.cover.title ?? "Your Policy Story",
    subtitle: initial?.cover.subtitle ?? "",
    prepared_for: initial?.cover.prepared_for ?? "",
    advisor_name: initial?.cover.advisor_name ?? branding?.advisor_name ?? "",
    firm_name: initial?.cover.firm_name ?? branding?.firm_name ?? "",
  });
  const [stage, setStage] = useState<null | "redacting" | "sending">(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const cleanNames = names.map((n) => n.trim()).filter(Boolean);
  const missing = [!file && "attach the illustration", !cleanNames.length && "enter the name on the illustration", !caseId && !jurisdiction && "choose the state of sale"].filter(Boolean) as string[];
  const ready = !missing.length && subtitleOk(cover.subtitle) && !stage;

  async function submit() {
    if (!file) return;
    setError(null);
    setStage("redacting");
    let id = caseId;
    try {
      if (file.type && file.type !== "application/pdf") throw new Error("Attach the carrier illustration as a PDF.");
      if (file.size > 10 * 1024 * 1024) throw new Error("The PDF is larger than 10 MB.");
      const fingerprint = await sha256Hex(await file.arrayBuffer());
      const result = await processFile(file, { enableRedaction: true, namesToRedact: cleanNames });
      const screened = screenText(result.cleanText, cleanNames);
      const leaks = leakedNames(screened.text, cleanNames);
      const warnings = result.warnings.map((w) => String(w.type ?? "warning")).filter((t) => t !== "name_leak_detected");
      if (leaks.length) warnings.push(`name_leak:${leaks.length}`);
      const removed: Record<string, number> = { ...getRedactionCounts(result.redactionLog) };
      for (const r of screened.removed) removed[r.kind] = (removed[r.kind] ?? 0) + r.count;

      setStage("sending");
      if (!id) {
        const c = await api<{ id: string }>("/api/companion/cases", "POST", {
          sales_jurisdiction: jurisdiction,
          ...(label.trim() ? { case_label: label.trim() } : {}),
          story_key: storyKey,
        });
        id = c.id;
        onCreated(id);
      }
      await api(`/api/companion/cases/${id}/illustration`, "POST", {
        text: screened.text,
        page_count: Number(result.metadata?.pageCount ?? 0),
        document_fingerprint: fingerprint,
        file_size: file.size,
        kind_confirmed: "proposed_sales",
        privacy: { removed, worker_warnings: warnings.slice(0, 20), names_screened: Math.min(cleanNames.length, 10) },
        extractor: "pdfjs-worker",
        story_inputs: { story_key: storyKey, goals, riders: [], beneficiary: beneficiary.trim() || undefined, cover: coverPayload(cover) },
      });
      onSubmitted(id);
    } catch (e) {
      setError(errorMessage(e));
      onSubmitted(id);
    } finally {
      setStage(null);
    }
  }

  return (
    <>
      <section className={cn(card, "space-y-4")}>
        <div>
          <h2 className="text-base font-semibold">1 · Attach the policy</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">The carrier&apos;s proposed sales illustration, as the original PDF.</p>
        </div>
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
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-7 text-center transition-colors",
            drag ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]" : file ? "border-emerald-300 bg-emerald-50/40" : "border-[var(--color-border-strong)] hover:bg-[var(--color-readonly-bg)]",
          )}
        >
          {file ? <FileText className="h-7 w-7 text-emerald-700" /> : <UploadCloud className="h-7 w-7 text-[var(--color-text-muted)]" />}
          <p className="mt-2 text-sm font-medium">{file ? file.name : "Drop the PDF here or choose a file"}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{file ? `${(file.size / 1024).toFixed(0)} KB · click to change` : "PDF, up to 10 MB"}</p>
          <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <label key={i} className="block text-sm">
              <span className="text-[var(--color-text-secondary)]">{i === 0 ? "Name on the illustration" : "Second insured (if any)"}</span>
              <input className={cn(field, "mt-1")} autoComplete="off" value={names[i]} onChange={(e) => setNames((n) => n.map((x, j) => (j === i ? e.target.value : x)))} placeholder={i === 0 ? "As printed on the PDF" : "Optional"} />
            </label>
          ))}
        </div>
        <p className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Names are used only in this browser to remove the client&apos;s identity before anything is sent. The PDF never leaves this device.
        </p>
        {!caseId && (
          <div className="grid gap-3 sm:grid-cols-2">
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
              <span className="text-[var(--color-text-secondary)]">Your label (optional)</span>
              <input className={cn(field, "mt-1")} maxLength={60} placeholder="e.g. Case 14, not the client's name" value={label} onChange={(e) => setLabel(e.target.value)} />
            </label>
          </div>
        )}
      </section>

      <section className={cn(card, "space-y-6")}>
        <h2 className="text-base font-semibold">2 · Goals and branding</h2>
        <StoryFields goals={goals} setGoals={setGoals} beneficiary={beneficiary} setBeneficiary={setBeneficiary} cover={cover} setCover={setCover} hasLogo={!!branding?.has_logo} riders={null} />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <ShieldCheck className="hidden h-4 w-4 shrink-0 sm:block" />
            {stage === "redacting"
              ? `Removing names · page ${progress.currentPage || 1}${progress.totalPages ? ` of ${progress.totalPages}` : ""}`
              : stage === "sending"
                ? "Sending the screened text…"
                : missing.length
                  ? `To submit, ${missing.join(", ")}.`
                  : "Names are removed in this browser, then the report is written. About two minutes."}
          </p>
          <button type="button" onClick={submit} disabled={!ready} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white disabled:opacity-50">
            {stage || isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Create report
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Progress after submit ────────────────────────────────────────────── */

function Progress({ view }: { view: CaseView }) {
  const reading = view.phase === "document_received" || view.phase === "extraction_pending";
  const rows: [string, "done" | "now" | "next"][] = [
    ["Names removed in your browser", "done"],
    ["Reading the illustration", reading ? "now" : "done"],
    ["Writing the story", reading ? "next" : "now"],
    ["Report ready for your review", "next"],
  ];
  return (
    <section className={cn(card, "space-y-4")}>
      <div>
        <h2 className="text-base font-semibold">Creating your report</h2>
        <p className="text-sm text-[var(--color-text-muted)]">This takes about two minutes. You can leave this page; the report will be here when you come back.</p>
      </div>
      <ol className="space-y-2.5">
        {rows.map(([label, s]) => (
          <li key={label} className="flex items-center gap-3 text-sm">
            {s === "done" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : s === "now" ? <Loader2 className="h-5 w-5 animate-spin text-[var(--color-accent)]" /> : <span className="h-5 w-5 rounded-full border-2 border-[var(--color-border)]" />}
            <span className={cn(s === "next" && "text-[var(--color-text-muted)]", s === "now" && "font-medium")}>{label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── "We read" strip with the facts behind a toggle ──────────────────── */

function WeRead({ view, startOpen, onChange, onReplace }: { view: CaseView; startOpen?: boolean; onChange: () => void; onReplace: () => void }) {
  const [open, setOpen] = useState(!!startOpen);
  const ev = view.evidence;
  if (!ev) return <FactsStep view={view} onChange={onChange} />;
  const f = new Map(ev.facts.map((x) => [x.fact_id, x]));
  const v = (id: string) => (f.get(id)?.status === "verified" ? f.get(id)!.value : null);
  const chips = [v("f.insurer"), v("f.product_name"), ev.product_class !== "UNKNOWN" ? ev.product_class : null, usd(v("f.initial_death_benefit")) ? `${usd(v("f.initial_death_benefit"))} death benefit` : null, usd(v("f.planned_premium_outlay")) ? `${usd(v("f.planned_premium_outlay"))} a year` : null].filter(Boolean) as string[];
  const needs = ev.facts.filter((x) => x.material && x.status !== "verified").length;
  return (
    <section className={card}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">We read</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span key={c} className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm">
                {c}
              </span>
            ))}
          </div>
          {needs > 0 && <p className="mt-2 text-sm text-amber-800">{needs} figure{needs === 1 ? "" : "s"} could not be matched to the pages. Those print as “See illustration”.</p>}
        </div>
        <div className="flex shrink-0 gap-3 text-sm">
          <button type="button" onClick={() => setOpen((o) => !o)} className="font-medium text-[var(--color-accent)] hover:underline">
            {open ? "Hide facts" : "Something missing or wrong?"}
          </button>
          <button type="button" onClick={onReplace} className="text-[var(--color-text-muted)] hover:underline">
            Replace PDF
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
          <FactsStep view={view} onChange={onChange} />
        </div>
      )}
    </section>
  );
}

/* ── Shared form fields: goals, riders, beneficiary, cover ────────────── */

function StoryFields({
  goals,
  setGoals,
  beneficiary,
  setBeneficiary,
  cover,
  setCover,
  hasLogo,
  riders,
}: {
  goals: StoryGoal[];
  setGoals: React.Dispatch<React.SetStateAction<StoryGoal[]>>;
  beneficiary: string;
  setBeneficiary: (v: string) => void;
  cover: Cover;
  setCover: React.Dispatch<React.SetStateAction<Cover>>;
  hasLogo: boolean;
  /** null before the illustration is read: riders are then all shown, and can be hidden on the review screen. */
  riders: { list: string[]; shown: Record<string, boolean>; setShown: React.Dispatch<React.SetStateAction<Record<string, boolean>>> } | null;
}) {
  const set = (k: keyof Cover) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCover((c) => ({ ...c, [k]: e.target.value }));
  const subtitleLines = cover.subtitle.split(/\r?\n/);
  const okSub = subtitleOk(cover.subtitle);
  return (
    <>
      <div>
        <p className="text-sm font-semibold">What is this policy for?</p>
        <p className="text-sm text-[var(--color-text-muted)]">Optional, up to 3. The story connects to the first one.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {GOALS.map((g) => {
            const on = goals.includes(g);
            return (
              <button
                key={g}
                type="button"
                aria-pressed={on}
                disabled={!on && goals.length >= 3}
                onClick={() => setGoals((list) => (on ? list.filter((x) => x !== g) : [...list, g]))}
                className={cn("h-9 rounded-full px-4 text-sm ring-1 ring-inset disabled:opacity-40", on ? "bg-[var(--color-accent-light)] font-medium text-[var(--color-accent)] ring-[var(--color-accent)]" : "ring-[var(--color-border)] hover:bg-[var(--color-readonly-bg)]")}
              >
                {GOAL_LABELS[g]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <fieldset className="rounded-lg border border-[var(--color-border)] p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Riders on report</legend>
          {!riders ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Every rider in the illustration prints with one plain line on what it does. You can hide any of them on the review screen.</p>
          ) : riders.list.length ? (
            <>
              <p className="mb-2 text-xs text-[var(--color-text-muted)]">
                {riders.list.filter((r) => riders.shown[r] !== false).length} of {riders.list.length} shown, each with one plain line on what it does
              </p>
              <div className="space-y-1.5">
                {riders.list.map((r) => (
                  <label key={r} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" checked={riders.shown[r] !== false} onChange={(e) => riders.setShown((s) => ({ ...s, [r]: e.target.checked }))} />
                    {r}
                  </label>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">No riders were found in the illustration.</p>
          )}
        </fieldset>
        <div className="rounded-lg border border-[var(--color-border)] p-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]" htmlFor="beneficiary">
            Beneficiary (optional)
          </label>
          <input id="beneficiary" className={cn(field, "mt-2")} maxLength={120} placeholder="e.g. Spouse, or a trust name" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} />
          <p className="mt-2 flex items-start gap-1.5 text-xs text-[var(--color-text-muted)]">
            <Lock className="mt-0.5 h-3 w-3 shrink-0" /> Printed on the report. Never sent to the AI.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-border)]">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-readonly-bg)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide">Report cover</p>
          <p className="text-xs text-[var(--color-text-muted)]">Pre-filled, edit anything. Nothing here is sent to the AI.</p>
        </div>
        <div className="grid gap-5 p-4 md:grid-cols-[1fr_240px]">
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="text-[var(--color-text-secondary)]">Report title</span>
              <input className={cn(field, "mt-1")} maxLength={60} value={cover.title} onChange={set("title")} />
            </label>
            <label className="block text-sm">
              <span className="flex justify-between text-[var(--color-text-secondary)]">
                Subtitle <span className={cn("text-xs", okSub ? "text-[var(--color-text-muted)]" : "text-red-600")}>2 lines max</span>
              </span>
              <textarea className="mt-1 h-16 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm" placeholder={"Leave blank to use the product type, e.g.\nIndexed Universal Life"} value={cover.subtitle} onChange={set("subtitle")} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[var(--color-text-secondary)]">Prepared for</span>
                <input className={cn(field, "mt-1")} maxLength={80} value={cover.prepared_for} onChange={set("prepared_for")} />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--color-text-secondary)]">Advisor (optional)</span>
                <input className={cn(field, "mt-1")} maxLength={80} value={cover.advisor_name} onChange={set("advisor_name")} />
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-[var(--color-text-secondary)]">Firm name</span>
              <input className={cn(field, "mt-1")} maxLength={80} value={cover.firm_name} onChange={set("firm_name")} />
            </label>
            <p className="text-xs text-[var(--color-text-muted)]">
              {hasLogo ? "Your firm logo from Settings prints on the cover." : "Add a firm logo and disclosures in "}
              {!hasLogo && (
                <Link href="/settings/branding" className="underline">
                  Settings
                </Link>
              )}
            </p>
          </div>
          <div aria-label="Cover preview">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Cover preview</p>
            <div className="aspect-[8.5/11] overflow-hidden rounded-md border border-[var(--color-border)] bg-white p-3 text-[#0F1E33] shadow-sm">
              <div className="h-1 bg-[#2B5C9E]" />
              <p className="mt-3 truncate text-[9px] font-bold">{cover.firm_name || "Your firm"}</p>
              <p className="mt-6 text-[13px] font-extrabold uppercase leading-tight text-[#1F4E8C]">{cover.title || "Your Policy Story"}</p>
              {(cover.subtitle ? subtitleLines : ["Product type from the illustration"]).slice(0, 2).map((l, i) => (
                <p key={i} className="truncate text-[8px] text-[#3B4A5E]">
                  {l}
                </p>
              ))}
              <div className="mt-3 border-t border-[#D8DFEA] pt-2">
                <p className="text-[6px] font-bold uppercase tracking-widest text-[#2F6DB5]">Prepared for</p>
                <p className="truncate text-[9px] font-bold">{cover.prepared_for || "—"}</p>
              </div>
              <p className="mt-2 text-[6px] text-[#6B7A8F]">Product · Carrier · Illustration date</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Create again (after the illustration is read) ────────────────────── */

function StoryForm({ view, embedded, onGenerated }: { view: CaseView; embedded?: boolean; onGenerated: () => void }) {
  const st = view.story;
  const last = st?.last_inputs ?? null;
  const defaults = st?.cover_defaults;
  const riderList = st?.riders ?? [];
  const [goals, setGoals] = useState<StoryGoal[]>(last?.goals ?? []);
  const [shown, setShown] = useState<Record<string, boolean>>(() => Object.fromEntries(riderList.map((r) => [r, last && last.riders.length ? last.riders.find((x) => x.name === r)?.show ?? true : true])));
  const [beneficiary, setBeneficiary] = useState(last?.beneficiary ?? "");
  const [cover, setCover] = useState<Cover>({
    title: last?.cover.title ?? defaults?.title ?? "",
    subtitle: last?.cover.subtitle ?? "",
    prepared_for: last?.cover.prepared_for ?? "",
    advisor_name: last?.cover.advisor_name ?? defaults?.advisor_name ?? "",
    firm_name: last?.cover.firm_name ?? defaults?.firm_name ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const writing = view.phase === "analysis_pending" || view.output?.status === "pending";

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/companion/cases/${view.id}/story`, "POST", {
        revision: view.revision,
        inputs: {
          story_key: "apartment",
          goals,
          riders: riderList.map((name) => ({ name, show: shown[name] !== false })),
          beneficiary: beneficiary.trim() || undefined,
          cover: coverPayload(cover),
        },
      });
      onGenerated();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={cn(!embedded && card, "space-y-6")}>
      {!embedded && <h2 className="text-base font-semibold">Goals and branding</h2>}
      <StoryFields goals={goals} setGoals={setGoals} beneficiary={beneficiary} setBeneficiary={setBeneficiary} cover={cover} setCover={setCover} hasLogo={!!defaults?.has_logo} riders={{ list: riderList, shown, setShown }} />
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <div className="flex items-center justify-end gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">{embedded ? "Writes a new draft. You review and approve it again." : "About a minute."}</p>
        <button type="button" onClick={generate} disabled={busy || writing || !subtitleOk(cover.subtitle)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white disabled:opacity-50">
          {busy || writing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {embedded ? "Create report again" : "Create report"}
        </button>
      </div>
    </section>
  );
}

/* ── Report preview, edits and approval ───────────────────────────────── */

type FieldKey = string;
function fieldsOf(d: StoryDraft): { key: FieldKey; label: string; value: string }[] {
  const t = d.text;
  const out = [
    { key: "where_you_start", label: "The Story · Where you start", value: t.where_you_start },
    ...(["growth", "access", "legacy", "living_benefits"] as const).filter((k) => t.benefits[k] != null).map((k) => ({ key: `benefit.${k}`, label: `The Story · ${{ growth: "Growth potential", access: "Access to cash value", legacy: "A legacy", living_benefits: "Living benefits" }[k]}`, value: t.benefits[k]! })),
    { key: "headline", label: "The Design · Headline", value: t.headline },
    { key: "takeaway", label: "The Design · Takeaway", value: t.takeaway },
    ...Object.entries(t.riders).map(([name, note]) => ({ key: `rider.${name}`, label: `Rider · ${name}`, value: note })),
  ];
  return out;
}

function ReportReview({ view, draft, onChange }: { view: CaseView; draft: StoryDraft; onChange: () => void }) {
  const out = view.output!;
  const final = out.status === "final";
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [ack, setAck] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fields = useMemo(() => fieldsOf(draft), [draft]);
  const dirty = fields.some((f) => edits[f.key] != null && edits[f.key] !== f.value);
  const version = `${out.id}:${JSON.stringify(draft.text).length}:${out.status}:${Object.keys(draft.issues).length}`;
  const gate = view.release.gate;

  useEffect(() => setEdits({}), [out.id, JSON.stringify(draft.text)]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setBusy("save");
    setErr(null);
    const body: Record<string, unknown> = {};
    const benefits: Record<string, string> = {};
    const riders: Record<string, string> = {};
    for (const f of fields) {
      const v = edits[f.key];
      if (v == null || v === f.value) continue;
      if (f.key.startsWith("benefit.")) benefits[f.key.slice(8)] = v;
      else if (f.key.startsWith("rider.")) riders[f.key.slice(6)] = v;
      else body[f.key] = v;
    }
    if (Object.keys(benefits).length) body.benefits = benefits;
    if (Object.keys(riders).length) body.riders = riders;
    try {
      await api(`/api/companion/outputs/${out.id}/edits`, "POST", body);
      onChange();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }
  async function approve() {
    setBusy("approve");
    setErr(null);
    try {
      await api(`/api/companion/outputs/${out.id}/approve`, "POST", { acknowledged: true, name: name.trim(), revision: view.revision });
      onChange();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-slate-100">
        <iframe key={version} title="Story preview" src={`/api/companion/outputs/${out.id}/html?kind=preview&v=${encodeURIComponent(version)}`} className="h-[82vh] w-full bg-white" sandbox="allow-same-origin" />
      </div>
      <div className="space-y-4">
        {!final ? (
          <>
            <div className={cn(card, "space-y-3")}>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Review the wording</h2>
                {Object.keys(draft.issues).length === 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> All checks pass
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" /> {Object.keys(draft.issues).length} to fix
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">Numbers on the report come from the illustration, not from these captions. Edits are checked again when you save.</p>
              {fields.map((f) => {
                const issues = draft.issues[f.key] ?? [];
                return (
                  <label key={f.key} className={cn("block rounded-lg border p-2.5", issues.length ? "border-amber-300 bg-amber-50/50" : "border-[var(--color-border)]")}>
                    <span className="flex justify-between text-xs font-semibold text-[var(--color-text-secondary)]">
                      {f.label}
                      {draft.authors[f.key] === "producer" && <span className="font-normal text-[var(--color-text-muted)]">Edited by you</span>}
                    </span>
                    <textarea className="mt-1 h-16 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm leading-relaxed" value={edits[f.key] ?? f.value} onChange={(e) => setEdits((x) => ({ ...x, [f.key]: e.target.value }))} />
                    {issues.map((i, k) => (
                      <span key={k} className="mt-1 flex gap-1.5 text-xs text-amber-900">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {i}
                      </span>
                    ))}
                  </label>
                );
              })}
              {!draft.validation.numbers_verified && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Some figures could not be matched to the illustration pages. Correct them under “Something missing or wrong?” before approving.</p>}
              <button type="button" disabled={!dirty || !!busy} onClick={save} className="h-9 w-full rounded-lg border border-[var(--color-border)] text-sm font-medium disabled:opacity-50">
                {busy === "save" ? "Checking…" : "Save and re-check"}
              </button>
            </div>
            <div className={cn(card, "space-y-3")}>
              <h2 className="text-base font-semibold">Approve before sharing</h2>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                <span className="text-[var(--color-text-secondary)]">{STORY_ACK}</span>
              </label>
              <input className={field} placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Your full name" />
              <button type="button" disabled={!ack || name.trim().length < 2 || dirty || !draft.validation.client_release_eligible || !!busy} onClick={approve} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] text-sm font-semibold text-white disabled:opacity-50">
                {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve this story
              </button>
              <a href={`/api/companion/outputs/${out.id}/pdf?kind=preview`} className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:underline">
                <Download className="h-4 w-4" /> Draft PDF (watermarked)
              </a>
            </div>
          </>
        ) : (
          <div className={cn(card, "space-y-3")}>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Approved{out.artifact_id ? ` · ${out.artifact_id}` : ""}
            </p>
            {gate?.client_export_allowed ? (
              <div className="flex flex-col gap-2">
                <a href={`/api/companion/outputs/${out.id}/pdf?kind=client`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] text-sm font-semibold text-white">
                  <Download className="h-4 w-4" /> Download client PDF
                </a>
                <a href={`/api/companion/outputs/${out.id}/html?kind=client`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:underline">
                  <ExternalLink className="h-4 w-4" /> Open client copy
                </a>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Client export is not open yet</p>
                <ul className="mt-1 list-disc pl-4">
                  {(gate?.reasons ?? ["Your firm's approval of this document for client use is not recorded."]).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-[var(--color-text-muted)]">Changing the goals, riders or cover and creating the report again starts a new revision. This approved copy stays on record.</p>
          </div>
        )}
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      </div>
    </section>
  );
}
