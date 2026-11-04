import { NextRequest, NextResponse } from "next/server";
import { buildLetterHtml } from "@/lib/policyplan/letter-html";
import { loadLetterForUser } from "@/lib/policyplan/letter-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Print view of the letter (fallback when the PDF service is unavailable). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ outputId: string }> }) {
  const { outputId } = await params;
  const ctx = await loadLetterForUser(outputId);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const final = ctx.output.status === "final";
  let html = buildLetterHtml(ctx.letter, ctx.branding, {
    date: (final ? ctx.output.adopted_at : ctx.output.completed_at) ?? new Date().toISOString(),
    preparedFor: ctx.preparedFor,
    draft: !final,
    approvedBy: final ? ctx.approvedByName : null,
    approvedAt: final ? ctx.output.adopted_at : null,
  });
  if (request.nextUrl.searchParams.get("print") === "1") {
    html = html.replace("</body>", "<script>window.addEventListener('load',()=>window.print())</script></body>");
  }
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
    },
  });
}
