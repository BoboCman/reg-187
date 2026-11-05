import { NextResponse } from "next/server";
import { sampleHtml } from "@/lib/companion/sample-render";
import { SAMPLE_CASES } from "@/lib/companion/samples";

export const runtime = "nodejs";
export const dynamic = "force-static";

export function generateStaticParams() {
  return SAMPLE_CASES.map((s) => ({ key: s.key }));
}

/** A sample companion rendered through the real pipeline from a fictional fixture. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!SAMPLE_CASES.some((s) => s.key === key)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return new NextResponse(sampleHtml(key), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:",
    },
  });
}
