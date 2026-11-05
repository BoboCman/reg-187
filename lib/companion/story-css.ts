/**
 * Report styles for PolicyPlan Stories. Same visual system as the IP AI Pro
 * Performance Review report (copied, not shared, so the two apps ship
 * separately), plus the story-specific rules at the end.
 */
export const STORY_CSS = String.raw`@page { size: letter; margin: 0; }
html, body { margin:0; padding:0; }
.pr-report { --pr-bar:#2B5C9E; --pr-head:#1F4E8C; --pr-label:#2F6DB5; --pr-ink:#0F1E33; --pr-ink2:#3B4A5E; --pr-muted:#6B7A8F; --pr-rule:#D8DFEA; --pr-card:#F6F8FB; --pr-cardline:#E3E8F0; --pr-as-sold:#C9822B; --pr-today:#3A73B8; font-family:Helvetica,Arial,sans-serif; color:var(--pr-ink); font-size:10.5pt; line-height:1.4; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.pr-report * { box-sizing:border-box; }
.pr-report .pr-page { width:8.5in; height:10.98in; padding:.55in .75in .75in; position:relative; overflow:hidden; display:flex; flex-direction:column; break-after:page; page-break-after:always; break-inside:avoid; page-break-inside:avoid; background:#fff; margin:0 auto 20px; box-shadow:0 4px 24px #0002; }
.pr-page-body { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; }
.pr-page-body > :not(.pr-sp) { flex:none; }
.pr-sp { flex:1 1 0; min-height:0; max-height:.45in; }
.pr-page-body .pr-card, .pr-page-body .pr-comparison, .pr-page-body .pr-action-row, .pr-page-body .pr-benefit, .pr-page-body svg, .pr-page-body .pr-protection-box { break-inside:avoid; page-break-inside:avoid; }
.pr-footer { position:absolute; left:.1in; right:.1in; bottom:.12in; display:flex; justify-content:space-between; border-top:1px solid var(--pr-rule); padding-top:5px; font-size:6.5pt; color:var(--pr-muted); }
.pr-footer-mid { color:var(--pr-label); }
.pr-section { font-size:20pt; letter-spacing:.04em; color:var(--pr-head); margin:0 0 4px; text-transform:uppercase; font-weight:800; line-height:1.2; }
.pr-section-rule { height:3px; background:var(--pr-bar); margin-bottom:22px; }
.pr-subheading { font-size:10pt; color:var(--pr-head); margin:26px 0 10px; text-transform:uppercase; letter-spacing:.08em; font-weight:700; }
.pr-label { font-size:7pt; letter-spacing:.14em; text-transform:uppercase; color:var(--pr-label); font-weight:700; }
.pr-card { background:var(--pr-card); border:1px solid var(--pr-cardline); border-radius:10px; padding:14px 16px; }
.pr-pill { display:inline-block; font-size:8pt; font-weight:700; padding:3px 10px; border-radius:12px; white-space:nowrap; }
.pr-good { color:#1E8E5A; background:#E3F5EC; }.pr-warn { color:#B7791F; background:#FDF3E1; }.pr-info { color:#2F6DB5; background:#E6EEF9; }.pr-bad { color:#A3471D; background:#FBE9E1; }.pr-unavailable { color:#6B7A8F; background:#EEF1F5; }
.pr-tiny { font-size:7pt; line-height:1.35; color:var(--pr-muted); }.pr-lead { font-size:12pt; line-height:1.4; color:var(--pr-ink2); margin:0 0 8px; }
.pr-cover-bar { position:absolute; top:.38in; left:.75in; right:.75in; height:5px; background:var(--pr-bar); }
.pr-cover-page .pr-cover { display:flex; flex:1 1 auto; min-height:0; flex-direction:column; padding:.55in .6in 0; }
.pr-cover-page .pr-cover-logo { display:flex; flex:none; align-items:flex-start; gap:12px; font-size:13pt; font-weight:700; line-height:.62in; min-height:1.4in; overflow:hidden; overflow-wrap:anywhere; }
.pr-cover-page .pr-cover-main { flex:none; }
.pr-cover-page .pr-sp { width:100%; }
.pr-cover-page:has(.pr-cover-title-long) .pr-cover-logo { min-height:1in; }
.pr-cover-page .pr-logo { max-width:2.2in; max-height:.62in; object-fit:contain; }
.pr-cover-page .pr-label { font-size:7pt; letter-spacing:.16em; }
.pr-cover-page .pr-cover-title { font-size:34pt; color:var(--pr-head); text-transform:uppercase; margin:8px 0 12px; font-weight:800; line-height:1.05; letter-spacing:-.025em; overflow-wrap:anywhere; }
.pr-cover-page .pr-cover-title-long { font-size:28pt; }
.pr-cover-page .pr-cover-subtitle { color:var(--pr-ink2); font-size:13pt; line-height:1.45; margin:0 0 18px; overflow-wrap:anywhere; }
.pr-cover-page .pr-cover-summary { border-top:1px solid var(--pr-rule); }
.pr-cover-page .pr-cover-prepared { padding:16px 0 18px; border-bottom:1px solid var(--pr-rule); }
.pr-cover-page .pr-cover-people { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
.pr-cover-page .pr-cover-name { font-size:18pt; font-weight:700; margin-top:6px; line-height:1.16; overflow-wrap:anywhere; }
.pr-cover-page .pr-cover-people .pr-cover-name { font-size:16pt; }
.pr-cover-page:has(.pr-cover-title-long) .pr-cover-people .pr-cover-name { font-size:14pt; }
.pr-cover-page .pr-cover-fields { display:grid; grid-template-columns:1fr 1fr; column-gap:26px; row-gap:14px; padding:18px 0 16px; border-bottom:1px solid var(--pr-rule); }
.pr-cover-page .pr-cover-fields strong { font-size:13pt; line-height:1.35; display:block; margin-top:5px; overflow-wrap:anywhere; }
.pr-cover-page .pr-cover-disclaimer { margin-top:18px; padding-top:12px; font-size:7pt; line-height:1.4; color:var(--pr-muted); }
.pr-story-svg { width:100%; display:block; margin-top:10px; }.pr-center { text-align:center; }.pr-benefits { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }.pr-benefit { text-align:center; }.pr-benefit-icon { width:44px; height:44px; border-radius:50%; background:#E6EEF9; color:var(--pr-label); display:inline-flex; align-items:center; justify-content:center; margin-bottom:6px; font-size:20px; }.pr-benefit strong { display:block; font-size:10pt; }.pr-story-note { margin-top:24px; }
.pr-story-modern .pr-section-rule { margin-bottom:12px; }
.pr-built-for { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:16px; color:var(--pr-label); font-size:7pt; font-weight:700; letter-spacing:.12em; }
.pr-goal-pill { padding:3px 10px; border-radius:20px; background:#E6EEF9; color:var(--pr-head); font-size:8pt; letter-spacing:0; text-transform:none; }
.pr-story-modern .pr-story-svg { margin-top:4px; }
.pr-story-svg { height:3.05in; object-fit:contain; }
.pr-where { display:flex; align-items:center; gap:16px; padding:16px 18px; font-size:11pt; line-height:1.4; }
.pr-where > div:first-child { flex:1; min-width:0; }
.pr-next-milestone { flex:0 0 1.85in; display:flex; flex-direction:column; border-left:1px solid var(--pr-rule); padding-left:14px; font-size:8pt; color:var(--pr-muted); }
.pr-next-milestone strong { color:var(--pr-ink); font-size:10.5pt; }
.pr-story-modern .pr-subheading { margin:30px 0 14px; }
.pr-benefits-modern { gap:10px; }
.pr-benefits-four { grid-template-columns:repeat(4,minmax(0,1fr)); }
.pr-benefits-modern .pr-benefit { position:relative; display:flex; flex-direction:column; align-items:center; gap:3px; min-height:126px; padding:18px 12px 16px; border:1px solid var(--pr-cardline); border-radius:10px; }
.pr-benefits-modern .pr-benefit strong { font-size:10.5pt; }
.pr-benefits-modern .pr-benefit-goal { background:#F7FAFE; border-color:#9DB9E0; }
.pr-benefits-modern .pr-benefit-icon { margin-bottom:2px; }
.pr-goal-tab { position:absolute; top:-10px; left:50%; transform:translateX(-50%); white-space:nowrap; border-radius:12px; padding:2px 8px; color:#fff; background:var(--pr-label); font-size:6.5pt; font-weight:700; }
.pr-benefit-note { display:block; color:var(--pr-ink2); font-size:9pt; line-height:1.4; }
.pr-story-page .pr-story-note { margin-top:auto; }
.pr-story-modern:has(.pr-built-for) .pr-lead { font-size:11pt; }
.pr-story-modern:has(.pr-benefits-four) .pr-benefit-note { font-size:9pt; }
.pr-verdict { display:grid; grid-template-columns:2.1in 1fr; gap:22px; align-items:center; }.pr-headline { font-size:17pt; font-weight:700; line-height:1.25; margin:8px 0 0; }.pr-legend { display:flex; gap:18px; font-size:8.5pt; color:var(--pr-ink2); margin-bottom:6px; }.pr-legend i { display:inline-block; width:11px; height:11px; border-radius:2px; margin-right:5px; vertical-align:-1px; }.pr-as-sold { background:var(--pr-as-sold); }.pr-today { background:var(--pr-today); }.pr-comparison { display:grid; grid-template-columns:1.35in 1fr .95in; align-items:center; gap:12px; padding:13px 0; border-bottom:1px solid var(--pr-rule); }.pr-comparison:last-child { border-bottom:0; }.pr-comparison > strong { font-size:10.5pt; }.pr-bars { display:grid; gap:5px; }.pr-bar { display:flex; align-items:center; gap:8px; font-size:9pt; font-variant-numeric:tabular-nums; }.pr-bar i { height:13px; min-width:1px; border-radius:0 4px 4px 0; display:block; }.pr-bar span { white-space:nowrap; color:var(--pr-ink2); }.pr-status { text-align:right; }.pr-why { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }.pr-why .pr-card { padding:12px 14px; }.pr-why-icon { display:block; width:fit-content; font-size:15pt; line-height:1; font-weight:800; margin-bottom:6px; background:transparent; }.pr-why-icon.pr-positive { color:#1E8E5A; }.pr-why-icon.pr-watch { color:#B7791F; }.pr-why-icon.pr-neutral { color:#2F6DB5; }.pr-why strong { display:block; font-size:10pt; margin-bottom:2px; }.pr-why .pr-card > span:last-child { font-size:9pt; color:var(--pr-ink2); }.pr-source { margin-top:16px; }
.pr-summary-page .pr-section-rule { margin-bottom:16px; }
.pr-summary-page .pr-verdict { grid-template-columns:1.9in 1fr; gap:18px; }
.pr-summary-page .pr-subheading { margin:16px 0 8px; }
.pr-summary-page .pr-comparison { padding:16px 0; }
.pr-summary-page .pr-bars { gap:6px; }
.pr-summary-page .pr-bar i { height:15px; }
.pr-summary-page .pr-why .pr-card { padding:16px; }
.pr-summary-page .pr-why strong { font-size:10.5pt; }
.pr-summary-page .pr-why .pr-card > span:last-child { font-size:9.5pt; line-height:1.45; }
.pr-summary-page .pr-why-icon.pr-positive { font-size:0; height:15px; margin-bottom:8px; }
.pr-summary-page .pr-why-icon.pr-positive::before { content:""; display:block; width:11px; height:7px; border-left:3px solid currentColor; border-bottom:3px solid currentColor; transform:rotate(-45deg); }
.pr-summary-page .pr-source { margin-top:auto; }
.pr-protection-box { display:flex; border:1px solid var(--pr-cardline); border-radius:10px; overflow:hidden; }
.pr-protection-beneficiary { flex:0 0 1.9in; padding:10px 12px; background:var(--pr-card); border-right:1px solid var(--pr-cardline); }
.pr-protection-beneficiary strong { display:block; font-size:12pt; margin-top:3px; overflow-wrap:anywhere; }
.pr-protection-riders { min-width:0; flex:1; padding:10px 12px; }
.pr-protection-riders .pr-label { margin-bottom:5px; }
.pr-rider-list { columns:2; column-gap:12px; list-style:none; padding:0; margin:0; font-size:9pt; line-height:1.6; color:var(--pr-ink2); }
.pr-rider-list-three { columns:3; }
.pr-rider-list li { break-inside:avoid; page-break-inside:avoid; position:relative; padding-left:12px; margin-bottom:3px; overflow-wrap:anywhere; }
.pr-rider-list li::before { content:""; position:absolute; left:1px; top:4px; width:6px; height:4px; border-left:2px solid #1E8E5A; border-bottom:2px solid #1E8E5A; transform:rotate(-45deg); }
.pr-protection-box:not(:has(.pr-protection-beneficiary)) .pr-protection-riders { width:100%; }
.pr-protection-only-beneficiary .pr-protection-beneficiary { flex:1; display:flex; align-items:baseline; gap:12px; border:0; }
.pr-protection-only-beneficiary .pr-protection-beneficiary strong { margin:0; }
.pr-chart-caption { margin-left:auto; color:var(--pr-muted); }
.pr-projection { width:100%; height:2.45in; display:block; }
.pr-takeaway { margin-top:4px; }
.pr-next-heading { margin:26px 0 2px; font-size:10pt; font-weight:800; letter-spacing:.08em; color:var(--pr-head); }
.pr-next-intro { margin:0 0 12px; font-size:9.5pt; color:var(--pr-muted); }
.pr-action-headers { display:grid; grid-template-columns:.55in minmax(0,1fr) 2.15in; padding-bottom:6px; color:#2F6DB5; font-size:6.8pt; font-weight:700; letter-spacing:.14em; }
.pr-action-headers span:last-child { padding-left:19px; }
.pr-action-list { border-top:2px solid var(--pr-head); }
.pr-action-row { display:grid; grid-template-columns:.55in minmax(0,1fr) 2.15in; border-bottom:1px solid var(--pr-rule); break-inside:avoid; page-break-inside:avoid; }
.pr-action-rank { padding:12px 0; font-size:26pt; line-height:1; font-weight:800; color:var(--pr-head); }
.pr-action-body { min-width:0; padding:18px 20px 18px 0; overflow-wrap:anywhere; }
.pr-action-body strong { display:block; font-size:13pt; line-height:1.2; font-weight:800; }
.pr-action-body p { margin:5px 0 0; font-size:10pt; line-height:1.45; color:var(--pr-ink2); }
.pr-action-today { display:block; margin-top:7px; font-size:8pt; color:var(--pr-muted); }
.pr-action-panel { min-width:0; display:flex; flex-direction:column; justify-content:center; padding:18px 16px; border-left:3px solid var(--pr-label); background:#E6EEF9; overflow-wrap:anywhere; }
.pr-action-panel strong { font-size:10.5pt; line-height:1.35; color:var(--pr-head); }
.pr-review-date { display:flex; align-items:center; gap:9px; margin-top:20px; font-size:10pt; color:var(--pr-ink2); }
.pr-review-date svg { flex:none; color:var(--pr-label); }
.pr-review-date .pr-label { white-space:nowrap; }
.pr-scope { margin-top:auto; }
.pr-disclosure-page { box-sizing:border-box; width:8.5in; min-height:11in; padding:.75in; margin:0 auto 20px; background:#fff; font:10pt/1.5 Helvetica,Arial,sans-serif; color:#0F1E33; break-before:page; page-break-before:always; box-shadow:0 4px 24px #0002; -webkit-print-color-adjust:exact; print-color-adjust:exact; }.pr-disclosure-page h2 { color:#1F4E8C; font-size:20pt; border-bottom:3px solid #2B5C9E; padding-bottom:12px; margin:0 0 24px; }.pr-disclosure-page h3, .pr-disclosure-page h4 { color:#1F4E8C; font-size:12pt; margin:12px 0 6px; }.pr-disclosure-page .disclosure-tier { border:1px solid #D8DFEA; border-radius:8px; padding:18px; }.pr-disclosure-page p { margin:0 0 10px; }.pr-disclosure-page .disclosure-section { break-inside:avoid; page-break-inside:avoid; margin-bottom:14px; }.pr-disclosure-page .disclosure-copyright { border-top:1px solid #D8DFEA; padding-top:12px; margin-top:20px; font-size:8pt; text-align:center; }
.pr-show-bounds .pr-page { outline:2px solid #c00; outline-offset:-2px; }
.pr-show-bounds .pr-page-body { outline:1px dashed #c00; outline-offset:-1px; }
@media print { .pr-report .pr-page, .pr-disclosure-page { margin:0; box-shadow:none; } .pr-report { margin:0; } }
@media screen and (max-width:850px) { .pr-report { overflow-x:auto; } }

.pr-ribbon { position:absolute; top:0; left:0; right:0; text-align:center; font-size:7pt; font-weight:700; letter-spacing:.12em; padding:4px 0; color:#fff; z-index:2; }
.pr-ribbon-draft { background:#9a3412; } .pr-ribbon-sample { background:#334155; }
.pr-wm { position:absolute; top:46%; left:50%; transform:translate(-50%,-50%) rotate(-30deg); font-size:110pt; font-weight:800; color:rgba(15,23,42,.045); pointer-events:none; letter-spacing:.08em; z-index:1; }
.pr-keys { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); border:1px solid var(--pr-cardline); border-radius:10px; overflow:hidden; }
.pr-key { padding:12px 14px; border-left:1px solid var(--pr-cardline); background:var(--pr-card); }
.pr-key:first-child { border-left:0; }
.pr-key strong { display:block; font-size:15pt; line-height:1.15; margin:5px 0 3px; font-variant-numeric:tabular-nums; }
.pr-key span { display:block; font-size:8pt; color:var(--pr-muted); line-height:1.35; }
.pr-design-headline { font-size:15pt; font-weight:700; line-height:1.3; margin:0 0 16px; }
table.pr-values { width:100%; border-collapse:collapse; font-size:9.5pt; font-variant-numeric:tabular-nums; }
table.pr-values th, table.pr-values td { padding:7px 8px; border-bottom:1px solid var(--pr-rule); text-align:right; }
table.pr-values th:first-child, table.pr-values td:first-child { text-align:left; }
table.pr-values thead th { font-size:7pt; letter-spacing:.12em; text-transform:uppercase; color:var(--pr-label); font-weight:700; }
table.pr-values th.pr-g { border-bottom:3px solid var(--pr-head); } table.pr-values th.pr-ng { border-bottom:3px dashed var(--pr-today); }
table.pr-values td.pr-muted, .pr-muted { color:var(--pr-muted); }
.pr-rider-notes { list-style:none; margin:0; padding:0; display:grid; gap:6px; }
.pr-rider-notes li { display:grid; grid-template-columns:2.2in 1fr; gap:12px; font-size:9pt; line-height:1.4; border-bottom:1px solid var(--pr-rule); padding-bottom:6px; }
.pr-rider-notes li:last-child { border-bottom:0; }
.pr-rider-notes strong { font-size:9pt; }
.pr-rider-notes span { color:var(--pr-ink2); }
.pr-two { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.pr-basis { font-size:8.5pt; color:var(--pr-ink2); }
.pr-basis b { color:var(--pr-ink); }
`;
