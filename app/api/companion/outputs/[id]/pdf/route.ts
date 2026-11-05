import { NextRequest, NextResponse } from "next/server";
import * as svc from "@/lib/companion/service";
import { withProducer } from "@/lib/companion/http";
import { convertWithExternalAPI } from "@/lib/reports/pdfshift";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type P = { params: Promise<{ id: string }> };

/** US Letter PDF. ?kind=client requires approval and the firm release gate; otherwise a watermarked draft. */
export async function GET(request: NextRequest, { params }: P) {
  const { id } = await params;
  const kind = request.nextUrl.searchParams.get("kind") === "client" ? "client" : "preview";
  return withProducer(request, async ({ store, userId }) => {
    if (!process.env.PDF_API_KEY) return NextResponse.json({ error: "pdf_unavailable", detail: { message: "PDF service unavailable; open the page and use Print instead." } }, { status: 503 });
    const r = await svc.renderOutput(store, userId, id, kind);
    try {
      const pdf = await convertWithExternalAPI(r.html, undefined, undefined, { fullBleed: true, delay: 400 });
      const name = kind === "client" && r.artifact_id ? `Illustration-Companion-${r.artifact_id}.pdf` : `Illustration-Companion-DRAFT.pdf`;
      return new NextResponse(new Uint8Array(pdf), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" },
      });
    } catch (err) {
      console.error("[companion/pdf] conversion failed", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "pdf_failed", detail: { message: "Unable to generate the PDF; open the page and use Print instead." } }, { status: 502 });
    }
  });
}
