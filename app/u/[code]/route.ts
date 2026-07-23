import { NextResponse } from "next/server";
import { findByShortCode, incrementClicks } from "@/lib/utm-links";
import { withBasePath } from "@/lib/base-path";

export const runtime = "nodejs";
// Every request must run at request time — we log a click before redirecting.
export const dynamic = "force-dynamic";

/**
 * GET /u/{code}
 *
 * Public UTM short-link redirect. Marketing shares `.../u/abc` on ads/emails
 * instead of the long ?utm_source=…&utm_medium=…&utm_campaign=… URL. The
 * handler:
 *   1. looks up the short code (returning 404 for unknown / inactive links)
 *   2. increments the click counter on that link
 *   3. HTTP 307-redirects to the stored fullUrl (which already carries the
 *      UTM query string, so downstream attribution works exactly as if the
 *      user had clicked the long form)
 *
 * The click count is fire-and-forget: even if it fails we still redirect so
 * the visitor never sees an error.
 */
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code: raw } = await context.params;
  const code = raw?.trim();
  if (!code || code.length > 20 || !/^[a-zA-Z0-9._-]+$/.test(code)) {
    return notFound();
  }

  const link = await findByShortCode(code).catch(() => null);
  if (!link || !link.active) {
    return notFound();
  }

  // Fire-and-forget: do not await, do not block the redirect on the counter.
  incrementClicks(link.id).catch((error) => {
    console.error("Failed to increment UTM click", { code, id: link.id, error });
  });

  return NextResponse.redirect(link.fullUrl, { status: 307 });
}

function notFound() {
  const landing = new URL(withBasePath("/"), "https://summit.newturing.ai");
  return NextResponse.redirect(landing.toString(), { status: 302 });
}
