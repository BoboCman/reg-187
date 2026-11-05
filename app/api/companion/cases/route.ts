import { NextRequest } from "next/server";
import * as svc from "@/lib/companion/service";
import { readJson, withProducer } from "@/lib/companion/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Creates an Illustration Companion case. Body: case meta (jurisdiction, optional non-identifying label). */
export async function POST(request: NextRequest) {
  return withProducer(request, async ({ store, userId }) => {
    const c = await svc.createCase(store, userId, await readJson(request));
    return { id: c.id };
  });
}
