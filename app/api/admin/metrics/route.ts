import { NextResponse } from "next/server";
import { computeMetrics, parseMetricsQuery } from "@/lib/metrics";

export const runtime = "nodejs";

/**
 * GET /api/admin/metrics
 * Query:
 *   range=7d|30d|90d|all      default 30d
 *   source=<utm_source>|all   default all
 *   model=first|last|linear|position   default last
 *
 * Auth: enforced by /proxy.ts middleware matcher on /api/admin/*.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = parseMetricsQuery(url.searchParams);
  try {
    const payload = await computeMetrics(query);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("metrics endpoint failed", error);
    return NextResponse.json({ error: "Unable to compute metrics." }, { status: 500 });
  }
}
