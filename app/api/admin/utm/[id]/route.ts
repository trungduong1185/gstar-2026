import { NextResponse } from "next/server";
import { updateUtmLink, deleteUtmLink } from "@/lib/utm-links";
import { verifyAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

function sessionToken(request: Request) {
  return request.headers.get("cookie")?.match(/gstar_admin_session=([^;]+)/)?.[1];
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await verifyAdminSession(sessionToken(request));
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  const update: { label?: string; source?: string; medium?: string; campaign?: string; content?: string; term?: string; active?: boolean } = {};
  if (typeof body.label === "string") update.label = body.label.trim().slice(0, 120);
  if (typeof body.source === "string") update.source = body.source.trim().slice(0, 60);
  if (typeof body.medium === "string") update.medium = body.medium.trim().slice(0, 60);
  if (typeof body.campaign === "string") update.campaign = body.campaign.trim().slice(0, 120);
  if (typeof body.content === "string") update.content = body.content.trim().slice(0, 120);
  if (typeof body.term === "string") update.term = body.term.trim().slice(0, 120);
  if (typeof body.active === "boolean") update.active = body.active;

  try {
    const link = await updateUtmLink(id, update);
    return NextResponse.json({ ok: true, link });
  } catch {
    return NextResponse.json({ error: "Unable to update link." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await verifyAdminSession(sessionToken(request));
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    await deleteUtmLink(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete link." }, { status: 500 });
  }
}
