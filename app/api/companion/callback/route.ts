import { NextRequest, NextResponse } from "next/server";
import * as svc from "@/lib/companion/service";
import { errorResponse } from "@/lib/companion/http";
import { companionDeps } from "@/lib/companion/supabase-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Signed results from the Companion n8n workflow.
 * Headers: x-companion-timestamp (unix seconds) and x-companion-signature
 * (hex HMAC-SHA256 of `${timestamp}.${rawBody}` with COMPANION_CALLBACK_SECRET).
 * Each job id is accepted once; stale or replayed jobs get 409.
 */
export async function POST(request: NextRequest) {
  const deps = companionDeps(request.nextUrl.origin);
  if (!deps) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 2_000_000) return NextResponse.json({ error: "too_large" }, { status: 413 });
  try {
    const r = await svc.handleCallback(deps.store, deps.env, raw, {
      timestamp: request.headers.get("x-companion-timestamp"),
      signature: request.headers.get("x-companion-signature"),
    });
    return NextResponse.json(r);
  } catch (err) {
    return errorResponse(err);
  }
}
