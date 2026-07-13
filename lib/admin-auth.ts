const COOKIE_NAME = "gstar_admin_session";
const SESSION_AGE = 8 * 60 * 60;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || (process.env.NODE_ENV === "development" ? "gstar-local-development-session" : "");
}

function bytes(value: string) { return new TextEncoder().encode(value); }

async function signature(value: string) {
  const key = await crypto.subtle.importKey("raw", bytes(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, bytes(value));
  return Buffer.from(signed).toString("base64url");
}

export async function createAdminSession(username: string) {
  if (!secret()) throw new Error("Admin session secret is not configured");
  const payload = Buffer.from(JSON.stringify({ username, expiresAt: Date.now() + SESSION_AGE * 1000 })).toString("base64url");
  return `${payload}.${await signature(payload)}`;
}

export async function verifyAdminSession(token?: string) {
  if (!token || !secret()) return false;
  const [payload, provided] = token.split(".");
  if (!payload || !provided || provided !== await signature(payload)) return false;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).expiresAt > Date.now(); }
  catch { return false; }
}

export const adminCookie = { name: COOKIE_NAME, maxAge: SESSION_AGE };
