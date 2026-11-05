/**
 * Companion document renderer (companion-template.v1).
 * One HTML builder feeds the on-screen preview, the print view and the PDF,
 * so what the producer approves is what the client receives.
 *
 * Numbers reach the page only through verified facts (fact band, tokens,
 * milestone rows). Disclosures, source lines and branding are trusted
 * template text, never model output.
 */
import type { CompanionDraft, EvidencePacket, ExtractedFact } from "./contracts";
import { formatDate, formatFactValue, substituteTokens } from "./format";

export interface CompanionBranding {
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
  disclosures?: string | null;
}

export type RenderState = "internal_draft" | "approved" | "sample";

export interface RenderOptions {
  state: RenderState;
  preparedAt: string; // ISO
  approvedBy?: string | null;
  approvedAt?: string | null;
  artifactId?: string | null;
  /** Approved firm disclosure block; printed only when the firm approved release. */
  showFirmDisclosures?: boolean;
}

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const HEX = /^#[0-9a-fA-F]{6}$/;
const DATA_IMG = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;

function prose(body: string, facts: Map<string, ExtractedFact>): string {
  // Escape first, then substitute verified values (which are escaped too).
  const escaped = esc(body).replace(/\{\{\s*(f\.[a-z0-9_.]+)\s*\}\}/g, (_, id: string) => `{{${id}}}`);
  return substituteTokens(escaped, new Map([...facts].map(([k, f]) => [k, { ...f, value: typeof f.value === "string" ? esc(f.value) : f.value }])));
}

export function buildCompanionHtml(
  draft: CompanionDraft,
  packet: EvidencePacket,
  facts: Map<string, ExtractedFact>,
  branding: CompanionBranding | null,
  opts: RenderOptions,
): string {
  const b = branding ?? {};
  const accent = b.brand_primary_color && HEX.test(b.brand_primary_color) ? b.brand_primary_color : "#1f3a5f";
  const logo = b.logo_base64 && DATA_IMG.test(b.logo_base64) ? b.logo_base64 : null;
  const v = (id: string) => (facts.get(id)?.status === "verified" ? formatFactValue(facts.get(id)!) : null);
  const illDate = v("f.illustration_date");
  const product = v("f.product_name");
  const insurer = v("f.insurer");

  const blocks = draft.blocks;
  const byId = (id: string) => blocks.find((x) => x.block_id === id);
  const para = (id: string) => {
    const blk = byId(id);
    return blk ? `<p>${prose(blk.body, facts)}</p>` : "";
  };
  const considerations = (page: 1 | 2) => blocks.filter((x) => x.purpose === "consideration" && x.page === page);

  const producerLine = [b.advisor_name ? esc(b.advisor_name) + (b.advisor_credentials ? `, ${esc(b.advisor_credentials)}` : "") : null, b.firm_name ? esc(b.firm_name) : null]
    .filter(Boolean)
    .join(" · ");
  const contactLine = [b.phone, b.email, b.license_number ? `License ${b.license_number}` : null].filter(Boolean).map(esc).join(" · ");

  const watermark =
    opts.state === "internal_draft"
      ? `<div class="ribbon draft">DRAFT — NOT FOR CLIENT DISTRIBUTION</div><div class="wm">DRAFT</div>`
      : opts.state === "sample"
        ? `<div class="ribbon sample">FICTIONAL DEMONSTRATION — NOT A LIVE INSURANCE PROPOSAL</div><div class="wm">SAMPLE</div>`
        : "";

  const band = draft.plan.fact_band
    .map(
      (f) =>
        `<div class="fact"><div class="fl">${esc(f.label)}</div><div class="fv">${esc(f.display)}</div>${f.qualifier ? `<div class="fq">${esc(f.qualifier)}</div>` : ""}</div>`,
    )
    .join("");

  const sourcePages = draft.plan.source_pages.length ? `pp. ${draft.plan.source_pages.join(", ")}` : null;
  const sourceLine = `Source: carrier illustration${illDate ? ` dated ${esc(illDate)}` : ""}${sourcePages ? `, ${sourcePages}` : ""}.`;

  const milestoneTable = draft.plan.milestones.length
    ? `<section class="sec"><h2>Selected values from the illustration</h2>
      <table class="ms"><thead><tr><th rowspan="2">Policy year</th><th rowspan="2">Age</th><th rowspan="2">Total planned outlay</th><th colspan="2" class="g">Guaranteed</th><th colspan="2" class="ng">Illustrated, not guaranteed${v("f.illustrated_rate") ? ` (${esc(v("f.illustrated_rate"))})` : ""}</th></tr>
      <tr><th class="g">Net surrender value</th><th class="g">Death benefit</th><th class="ng">Net surrender value</th><th class="ng">Death benefit</th></tr></thead><tbody>
      ${draft.plan.milestones
        .map((r) => {
          const c = (id: string | null, lapsedLabel = "No coverage") => (id ? esc(v(id) ?? "") : `<span class="muted">${lapsedLabel}</span>`);
          return `<tr><td>${r.policy_year}</td><td>${r.age ?? ""}</td><td>${c(r.cumulative_outlay_fact)}</td><td class="g">${c(r.sv_guaranteed_fact)}</td><td class="g">${c(r.db_guaranteed_fact)}</td><td class="ng">${c(r.sv_current_fact)}</td><td class="ng">${c(r.db_current_fact)}</td></tr>`;
        })
        .join("")}
      </tbody></table>
      <p class="note">${sourceLine} Guaranteed values assume the maximum charges and minimum rates in the contract. Illustrated values assume current non-guaranteed rates and charges continue unchanged; actual results can be higher or lower. Read the full ledger in the carrier illustration.</p></section>`
    : "";

  const cards = (list: typeof blocks) =>
    list.length
      ? `<div class="cards">${list
          .map((c, i) => `<div class="card"><div class="cn">${i + 1}</div><div><h3>${esc(c.label)}</h3><p>${prose(c.body, facts)}</p></div></div>`)
          .join("")}</div>`
      : "";

  const notice = `This companion summarizes selected information from the carrier's sales illustration${illDate ? ` dated ${esc(illDate)}` : ""}${product ? ` for ${esc(product)}` : ""}${insurer ? ` from ${esc(insurer)}` : ""}. It supplements, and does not replace, the complete illustration, which contains the guaranteed and non-guaranteed values, their assumptions and the required disclosures. Non-guaranteed values are not guaranteed, and actual results may be more or less favorable. This is not a contract, a carrier document or a recommendation, and it does not address tax or legal questions.`;

  const disclosures = opts.showFirmDisclosures && b.disclosures ? `<p class="disc">${esc(b.disclosures)}</p>` : "";
  const approvedLine =
    opts.state === "approved" && opts.approvedAt
      ? `Reviewed by ${esc(opts.approvedBy ?? "the producer")} on ${esc(formatDate(opts.approvedAt.slice(0, 10)))}${opts.artifactId ? ` · Ref ${esc(opts.artifactId)}` : ""}`
      : opts.state === "internal_draft"
        ? "Internal draft for producer review"
        : opts.state === "sample"
          ? "Fictional people, carrier and product"
          : "";

  const pages = draft.plan.two_page ? 2 : 1;
  const footer = (n: number) => `<footer><div class="src">${sourceLine}</div><p class="notice">${notice}</p>${disclosures}<div class="fmeta"><span>${approvedLine}</span><span>Page ${n} of ${pages}</span></div></footer>`;

  const header = `<header>
    <div class="brand">${logo ? `<img src="${logo}" alt="" class="logo">` : ""}<div><div class="pl">${producerLine || "Prepared by your financial professional"}</div>${contactLine ? `<div class="pc">${contactLine}</div>` : ""}</div></div>
    <div class="title"><div class="t1">Your Life Insurance Proposal</div><div class="t2">Illustration Companion</div></div>
  </header>
  <div class="meta">Prepared ${esc(formatDate(opts.preparedAt.slice(0, 10)))}${illDate ? ` · Carrier illustration dated ${esc(illDate)}` : " · Carrier illustration date: see illustration"}${product ? ` · ${esc(product)}` : ""}</div>`;

  const page1 = `<div class="page">${watermark}${header}
    <section class="band">${band}</section>
    <section class="sec"><h2>${esc(byId("b.objective")?.label ?? "Why this proposal is being considered")}</h2>${para("b.objective")}</section>
    <section class="sec"><h2>How the proposed policy works</h2><div class="two">
      <div><h3>${esc(byId("b.mechanism_benefit")?.label ?? "What the policy does")}</h3>${para("b.mechanism_benefit")}</div>
      <div><h3>${esc(byId("b.mechanism_funding")?.label ?? "How it is funded")}</h3>${para("b.mechanism_funding")}</div>
    </div></section>
    <section class="sec"><div class="two gi">
      <div class="gbox"><div class="gtag">Guaranteed</div><h3>${esc(byId("b.guaranteed")?.label ?? "What is guaranteed")}</h3>${para("b.guaranteed")}</div>
      <div class="ibox"><div class="itag">Not guaranteed</div><h3>${esc(byId("b.illustrated")?.label ?? "What is illustrated, not guaranteed")}</h3>${para("b.illustrated")}</div>
    </div></section>
    ${considerations(1).length ? `<section class="sec"><h2>What to understand before proceeding</h2>${cards(considerations(1))}</section>` : ""}
    ${footer(1)}</div>`;

  const page2 =
    pages === 2
      ? `<div class="page">${watermark}<div class="meta p2">Illustration Companion · continued${product ? ` · ${esc(product)}` : ""}</div>
      ${considerations(2).length ? `<section class="sec"><h2>Details worth discussing</h2>${cards(considerations(2))}</section>` : ""}
      ${milestoneTable}
      ${footer(2)}</div>`
      : "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Illustration Companion</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap" rel="stylesheet">
<style>
@page { size: letter; margin: 0; }
:root { --accent: ${accent}; --ink: #1d2430; --muted: #5a6474; --line: #dfe3e8; --soft: #f5f6f8; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #e9ecef; }
body { font-family: Inter, "Helvetica Neue", Arial, sans-serif; color: var(--ink); font-size: 10pt; line-height: 1.38; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { position: relative; width: 8.5in; height: 11in; margin: 0 auto 16px; padding: 0.48in 0.56in 0.4in; background: #fff; overflow: hidden; display: flex; flex-direction: column; page-break-after: always; break-after: page; }
.page:last-child { page-break-after: auto; break-after: auto; margin-bottom: 0; }
@media print { html, body { background: #fff; } .page { margin: 0; box-shadow: none; } }
@media screen and (max-width: 860px) { .page { width: 100%; height: auto; min-height: 0; padding: 24px 18px; overflow: visible; } .band { grid-template-columns: 1fr 1fr !important; } .two { grid-template-columns: 1fr !important; } }
.ribbon { position: absolute; top: 0; left: 0; right: 0; text-align: center; font-size: 7.6pt; font-weight: 700; letter-spacing: .12em; padding: 4px 0; color: #fff; }
.ribbon.draft { background: #9a3412; } .ribbon.sample { background: #334155; }
.wm { position: absolute; top: 42%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 120pt; font-weight: 800; color: rgba(15, 23, 42, 0.045); pointer-events: none; letter-spacing: .08em; }
header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding-bottom: 8px; border-bottom: 2px solid var(--accent); margin-top: 6px; }
.brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.logo { max-height: 0.42in; max-width: 1.6in; object-fit: contain; }
.pl { font-weight: 600; font-size: 9.4pt; } .pc { color: var(--muted); font-size: 8.5pt; }
.title { text-align: right; } .t1 { font-family: "Source Serif 4", Georgia, serif; font-size: 17pt; font-weight: 600; letter-spacing: -.01em; line-height: 1.1; } .t2 { color: var(--accent); font-size: 8.6pt; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; margin-top: 2px; }
.meta { color: var(--muted); font-size: 8.6pt; margin: 5px 0 10px; } .meta.p2 { margin-top: 12px; border-bottom: 1px solid var(--line); padding-bottom: 6px; }
.band { display: grid; grid-template-columns: repeat(${Math.max(draft.plan.fact_band.length, 1)}, 1fr); gap: 0; border: 1px solid var(--line); border-radius: 6px; background: var(--soft); margin-bottom: 10px; }
.fact { padding: 8px 11px; border-left: 1px solid var(--line); } .fact:first-child { border-left: 0; }
.fl { font-size: 8.5pt; color: var(--muted); font-weight: 500; } .fv { font-size: 15.5pt; font-weight: 700; letter-spacing: -.01em; margin: 2px 0 1px; line-height: 1.15; } .fq { font-size: 8.5pt; color: var(--muted); line-height: 1.3; }
.sec { margin-bottom: 9px; }
h2 { font-family: "Source Serif 4", Georgia, serif; font-size: 12pt; font-weight: 600; margin: 0 0 4px; color: var(--ink); }
h3 { font-size: 9.6pt; font-weight: 600; margin: 0 0 2px; }
p { margin: 0; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.gi .gbox, .gi .ibox { border-radius: 6px; padding: 9px 11px 10px; }
.gbox { border: 1.5px solid var(--accent); } .ibox { border: 1.5px dashed #8a94a3; background: #fbfbfc; }
.gtag, .itag { font-size: 7.8pt; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 3px; } .gtag { color: var(--accent); } .itag { color: #5a6474; }
.cards { display: grid; gap: 5px; }
.card { display: grid; grid-template-columns: 20px 1fr; gap: 8px; align-items: start; border-top: 1px solid var(--line); padding-top: 5px; }
.card:first-child { border-top: 0; padding-top: 0; }
.cn { width: 18px; height: 18px; border-radius: 50%; background: var(--accent); color: #fff; font-size: 8.5pt; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
footer { margin-top: auto; border-top: 1px solid var(--line); padding-top: 7px; font-size: 8.5pt; color: var(--muted); line-height: 1.35; }
.src { font-weight: 600; color: var(--ink); margin-bottom: 2px; } .notice { margin-bottom: 3px; } .disc { margin-bottom: 3px; font-size: 8.5pt; }
.fmeta { display: flex; justify-content: space-between; margin-top: 3px; }
table.ms { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 4px; } table.ms th, table.ms td { border-bottom: 1px solid var(--line); padding: 4px 6px; text-align: right; } table.ms th { font-weight: 600; font-size: 8.5pt; color: var(--muted); } table.ms th:first-child, table.ms td:first-child { text-align: left; }
table.ms th.g { border-bottom: 2px solid var(--accent); } table.ms th.ng { border-bottom: 2px dashed #8a94a3; } .muted { color: var(--muted); } .note { font-size: 8.5pt; color: var(--muted); margin-top: 4px; }
</style></head><body>${page1}${page2}</body></html>`;
}
