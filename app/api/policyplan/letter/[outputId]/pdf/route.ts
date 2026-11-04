import { NextRequest, NextResponse } from "next/server";
import { buildLetterHtml } from "@/lib/policyplan/letter-html";
import { loadLetterForUser, safeFileName } from "@/lib/policyplan/letter-access";
import { convertWithExternalAPI } from "@/lib/reports/pdfshift";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Branded PDF of the letter. Drafts are watermarked; approved letters are not. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ outputId: string }> }) {
  const { outputId } = await params;
  const ctx = await loadLetterForUser(outputId);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!process.env.PDF_API_KEY) {
    return NextResponse.json({ error: "PDF service unavailable; use Print instead." }, { status: 503 });
  }

  const final = ctx.output.status === "final";
  const html = buildLetterHtml(ctx.letter, ctx.branding, {
    date: (final ? ctx.output.adopted_at : ctx.output.completed_at) ?? new Date().toISOString(),
    preparedFor: ctx.preparedFor,
    draft: !final,
    approvedBy: final ? ctx.approvedByName : null,
    approvedAt: final ? ctx.output.adopted_at : null,
  });

  try {
    const pdf = await convertWithExternalAPI(html, undefined, undefined, { fullBleed: true, delay: 200 });
    const date = (ctx.output.adopted_at ?? ctx.output.completed_at ?? new Date().toISOString()).slice(0, 10);
    const name = `Recommendation-Letter-${safeFileName(ctx.preparedFor ?? "Client")}-${date}${final ? "" : "-DRAFT"}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[letter/pdf] conversion failed", err);
    return NextResponse.json({ error: "Unable to generate the PDF; use Print instead." }, { status: 502 });
  }
}
