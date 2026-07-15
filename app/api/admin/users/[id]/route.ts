import { NextResponse } from "next/server";
import { updateUser, deleteUser, userCount } from "@/lib/user-store";
import { hashPassword } from "@/lib/password";
import { verifyAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function sessionFrom(request: Request) {
  return verifyAdminSession(request.headers.get("cookie")?.match(/gstar_admin_session=([^;]+)/)?.[1]);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  // RBAC: admins may edit their own profile (name/email/password) but only
  // superadmins can touch other accounts or change role/active — otherwise a
  // regular admin could escalate to superadmin or lock others out.
  if (session.role !== "superadmin") {
    if (session.userId !== id) return NextResponse.json({ error: "Only superadmins can manage other user accounts." }, { status: 403 });
    if (body.role !== undefined || body.active !== undefined) {
      return NextResponse.json({ error: "Only superadmins can change roles or account status." }, { status: 403 });
    }
  }

  const update: { displayName?: string; email?: string; passwordHash?: string | null; role?: string; active?: boolean } = {};

  if (body.displayName !== undefined) {
    const v = text(body.displayName, 80);
    if (!v) return NextResponse.json({ error: "Display name cannot be empty." }, { status: 400 });
    update.displayName = v;
  }
  if (body.email !== undefined) {
    const v = text(body.email, 180).toLowerCase();
    if (!EMAIL_RE.test(v)) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    update.email = v;
  }
  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    update.passwordHash = await hashPassword(body.password);
  }
  if (body.role !== undefined) {
    update.role = body.role === "superadmin" ? "superadmin" : "admin";
  }
  if (body.active !== undefined) {
    if (session.userId === id && body.active === false) {
      return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
    }
    update.active = Boolean(body.active);
  }

  try {
    const user = await updateUser(id, update);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Database error";
    if (msg.includes("UNIQUE")) return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    return NextResponse.json({ error: "Unable to update user." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Only superadmins can delete user accounts." }, { status: 403 });
  }

  if (session.userId === id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const count = await userCount();
  if (count <= 1) {
    return NextResponse.json({ error: "Cannot delete the last remaining admin user." }, { status: 400 });
  }

  try {
    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete user." }, { status: 500 });
  }
}
