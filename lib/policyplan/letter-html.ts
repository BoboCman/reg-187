/**
 * Branded 187 letter as a standalone HTML document.
 * One builder feeds the on-screen preview (iframe), the print view and the
 * PDF (PDFShift), so what the advisor approves is what the client receives.
 */
import type { Letter } from "@/lib/policyplan/letter";

export interface LetterBranding {
  advisor_name?: string | null;
  advisor_title?: string | null;
  advisor_credentials?: string | null;
  firm_name?: string | null;
  firm_address?: string | null;
  phone?: string | null;
  email?: string | null;
  license_number?: string | null;
  logo_base64?: string | null;
  brand_primary_color?: string | null;
  brand_secondary_color?: string | null;
  disclosures?: string | null;
}

export interface LetterHtmlOptions {
  date: string; // ISO date
  preparedFor?: string | null;
  draft?: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const HEX = /^#[0-9a-fA-F]{3,8}$/;
const color = (c: string | null | undefined, fallback: string) => (c && HEX.test(c) ? c : fallback);
const DATA_IMG = /^data:image\/(png|jpe?g|svg\+xml|webp);base64,[A-Za-z0-9+/=]+$/;

function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function buildLetterHtml(letter: Letter, branding: LetterBranding | null, opts: LetterHtmlOptions): string {
  const b = branding ?? {};
  const primary = color(b.brand_primary_color, "#1a3a6b");
  const secondary = color(b.brand_secondary_color, "#5b6b82");
  const logo = b.logo_base64 && DATA_IMG.test(b.logo_base64) ? b.logo_base64 : null;

  const contact = [b.firm_address, b.phone, b.email].filter(Boolean).map(esc).join(" &nbsp;·&nbsp; ");
  const signer = [b.advisor_name, b.advisor_credentials].filter(Boolean).map(esc).join(", ");

  const sections = letter.sections
    .map((s) => {
      const paras = s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("");
      const bullets = s.bullets.length ? `<ul>${s.bullets.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
      const quotes = s.quotes
        .map((q) => `<blockquote>“${esc(q.text)}”${q.source ? `<cite>${esc(q.source)}</cite>` : ""}</blockquote>`)
        .join("");
      return `<section><h2>${esc(s.title)}</h2>${paras}${bullets}${quotes}</section>`;
    })
    .join("");

  // The model's closing may already include the signature lines; keep the
  // first paragraph only and render the signature from branding.
  const closing = esc(letter.closing.split(/\n\s*\n|\n/)[0] ?? letter.closing);

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recommendation letter</title>
<style>
  @page { size: letter; margin: 0.75in 0.8in 0.9in; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: #1f2933; font: 10.5pt/1.55 Georgia, "Times New Roman", serif; }
  .page { max-width: 7in; margin: 0 auto; padding: 0.4in 0 0.6in; position: relative; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 14px; border-bottom: 2px solid ${primary}; }
  header img { max-height: 54px; max-width: 2.2in; object-fit: contain; }
  .firm { text-align: right; font-family: Arial, Helvetica, sans-serif; }
  .firm .name { color: ${primary}; font-weight: 700; font-size: 12pt; letter-spacing: 0.01em; }
  .firm .contact { color: ${secondary}; font-size: 8pt; margin-top: 2px; }
  .meta { margin: 22px 0 18px; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: ${secondary}; }
  h2 { font-family: Arial, Helvetica, sans-serif; color: ${primary}; font-size: 11pt; margin: 20px 0 6px; }
  p { margin: 0 0 9px; }
  ul { margin: 0 0 9px 18px; padding: 0; }
  li { margin-bottom: 4px; }
  blockquote { margin: 8px 0 10px; padding: 6px 12px; border-left: 3px solid ${primary}; background: #f5f7fa; font-style: italic; color: #3e4c59; }
  blockquote cite { display: block; font-style: normal; font-size: 8pt; color: ${secondary}; margin-top: 3px; font-family: Arial, Helvetica, sans-serif; }
  .sign { margin-top: 22px; }
  .sign .who { margin-top: 26px; font-weight: 700; }
  .sign .role { color: ${secondary}; font-size: 9.5pt; }
  .approval { margin-top: 14px; font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: ${secondary}; }
  footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #d9e2ec; font-family: Arial, Helvetica, sans-serif; font-size: 7.5pt; color: #7b8794; white-space: pre-line; }
  .draft { position: fixed; top: 40%; left: 0; right: 0; text-align: center; font: 700 88pt Arial, sans-serif; color: rgba(197, 48, 48, 0.08); transform: rotate(-24deg); pointer-events: none; }
</style></head>
<body><div class="page">
  ${opts.draft ? '<div class="draft">DRAFT</div>' : ""}
  <header>
    <div>${logo ? `<img src="${logo}" alt="">` : ""}</div>
    <div class="firm">
      ${b.firm_name ? `<div class="name">${esc(b.firm_name)}</div>` : ""}
      ${contact ? `<div class="contact">${contact}</div>` : ""}
    </div>
  </header>
  <div class="meta">${esc(fmtDate(opts.date))}${opts.preparedFor ? `<br>Prepared for ${esc(opts.preparedFor)}` : ""}</div>
  <p>${esc(letter.salutation)}</p>
  <p>${esc(letter.opening)}</p>
  ${sections}
  <div class="sign">
    <p>${closing}</p>
    ${signer ? `<div class="who">${signer}</div>` : ""}
    ${b.advisor_title ? `<div class="role">${esc(b.advisor_title)}</div>` : ""}
    ${b.firm_name ? `<div class="role">${esc(b.firm_name)}</div>` : ""}
    ${b.license_number ? `<div class="role">License ${esc(b.license_number)}</div>` : ""}
  </div>
  ${opts.approvedBy ? `<div class="approval">Reviewed and approved by ${esc(opts.approvedBy)}${opts.approvedAt ? ` on ${esc(fmtDate(opts.approvedAt))}` : ""}.</div>` : ""}
  <footer>${b.disclosures ? esc(b.disclosures) + "\n\n" : ""}This letter summarizes the basis for my recommendation under New York Insurance Regulation 187 (11 NYCRR 224). Illustrated values are not guaranteed. Please read the full policy illustration, including its guaranteed values, before you apply. This letter is not tax or legal advice.</footer>
</div></body></html>`;
}
