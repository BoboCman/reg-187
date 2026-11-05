import { NextResponse } from "next/server";
import { sampleStoryHtml } from "@/lib/companion/story-sample";

export const runtime = "nodejs";
export const dynamic = "force-static";

/** The fictional Apartment story, rendered through the real story pipeline. */
export async function GET() {
  return new NextResponse(sampleStoryHtml(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
    },
  });
}
