/**
 * PolicyPlan Story report (policyplan-story-template.v1).
 * One HTML builder feeds the on-screen preview, the client copy and the PDF,
 * so what the advisor approves is what the client receives.
 *
 * Pages: Cover · The Story · The Design · Important information.
 * Numbers come only from the playback, and only cells matched to the page
 * text print as numbers. Captions come from the guarded draft text. Titles,
 * the lead paragraph and every disclosure are fixed template text.
 */
import { formatDate } from "./format";
import type { CompanionBranding, RenderOptions } from "./render";
import { STORY_CSS } from "./story-css";
import { GOAL_LABELS, type BenefitKey, type StoryDraft, type StoryPlayback } from "./story";

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const DATA_IMG = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;
const usd = (v: number) => "$" + Math.round(v).toLocaleString("en-US");
const compact = (v: number) => (v >= 1_000_000 ? `$${Number((v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 2))}M` : v >= 1000 ? `$${Math.round(v / 1000)}K` : usd(v));
const pct = (v: number) => `${Number(v.toFixed(2))}%`;

type Cell = StoryPlayback["points"][number]["sv_current"];
const cellText = (c: Cell, lapsed = false) =>
  lapsed ? '<span class="pr-muted">No coverage</span>' : c.value == null ? '<span class="pr-muted">—</span>' : c.verified ? usd(c.value) : '<span class="pr-muted">See illustration</span>';

/* ── The story picture ────────────────────────────────────────────────── */

function storySvg(p: StoryPlayback) {
  const segments = { construction: [40, 253], lease_up: [264, 477], fully_leased: [488, 680] } as const;
  const centers = { construction: 146.5, lease_up: 370.5, fully_leased: 584 };
  const captions = { construction: "Highest costs, surrender charge", lease_up: "Costs ease, value can build", fully_leased: "Income and legacy potential" };
  const position = (year: number) => {
    const phase = p.phases.find((x) => year >= x.from_year && (x.to_year == null || year <= x.to_year)) ?? p.phases[p.phases.length - 1];
    const [start, end] = segments[phase.key];
    const years = phase.to_year == null ? 25 : Math.max(1, phase.to_year - phase.from_year + 1);
    return Math.max(start, Math.min(end, start + ((year - phase.from_year + 0.5) / years) * (end - start)));
  };
  const startX = position(1);
  const track = p.phases.map((ph) => { const [a, b] = segments[ph.key]; return `<rect x="${a}" y="218" width="${b - a}" height="8" rx="4" fill="#E6EEF9"/>`; }).join("");
  const colors = { surrender_charge_ends: "#1F4E8C", premiums_complete: "#3A73B8", income_starts: "#1E8E5A" } as const;
  let prevX = -Infinity;
  const milestones = p.milestones
    .map((m) => {
      const x = position(m.year);
      const shifted = x - prevX < 126;
      const lx = shifted ? Math.min(640, prevX + 126) : x;
      prevX = lx;
      const color = colors[m.key];
      return `<g><path d="M${x} 213l9 9-9 9-9-9z" fill="${color}"/>${shifted ? `<path d="M${x + 7} 229L${lx - 14} 248" stroke="${color}" stroke-width="1"/>` : ""}<text x="${lx}" y="252" text-anchor="middle" font-size="9" font-weight="700" fill="${color}">${esc(m.label)}</text><text x="${lx}" y="265" text-anchor="middle" font-size="9" fill="#3B4A5E">Year ${m.year}${m.age == null ? "" : ` · Age ${m.age}`}</text></g>`;
    })
    .join("");
  const phases = p.phases
    .map(
      (ph) =>
        `<g text-anchor="middle" font-family="Helvetica, Arial, sans-serif"><text x="${centers[ph.key]}" y="291" font-size="13" font-weight="800" fill="#0F1E33">${esc(ph.label)}</text><text x="${centers[ph.key]}" y="307" font-size="10" fill="#3B4A5E">${ph.to_year == null ? `Year ${ph.from_year}+${ph.from_age == null ? "" : ` · Age ${ph.from_age}+`}` : `Years ${ph.from_year}–${ph.to_year}${ph.from_age == null || ph.to_age == null ? "" : ` · Ages ${ph.from_age}–${ph.to_age}`}`}</text><text x="${centers[ph.key]}" y="321" font-size="10" fill="#3B4A5E">${captions[ph.key]}</text></g>`,
    )
    .join("");
  const windows = [[22, 122], [56, 122], [22, 152], [56, 152], [90, 152]].map(([x, y]) => `<rect x="${x}" y="${y}" width="18" height="16" fill="#FDF3E1"/>`).join("");
  const tower = [74, 104, 134].flatMap((y) => [24, 58, 92].map((x) => `<rect x="${x}" y="${y}" width="18" height="16" fill="#FDF3E1"/>`)).join("");
  const badgeX = Math.max(20, Math.min(470, startX - 105));
  return `<svg class="pr-story-svg" viewBox="0 0 700 332" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Three stages of an apartment complex mapped to policy years, starting at year 1"><line x1="20" x2="680" y1="200" y2="200" stroke="#B8C2D0" stroke-width="2"/><g transform="translate(70,0)" fill="none" stroke="#C9822B" stroke-width="4"><path d="M20 200V70H120"/><path d="M100 72v38" stroke-width="2"/><rect x="92" y="110" width="16" height="10" fill="#C9822B"/><path d="M45 200v-60h90v60M45 170h90M90 140v60" stroke="#1F4E8C" stroke-width="3" stroke-dasharray="6 4"/></g><g transform="translate(290,0)"><rect x="10" y="110" width="110" height="90" rx="3" fill="#3A73B8"/>${windows}<rect x="90" y="122" width="18" height="16" fill="#6E9BD1"/><rect x="52" y="178" width="26" height="22" fill="#1F4E8C"/></g><g transform="translate(500,0)"><rect x="10" y="60" width="130" height="140" rx="3" fill="#1F4E8C"/>${tower}<rect x="60" y="170" width="30" height="30" fill="#2B5C9E"/><text x="150" y="70" font-size="20" font-weight="800" fill="#1E8E5A">$</text></g>${track}<path d="M44 222H${startX}" stroke="#C9822B" stroke-width="8" stroke-linecap="round"/><line x1="${startX}" x2="${startX}" y1="40" y2="214" stroke="#B7791F" stroke-width="1.5" stroke-dasharray="3 4"/><rect x="${badgeX}" y="14" width="210" height="26" rx="13" fill="#B7791F"/><text x="${badgeX + 105}" y="31" text-anchor="middle" font-size="10" font-weight="800" fill="#fff">You start here · Year 1${p.issue_age == null ? "" : ` · Age ${p.issue_age}`}</text>${milestones}${phases}</svg>`;
}

const ICONS: Record<BenefitKey, string> = {
  growth: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  access: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  legacy: '<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>',
  living_benefits: '<path d="M12 2l9 4v6c0 5-3.5 8-9 10-5.5-2-9-5-9-10V6z"/><path d="M8 12l3 3 5-6"/>',
};
const TITLES: Record<BenefitKey, string> = { growth: "Growth potential", access: "Access to cash value", legacy: "A legacy", living_benefits: "Living benefits" };
const GOAL_BENEFIT: Record<string, BenefitKey> = { retirement_income: "access", legacy: "legacy", long_term_care: "living_benefits", accumulation: "growth" };

const LEAD =
  "An indexed universal life policy can work like building an apartment complex. The early years carry most of the construction cost. Once the building is leased up, value has room to build. Upkeep never stops, but the goal is a building that can pay you later and leave something behind.";
const STORY_NOTE =
  "The apartment complex is an analogy, not a description of contract terms. Values beyond the guaranteed columns are not guaranteed and depend on future crediting and charges. Policy loans and withdrawals reduce cash values and the death benefit and may cause the policy to lapse; a lapse with a loan outstanding can create taxable income. Consult a tax professional about your situation.";

/* ── HTML ─────────────────────────────────────────────────────────────── */

export function buildStoryHtml(draft: StoryDraft, branding: CompanionBranding | null, opts: RenderOptions): string {
  const p = draft.playback;
  const t = draft.text;
  const b = branding ?? {};
  const cover = draft.inputs.cover;
  const logo = b.logo_base64 && DATA_IMG.test(b.logo_base64) ? `<img class="pr-logo" src="${b.logo_base64}" alt="">` : "";
  const firm = cover.firm_name || b.firm_name || "";
  const advisor = cover.advisor_name || b.advisor_name || "";
  const title = cover.title || "Your Policy Story";
  const subtitle = cover.subtitle || (p.product.product_class === "IUL" ? "Indexed Universal Life\nHow your proposed policy is designed to work" : "Life Insurance\nHow your proposed policy is designed to work");
  const preparedFor = cover.prepared_for || "";
  const illDate = p.product.illustration_date ? formatDate(p.product.illustration_date) : null;

  const ribbon =
    opts.state === "internal_draft"
      ? '<div class="pr-ribbon pr-ribbon-draft">DRAFT FOR ADVISOR REVIEW · NOT FOR CLIENT DISTRIBUTION</div><div class="pr-wm">DRAFT</div>'
      : opts.state === "sample"
        ? '<div class="pr-ribbon pr-ribbon-sample">FICTIONAL DEMONSTRATION · NOT A LIVE INSURANCE PROPOSAL</div><div class="pr-wm">SAMPLE</div>'
        : "";
  const approvedLine =
    opts.state === "approved" && opts.approvedAt
      ? `Reviewed by ${esc(opts.approvedBy ?? "the advisor")} on ${esc(formatDate(opts.approvedAt.slice(0, 10)))}${opts.artifactId ? ` · Ref ${esc(opts.artifactId)}` : ""}`
      : opts.state === "internal_draft"
        ? "Internal draft for advisor review"
        : "Fictional people, carrier and product";
  const footer = (n: number) => `<div class="pr-footer"><span>${esc(firm || "Prepared by your financial professional")}</span><span class="pr-footer-mid">Not guaranteed unless labeled guaranteed · Read with the full carrier illustration</span><span>Page ${n}</span></div>`;

  /* Page 1: cover */
  const page1 = `<section class="pr-page pr-cover-page" aria-label="Cover">${ribbon}<div class="pr-cover-bar"></div><div class="pr-page-body"><div class="pr-cover"><header class="pr-cover-logo">${logo}${firm ? `<span>${esc(firm)}</span>` : ""}</header><div class="pr-sp"></div><main class="pr-cover-main"><h1 class="pr-cover-title${title.length > 28 ? " pr-cover-title-long" : ""}">${esc(title)}</h1><div class="pr-cover-subtitle">${subtitle.split(/\r?\n/).map(esc).join("<br>")}</div><div class="pr-cover-summary"><div class="pr-cover-prepared${advisor ? " pr-cover-people" : ""}"><div><div class="pr-label">Prepared for</div><div class="pr-cover-name">${esc(preparedFor || "—")}</div></div>${advisor ? `<div><div class="pr-label">Advisor</div><div class="pr-cover-name">${esc(advisor)}</div></div>` : ""}</div><div class="pr-cover-fields"><div><div class="pr-label">Proposed product</div><strong>${esc(p.product.product ?? "—")}</strong></div><div><div class="pr-label">Insurance carrier</div><strong>${esc(p.product.carrier ?? "—")}</strong></div><div><div class="pr-label">Illustration date</div><strong>${esc(illDate ?? "See illustration")}</strong></div><div><div class="pr-label">Prepared</div><strong>${esc(formatDate(opts.preparedAt.slice(0, 10)))}</strong></div></div></div></main><div class="pr-cover-disclaimer">This story explains a proposed policy design using an analogy. It is based on the carrier's sales illustration${illDate ? ` dated ${esc(illDate)}` : ""}, is not a contract or a recommendation, and must be read with the complete illustration.</div><div class="pr-sp"></div></div></div>${footer(1)}</section>`;

  /* Page 2: the story */
  const goals = p.goals.length ? `<div class="pr-built-for"><span>DESIGNED FOR</span>${p.goals.map((g) => `<span class="pr-goal-pill">${esc(GOAL_LABELS[g])}</span>`).join("")}</div>` : "";
  const next = p.milestones[0];
  const nextBox = next ? `<div class="pr-next-milestone"><span class="pr-label">FIRST MILESTONE</span><strong>${esc(next.label)}</strong><span>Year ${next.year}${next.age == null ? "" : ` · Age ${next.age}`}</span></div>` : "";
  const goalBenefit = p.goals.map((g) => GOAL_BENEFIT[g]).find((k) => k && t.benefits[k]);
  const benefitKeys = (["growth", "access", "legacy", "living_benefits"] as BenefitKey[]).filter((k) => t.benefits[k] && (k !== "living_benefits" || p.benefit_facts.living_benefit_riders.length));
  const tiles = benefitKeys
    .map((k) => {
      const isGoal = k === goalBenefit;
      return `<div class="pr-benefit${isGoal ? " pr-benefit-goal" : ""}">${isGoal ? '<span class="pr-goal-tab">YOUR GOAL</span>' : ""}<span class="pr-benefit-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS[k]}</svg></span><strong>${TITLES[k]}</strong><span class="pr-benefit-note">${esc(t.benefits[k])}</span></div>`;
    })
    .join("");
  const page2 = `<section class="pr-page pr-story-page pr-story-modern" aria-label="The Story">${ribbon}<div class="pr-page-body"><h2 class="pr-section">The Story: An Apartment Complex</h2><div class="pr-section-rule"></div>${goals}<p class="pr-lead">${LEAD}</p><div class="pr-sp"></div>${storySvg(p)}<div class="pr-sp"></div><div class="pr-card pr-where"><div><strong>Where you start: </strong>${esc(t.where_you_start)}</div>${nextBox}</div><div class="pr-sp"></div><h3 class="pr-subheading pr-center">What this building is designed to provide</h3><div class="pr-benefits pr-benefits-modern${benefitKeys.length === 4 ? " pr-benefits-four" : ""}">${tiles}</div><div class="pr-sp"></div><p class="pr-tiny pr-story-note">${STORY_NOTE}</p></div>${footer(2)}</section>`;

  /* Page 3: the design */
  const keys = [
    { label: "Planned premium", value: p.premium.annual_verified && p.premium.annual != null ? `${compact(p.premium.annual)} a year` : "See illustration", note: p.premium.years ? `For ${p.premium.years} years${p.premium.last_age ? `, through age ${p.premium.last_age}` : ""}` : "As illustrated" },
    { label: "Initial death benefit", value: p.death_benefit.initial != null ? compact(p.death_benefit.initial) : "See illustration", note: "Paid to your beneficiaries" },
    { label: "Illustrated rate", value: p.crediting.illustrated_rate != null ? pct(p.crediting.illustrated_rate) : "See illustration", note: `Not guaranteed${p.crediting.guaranteed_rate != null ? ` · guaranteed basis ${pct(p.crediting.guaranteed_rate)}` : ""}` },
    { label: "Coverage shown to", value: p.coverage.illustrated_through_age != null ? `Age ${p.coverage.illustrated_through_age}` : "See illustration", note: p.coverage.guaranteed_through_age != null ? `Guaranteed basis: age ${p.coverage.guaranteed_through_age}` : "Guaranteed basis: see illustration" },
  ];
  const keyBand = `<div class="pr-keys">${keys.map((k) => `<div class="pr-key"><div class="pr-label">${esc(k.label)}</div><strong>${esc(k.value)}</strong><span>${esc(k.note)}</span></div>`).join("")}</div>`;
  const table = p.points.length
    ? `<table class="pr-values"><thead><tr><th rowspan="2">When</th><th rowspan="2">Premiums paid</th><th colspan="2" class="pr-g">Guaranteed</th><th colspan="2" class="pr-ng">Illustrated, not guaranteed</th></tr><tr><th class="pr-g">Surrender value</th><th class="pr-g">Death benefit</th><th class="pr-ng">Surrender value</th><th class="pr-ng">Death benefit</th></tr></thead><tbody>${p.points
        .map(
          (pt) =>
            `<tr><td><strong>${esc(pt.label)}</strong><br><span class="pr-muted">Year ${pt.policy_year}</span></td><td>${cellText(pt.cumulative_premium)}</td><td>${cellText(pt.sv_guaranteed, pt.guaranteed_lapsed)}</td><td>${cellText(pt.db_guaranteed, pt.guaranteed_lapsed)}</td><td>${cellText(pt.sv_current)}</td><td>${cellText(pt.db_current)}</td></tr>`,
        )
        .join("")}</tbody></table><p class="pr-tiny" style="margin-top:6px">Guaranteed values assume the maximum charges and minimum crediting in the contract. Illustrated values assume the illustrated rate${p.crediting.illustrated_rate != null ? ` of ${pct(p.crediting.illustrated_rate)}` : ""} and current charges continue every year; actual results will differ and can be lower.${p.income?.annual != null ? ` Illustrated values reflect planned income of ${usd(p.income.annual)} a year${p.income.start_age ? ` from age ${p.income.start_age}` : ""}${p.income.end_age ? ` to ${p.income.end_age}` : ""}.` : ""}</p>`
    : "";
  const riderItems = p.riders_shown.map((name) => `<li><strong>${esc(name)}</strong><span>${t.riders[name] ? esc(t.riders[name]) : "See the illustration for how this rider works and what it costs."}</span></li>`).join("");
  const beneficiary = draft.inputs.beneficiary;
  const protection =
    riderItems || beneficiary
      ? `<h3 class="pr-subheading">Protection details</h3>${beneficiary ? `<p class="pr-basis" style="margin:0 0 8px"><span class="pr-label">Beneficiary</span>&nbsp;&nbsp;<b>${esc(beneficiary)}</b></p>` : ""}${riderItems ? `<ul class="pr-rider-notes">${riderItems}</ul>` : ""}`
      : "";
  const page3 = `<section class="pr-page pr-summary-page" aria-label="The Design">${ribbon}<div class="pr-page-body"><h2 class="pr-section">The Design</h2><div class="pr-section-rule"></div><p class="pr-design-headline">${esc(t.headline)}</p>${keyBand}<h3 class="pr-subheading">Guaranteed and illustrated, side by side</h3>${table}<div class="pr-card pr-takeaway" style="margin-top:12px"><strong>The takeaway: </strong>${esc(t.takeaway)}</div>${protection}<div class="pr-sp"></div><p class="pr-tiny pr-source">Source: carrier sales illustration${illDate ? ` dated ${esc(illDate)}` : ""}${p.source_pages.length ? `, ledger pages ${p.source_pages.join(", ")}` : ""}. ${p.notes.map(esc).join(" ")}</p></div>${footer(3)}</section>`;

  /* Page 4: important information */
  const notice = `This report summarizes selected information from the carrier's sales illustration${illDate ? ` dated ${esc(illDate)}` : ""}${p.product.product ? ` for ${esc(p.product.product)}` : ""}${p.product.carrier ? ` from ${esc(p.product.carrier)}` : ""}. It supplements, and does not replace, the complete illustration, which contains the guaranteed and non-guaranteed values, their assumptions and the required disclosures. The apartment complex is an analogy used to explain how this kind of policy is designed to work. Non-guaranteed values are not guaranteed, and actual results may be more or less favorable. Indexed interest is linked to an index but the policy does not invest in the index or the market. This is not a contract, a carrier document or a recommendation, and it does not provide tax or legal advice.`;
  const firmDisc = opts.showFirmDisclosures && b.disclosures ? `<div class="disclosure-section"><h3>Firm disclosures${firm ? ` · ${esc(firm)}` : ""}</h3>${b.disclosures.split(/\n\s*\n/).filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join("")}</div>` : "";
  const page4 = `<section class="pr-disclosure-page" aria-label="Important information"><h2>IMPORTANT INFORMATION</h2><div class="disclosure-section"><h3>About this report</h3><p>${notice}</p></div><div class="disclosure-section"><h3>Loans, withdrawals and taxes</h3><p>${STORY_NOTE}</p></div>${firmDisc}<div class="disclosure-copyright">${approvedLine}</div></section>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${STORY_CSS}</style></head><body style="margin:0;background:#e9ecef"><div class="pr-report">${page1}${page2}${page3}</div>${page4}</body></html>`;
}
