import { NextRequest } from "next/server";
import * as svc from "@/lib/companion/service";
import { readJson, withProducer } from "@/lib/companion/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: P) {
  const { id } = await params;
  return withProducer(request, async ({ store, gateway, env, userId }) => svc.requestAnalysis(store, gateway, env, userId, id, await readJson(request)));
}
