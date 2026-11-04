"use client";
import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildLetterHtml, type LetterBranding } from "@/lib/policyplan/letter-html";
import type { Letter } from "@/lib/policyplan/letter";

const MAX_LOGO_BYTES = 300 * 1024;

const SAMPLE: Letter = {
  contract_version: "1.0",
  salutation: "Dear Jordan,",
  opening: "Thank you for the time we spent together. This letter explains my recommendation and what to weigh before you decide.",
  sections: [
    {
      id: "recommendation",
      title: "What I recommend",
      paragraphs: ["This is a preview of your letterhead. Your real letters are written from each client's illustration and profile."],
      bullets: [],
      quotes: [],
    },
  ],
  closing: "Please call me with any questions.",
  policy_snapshot: {},
  tensions: [],
};

type Field = { key: keyof LetterBranding; label: string; placeholder?: string; wide?: boolean };
const FIELDS: Field[] = [
  { key: "advisor_name", label: "Your name", placeholder: "Pat Advisor" },
  { key: "advisor_credentials", label: "Credentials", placeholder: "CLU, ChFC" },
  { key: "advisor_title", label: "Title", placeholder: "Wealth Advisor" },
  { key: "license_number", label: "License number" },
  { key: "firm_name", label: "Firm name", placeholder: "Example Financial Group" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "firm_address", label: "Firm address", wide: true },
];

export function BrandingForm({ advisorId, initial }: { advisorId: string; initial: LetterBranding | null }) {
  const [b, setB] = useState<LetterBranding>(initial ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof LetterBranding, v: string | null) => {
    setB((prev) => ({ ...prev, [k]: v }));
    setSaved(false);
  };

  const preview = useMemo(() => buildLetterHtml(SAMPLE, b, { date: new Date().toISOString(), preparedFor: "Jordan Client" }), [b]);

  function onLogo(file: File) {
    setError(null);
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/.test(file.type)) return setError("Use a PNG, JPG, SVG or WebP image.");
    if (file.size > MAX_LOGO_BYTES) return setError("Logo must be under 300 KB.");
    const r = new FileReader();
    r.onload = () => set("logo_base64", String(r.result));
    r.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: e } = await supabase.from("advisor_branding").upsert({
      advisor_id: advisorId,
      advisor_name: b.advisor_name || null,
      advisor_title: b.advisor_title || null,
      advisor_credentials: b.advisor_credentials || null,
      firm_name: b.firm_name || null,
      firm_address: b.firm_address || null,
      phone: b.phone || null,
      email: b.email || null,
      license_number: b.license_number || null,
      logo_base64: b.logo_base64 || null,
      brand_primary_color: b.brand_primary_color || null,
      brand_secondary_color: b.brand_secondary_color || null,
      disclosures: b.disclosures || null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (e) setError(e.message);
    else setSaved(true);
  }

  const input =
    "mt-1 w-full rounded border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)]";

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className={f.wide ? "block sm:col-span-2 text-sm" : "block text-sm"}>
              <span className="text-[var(--color-text-secondary)]">{f.label}</span>
              <input
                value={(b[f.key] as string | null | undefined) ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={input}
              />
            </label>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(["brand_primary_color", "brand_secondary_color"] as const).map((k, i) => (
            <label key={k} className="block text-sm">
              <span className="text-[var(--color-text-secondary)]">{i === 0 ? "Main color" : "Accent color"}</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={b[k] || (i === 0 ? "#1a3a6b" : "#5b6b82")}
                  onChange={(e) => set(k, e.target.value)}
                  className="h-9 w-12 rounded border border-[var(--color-border-strong)]"
                />
                <span className="font-mono text-xs text-[var(--color-text-muted)]">{b[k] || "default"}</span>
              </div>
            </label>
          ))}
        </div>

        <div className="text-sm">
          <span className="text-[var(--color-text-secondary)]">Logo</span>
          <div className="mt-1 flex items-center gap-3">
            {b.logo_base64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logo_base64} alt="Logo" className="h-10 max-w-[160px] object-contain" />
            ) : (
              <span className="text-xs text-[var(--color-text-muted)]">No logo yet</span>
            )}
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-[var(--color-border-strong)] px-3 py-1.5 text-xs">
              <Upload className="h-3.5 w-3.5" /> Upload
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
            </label>
            {b.logo_base64 && (
              <button type="button" onClick={() => set("logo_base64", null)} className="text-[var(--color-text-muted)]" aria-label="Remove logo">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <label className="block text-sm">
          <span className="text-[var(--color-text-secondary)]">Firm disclosures</span>
          <textarea
            value={b.disclosures ?? ""}
            onChange={(e) => set("disclosures", e.target.value)}
            rows={4}
            placeholder="Securities offered through… Insurance products offered through…"
            className={input}
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save letterhead
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-[var(--color-success)]">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
          {error && <span className="text-sm text-[var(--color-error)]">{error}</span>}
        </div>
      </div>

      <iframe title="Letterhead preview" srcDoc={preview} sandbox="" className="h-[720px] w-full rounded-lg border border-[var(--color-border)] bg-white" />
    </div>
  );
}
