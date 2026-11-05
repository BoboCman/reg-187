import { NextRequest } from "next/server";
import * as svc from "@/lib/companion/service";
import { readJson, withProducer } from "@/lib/companion/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: P) {
  const { id } = await params;
  return withProducer(request, async ({ store, userId }) => {
    const c = await svc.saveBrief(store, userId, id, await readJson(request));
    return { phase: c.companion_phase, revision: c.companion_revision };
  });
}
