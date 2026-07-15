const COOKIE_NAME = "gstar_admin_session";
const SESSION_AGE = 8 * 60 * 60;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || (process.env.NODE_ENV === "development" ? "gstar-local-development-session" : "");
}

function bytes(value: string) { return new TextEncoder().encode(value); }

// Web Crypto only (no node:crypto): this module is imported by middleware,
// which runs on the Edge runtime where node:crypto is unavailable.
function hmacKey(usages: KeyUsage[]) {
  return crypto.subtle.importKey("raw", bytes(secret()), { name: "HMAC", hash: "SHA-256" }, false, usages);
}

async function signature(value: string) {
  const signed = await crypto.subtle.sign("HMAC", await hmacKey(["sign"]), bytes(value));
  return Buffer.from(signed).toString("base64url");
}

export type SessionPayload = { userId: string; username: string; role: string; expiresAt: number };

export async function createAdminSession(payload: { userId: string; username: string; role: string }) {
  if (!secret()) throw new Error("Admin session secret is not configured");
  const data: SessionPayload = { ...payload, expiresAt: Date.now() + SESSION_AGE * 1000 };
  const token = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${token}.${await signature(token)}`;
}

export async function verifyAdminSession(token?: string): Promise<SessionPayload | null> {
  if (!token || !secret()) return null;
  const [payload, provided] = token.split(".");
  if (!payload || !provided) return null;
  let providedSig: Uint8Array<ArrayBuffer>;
  try { providedSig = new Uint8Array(Buffer.from(provided, "base64url")); } catch { return null; }
  // subtle.verify performs a constant-time comparison internally.
  const valid = await crypto.subtle.verify("HMAC", await hmacKey(["verify"]), providedSig, bytes(payload));
  if (!valid) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    if (data.expiresAt <= Date.now()) return null;
    return data;
  } catch { return null; }
}

export const adminCookie = { name: COOKIE_NAME, maxAge: SESSION_AGE };
