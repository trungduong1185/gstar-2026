import { NextResponse } from "next/server";
import { listUsers, createUser } from "@/lib/user-store";
import { hashPassword } from "@/lib/password";
import { verifyAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function sessionFrom(request: Request) {
  return verifyAdminSession(request.headers.get("cookie")?.match(/gstar_admin_session=([^;]+)/)?.[1]);
}

export async function GET() {
  return NextResponse.json(await listUsers(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  // Only superadmins may create accounts — otherwise any admin could mint a
  // superadmin account and escalate their own privileges.
  if (session.role !== "superadmin") return NextResponse.json({ error: "Only superadmins can manage user accounts." }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  const username = text(body.username, 40);
  const displayName = text(body.displayName, 80);
  const email = text(body.email, 180).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role === "superadmin" ? "superadmin" : "admin";

  if (!USERNAME_RE.test(username)) return NextResponse.json({ error: "Username must be 3-40 chars (letters, digits, _.-)." }, { status: 400 });
  if (!displayName) return NextResponse.json({ error: "Display name is required." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const passwordHash = await hashPassword(password);

  try {
    const user = await createUser({ username, displayName, email, password: passwordHash, role });
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Database error";
    if (msg.includes("UNIQUE")) return NextResponse.json({ error: "Username or email already exists." }, { status: 409 });
    return NextResponse.json({ error: "Unable to create user." }, { status: 500 });
  }
}
