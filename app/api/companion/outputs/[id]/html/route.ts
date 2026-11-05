import { NextRequest, NextResponse } from "next/server";
import * as svc from "@/lib/companion/service";
import { withProducer } from "@/lib/companion/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };

/** The page runs no script; fonts and inline styles only. */
const COMPANION_CSP = "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; frame-ancestors 'self'";

/** ?kind=preview (watermarked, any draft) or ?kind=client (approved + firm release gate). */
export async function GET(request: NextRequest, { params }: P) {
  const { id } = await params;
  const kind = request.nextUrl.searchParams.get("kind") === "client" ? "client" : "preview";
  return withProducer(request, async ({ store, userId }) => {
    const r = await svc.renderOutput(store, userId, id, kind);
    return new NextResponse(r.html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "Content-Security-Policy": COMPANION_CSP, "X-Content-Type-Options": "nosniff" },
    });
  });
}
