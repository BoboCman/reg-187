import { NextRequest } from "next/server";
import * as svc from "@/lib/companion/service";
import { readJson, withProducer } from "@/lib/companion/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };

/** Receives the browser-redacted page text of the carrier PDF (never the PDF itself). */
export async function POST(request: NextRequest, { params }: P) {
  const { id } = await params;
  return withProducer(request, async ({ store, gateway, env, userId }) => {
    const c = await svc.submitIllustration(store, gateway, env, userId, id, await readJson(request));
    return { phase: c.companion_phase, revision: c.companion_revision };
  });
}
