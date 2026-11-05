import { NextRequest } from "next/server";
import * as svc from "@/lib/companion/service";
import { readJson, withProducer } from "@/lib/companion/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };

/** One page of the redacted illustration text, for the "View source" panel. */
export async function GET(request: NextRequest, { params }: P) {
  const { id } = await params;
  const page = Number(request.nextUrl.searchParams.get("page"));
  return withProducer(request, ({ store, userId }) => svc.sourcePage(store, userId, id, Number.isInteger(page) && page > 0 ? page : 0));
}
