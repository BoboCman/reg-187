import { NextResponse, type NextRequest } from "next/server";

/** The old sample letter link now opens the sample companions. */
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/sample-companion", request.url), 308);
}
