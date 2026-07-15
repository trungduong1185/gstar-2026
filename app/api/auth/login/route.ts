import { NextResponse } from "next/server";
import { adminCookie, createAdminSession } from "@/lib/admin-auth";
import { findUserByCredentials, touchLastLogin } from "@/lib/user-store";
import { verifyPassword } from "@/lib/password";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const now = Date.now();
  const current = attempts.get(ip);
  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  if (!process.env.ADMIN_SESSION_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Admin authentication is not configured." }, { status: 503 });
  }

  const user = await findUserByCredentials(username);
  const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;

  if (user?.active && passwordOk) {
    attempts.delete(ip);
    await touchLastLogin(user.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(adminCookie.name, await createAdminSession({ userId: user.id, username: user.username, role: user.role }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: adminCookie.maxAge });
    return response;
  }

  attempts.set(ip, { count: (current?.resetAt || 0) > now ? current!.count + 1 : 1, resetAt: now + WINDOW_MS });
  return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
}
