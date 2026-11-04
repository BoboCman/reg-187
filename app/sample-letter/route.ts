import { NextResponse } from "next/server";
import { buildLetterHtml } from "@/lib/policyplan/letter-html";
import { SAMPLE_BRANDING, SAMPLE_LETTER } from "@/lib/policyplan/sample-letter";

/** Public sample letter, linked from the landing page. Fictional case. */
export function GET() {
  const html = buildLetterHtml(SAMPLE_LETTER, SAMPLE_BRANDING, {
    date: "2026-10-20",
    preparedFor: "Eleanor and Thomas Whitfield, as grantors of the Whitfield Family Irrevocable Trust",
    approvedBy: "Jordan Ellis, CLU, ChFC",
    approvedAt: "2026-10-20",
    watermark: "SAMPLE",
  }).replace("<title>Recommendation letter</title>", "<title>Sample best-interest letter — PolicyPlan</title>");
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'",
    },
  });
}
