/**
 * Thin glue between Next route handlers and service.ts: authenticates the
 * producer from the session cookie, builds the dependencies and maps
 * ServiceError / zod errors to JSON responses. No business rules here.
 */
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ServiceError } from "./service";
import { companionDeps } from "./supabase-store";

type Deps = NonNullable<ReturnType<typeof companionDeps>>;

export function errorResponse(err: unknown) {
  if (err instanceof ServiceError) return NextResponse.json({ error: err.code, detail: err.detail ?? null }, { status: err.status });
  if (err instanceof ZodError) return NextResponse.json({ error: "invalid_input", issues: err.issues.slice(0, 10).map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  console.error("[companion] unexpected error", err instanceof Error ? err.message : err);
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}

export async function withProducer(request: NextRequest, fn: (ctx: Deps & { userId: string }) => Promise<Response | unknown>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const deps = companionDeps(request.nextUrl.origin);
  if (!deps) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  try {
    const out = await fn({ ...deps, userId: user.id });
    return out instanceof Response ? out : NextResponse.json(out ?? { ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ServiceError("invalid_json", 400);
  }
}
