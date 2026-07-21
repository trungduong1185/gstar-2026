import { NextResponse } from "next/server";
import { listUtmLinks, createUtmLink } from "@/lib/utm-links";
import { verifyAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

function sessionToken(request: Request) {
  return request.headers.get("cookie")?.match(/gstar_admin_session=([^;]+)/)?.[1];
}

export async function GET(request: Request) {
  const session = await verifyAdminSession(sessionToken(request));
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json(await listUtmLinks(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = await verifyAdminSession(sessionToken(request));
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  const label = typeof body.label === "string" ? body.label.trim().slice(0, 120) : "";
  const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : "https://summit.newturing.ai/gstar/";
  const source = typeof body.source === "string" ? body.source.trim().slice(0, 60) : "";
  const medium = typeof body.medium === "string" ? body.medium.trim().slice(0, 60) : "";
  const campaign = typeof body.campaign === "string" ? body.campaign.trim().slice(0, 120) : "";
  const content = typeof body.content === "string" ? body.content.trim().slice(0, 120) : "";
  const term = typeof body.term === "string" ? body.term.trim().slice(0, 120) : "";
  const shortCode = typeof body.shortCode === "string" ? body.shortCode.trim().slice(0, 20) : "";

  if (!label || !source || !medium || !campaign) {
    return NextResponse.json({ error: "Label, source, medium, and campaign are required." }, { status: 400 });
  }

  try {
    const link = await createUtmLink({ label, baseUrl, source, medium, campaign, content, term, shortCode });
    return NextResponse.json({ ok: true, link }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Database error";
    if (msg.includes("UNIQUE")) return NextResponse.json({ error: "Short code already in use." }, { status: 409 });
    return NextResponse.json({ error: "Unable to create link." }, { status: 500 });
  }
}
