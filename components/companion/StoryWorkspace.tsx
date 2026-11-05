"use client";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Building2, Check, CheckCircle2, Download, ExternalLink, Loader2, Lock, Sparkles } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { GOAL_LABELS, STORY_CATALOG } from "@/lib/companion/story-catalog";

type StoryGoal = keyof typeof GOAL_LABELS;
import { cn } from "@/lib/utils";
import { api, errorMessage, type CaseView } from "./api";
import { UploadStep } from "./UploadStep";
import { FactsStep } from "./FactsStep";

type StoryDraft = NonNullable<NonNullable<CaseView["output"]>["story"]>;
type Cover = { title: string; subtitle: string; prepared_for: string; advisor_name: string; firm_name: string };

const POLL = new Set(["extraction_pending", "analysis_pending", "document_received"]);
const GOALS = Object.keys(GOAL_LABELS) as StoryGoal[];
const STORY_ACK =
  "I reviewed this story against the carrier illustration. It correctly reflects the illustrated design and the client's goals as I understand them, it is not a recommendation on its own, and sharing it is permitted by my firm's and the carrier's procedures.";
const field = "h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)]";
const card = "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6";
const usd = (v: unknown) => (typeof v === "number" ? "$" + Math.round(v).toLocaleString("en-US") : null);

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

export function StoryWorkspace({ initial, storyKey }: { initial: CaseView | null; storyKey: "apartment" }) {
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

  const pending = !!view && (POLL.has(view.phase) || view.output?.status === "pending");
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => refresh(), 4000);
    return () => clearInterval(t);
  }, [pending, refresh]);

  const draft = view?.output?.story ?? null;
  const ready = !!view?.evidence && !POLL.has(view.phase) && !view.phase.startsWith("blocked_");
  const showUpload = !view || replacing || view.phase.startsWith("blocked_") || (!view.evidence && !POLL.has(view.phase) && view.phase !== "failed_retryable");
  const meta = (view?.case_meta ?? {}) as { case_label?: string; sales_jurisdiction?: string };
  const step = !view?.evidence ? 2 : !draft ? 3 : 4;
  const STEPS = ["Story", "Illustration", "Goals and branding", "Report"];

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
          {pending && (
            <span className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> {view?.phase === "analysis_pending" ? "Writing the story…" : "Reading the illustration…"}
            </span>
          )}
        </div>

        <ol className="grid grid-cols-4 gap-1 sm:gap-2" aria-label="Steps">
          {STEPS.map((label, idx) => {
            const i = idx + 1;
            const ok = i < step || (i === 4 && draft?.validation && view?.output?.status === "final");
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
        {view?.phase.startsWith("blocked_") && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {view.phase === "blocked_privacy" ? "Nothing was sent: personal details were still present after redaction. Check the names and upload again." : "This document is not supported (in-force, scanned or unreadable). Upload the carrier's proposed sales illustration."}
          </p>
        )}

        {showUpload ? (
          <UploadStep
            storyKey={storyKey}
            caseId={caseId}
            defaultJurisdiction={meta.sales_jurisdiction}
            onCreated={(id) => {
              setCaseId(id);
              window.history.replaceState(null, "", `/companion/${id}`);
            }}
            onSubmitted={() => {
              setReplacing(false);
              const id = window.location.pathname.split("/").pop();
              if (id && id !== "new") refresh(id);
            }}
          />
        ) : (
          view && <WeRead view={view} onChange={() => refresh()} onReplace={() => setReplacing(true)} />
        )}

        {view && !showUpload && <StoryForm key={`${view.id}:${view.revision}`} view={view} ready={ready} onGenerated={() => refresh()} />}
        {view && draft && <ReportReview view={view} draft={draft} onChange={() => refresh()} />}
      </main>
    </div>
  );
}

/* ── "We read" strip with the facts behind a toggle ──────────────────── */

function WeRead({ view, onChange, onReplace }: { view: CaseView; onChange: () => void; onReplace: () => void }) {
  const [open, setOpen] = useState(false);
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

/* ── The one-screen form ──────────────────────────────────────────────── */

function StoryForm({ view, ready, onGenerated }: { view: CaseView; ready: boolean; onGenerated: () => void }) {
  const st = view.story;
  const last = st?.last_inputs ?? null;
  const defaults = st?.cover_defaults;
  const [goals, setGoals] = useState<StoryGoal[]>(last?.goals ?? []);
  const riderList = st?.riders ?? [];
  const [shown, setShown] = useState<Record<string, boolean>>(() => Object.fromEntries(riderList.map((r) => [r, last ? last.riders.find((x) => x.name === r)?.show ?? true : true])));
  const [beneficiary, setBeneficiary] = useState(last?.beneficiary ?? "");
  const [cover, setCover] = useState<Cover>({
    title: last?.cover.title ?? defaults?.title ?? "",
    subtitle: last?.cover.subtitle ?? defaults?.subtitle ?? "",
    prepared_for: last?.cover.prepared_for ?? "",
    advisor_name: last?.cover.advisor_name ?? defaults?.advisor_name ?? "",
    firm_name: last?.cover.firm_name ?? defaults?.firm_name ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const writing = view.phase === "analysis_pending" || view.output?.status === "pending";
  const hasDraft = !!view.output?.story;

  // Cover defaults can arrive after the form mounts (the illustration is still being read).
  // Fill any field the advisor has not typed in yet.
  const seeded = useRef<Partial<Record<keyof Cover, string>>>({ title: cover.title, subtitle: cover.subtitle, advisor_name: cover.advisor_name, firm_name: cover.firm_name });
  useEffect(() => {
    if (last || !defaults) return;
    setCover((c) => {
      const next = { ...c };
      for (const k of ["title", "subtitle", "advisor_name", "firm_name"] as const) {
        const d = defaults[k];
        if (d && c[k] === (seeded.current[k] ?? "") && c[k] !== d) { next[k] = d; seeded.current[k] = d; }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults?.title, defaults?.subtitle, defaults?.advisor_name, defaults?.firm_name]);

  useEffect(() => {
    setShown((s) => ({ ...Object.fromEntries(riderList.map((r) => [r, true])), ...s }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riderList.join("|")]);

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
          cover: Object.fromEntries(Object.entries(cover).map(([k, v]) => [k, v.trim() || undefined])),
        },
      });
      onGenerated();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof Cover) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCover((c) => ({ ...c, [k]: e.target.value }));
  const subtitleLines = cover.subtitle.split(/\r?\n/);
  const subtitleOk = subtitleLines.length <= 2 && subtitleLines.every((l) => l.length <= 70);

  return (
    <>
      <section className={cn(card, "space-y-6")}>
        <div>
          <h2 className="text-base font-semibold">What is this policy for?</h2>
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
            {riderList.length ? (
              <>
                <p className="mb-2 text-xs text-[var(--color-text-muted)]">
                  {riderList.filter((r) => shown[r] !== false).length} of {riderList.length} shown, each with one plain line on what it does
                </p>
                <div className="space-y-1.5">
                  {riderList.map((r) => (
                    <label key={r} className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" checked={shown[r] !== false} onChange={(e) => setShown((s) => ({ ...s, [r]: e.target.checked }))} />
                      {r}
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">{ready ? "No riders were found in the illustration." : "Riders appear here once the illustration is read."}</p>
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
                  Subtitle <span className={cn("text-xs", subtitleOk ? "text-[var(--color-text-muted)]" : "text-red-600")}>2 lines max</span>
                </span>
                <textarea className="mt-1 h-16 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm" value={cover.subtitle} onChange={set("subtitle")} />
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
                {defaults?.has_logo ? "Your firm logo from Settings prints on the cover." : "Add a firm logo and disclosures in "}
                {!defaults?.has_logo && (
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
                {subtitleLines.slice(0, 2).map((l, i) => (
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
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="text-sm text-[var(--color-text-muted)]">{!ready ? "Reading the illustration. You can fill in the form meanwhile." : writing ? "Writing the story. You can leave this page." : "Takes about a minute · you can leave this page"}</p>
          <button type="button" onClick={generate} disabled={!ready || busy || writing || !subtitleOk} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-white disabled:opacity-50">
            {busy || writing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {hasDraft ? "Create report again" : "Create report"}
          </button>
        </div>
      </div>
    </>
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
