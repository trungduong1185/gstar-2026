import { NextResponse } from "next/server";
import { adminCookie, createAdminSession } from "@/lib/admin-auth";

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const now = Date.now();
  const current = attempts.get(ip);
  if (current && current.resetAt > now && current.count >= 5) return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const expectedUser = process.env.DASHBOARD_USER;
  const expectedPassword = process.env.DASHBOARD_PASSWORD;
  if (!expectedUser || !expectedPassword || !process.env.ADMIN_SESSION_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Admin authentication is not configured." }, { status: 503 });
  }
  if (username !== expectedUser || password !== expectedPassword) {
    attempts.set(ip, { count: (current?.resetAt || 0) > now ? current!.count + 1 : 1, resetAt: now + 15 * 60 * 1000 });
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }
  attempts.delete(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookie.name, await createAdminSession(username), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: adminCookie.maxAge });
  return response;
}
