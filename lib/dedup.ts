import crypto from "node:crypto";
import { readApplications } from "@/lib/application-store";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;   // 24h
const EMAIL_TTL_MS = 24 * 60 * 60 * 1000;         // 24h — same-day duplicate window
const MAX_IDEMPOTENCY_KEYS = 5000;                 // cap in-memory growth
const IDEMPOTENCY_KEY_MAX_LEN = 128;

type Entry = { id: string; expiresAt: number };

const globalStore = globalThis as typeof globalThis & {
  gstarIdempotencyStore?: Map<string, Entry>;
};
const store = (globalStore.gstarIdempotencyStore ??= new Map<string, Entry>());

function evictExpired(now: number) {
  if (store.size < MAX_IDEMPOTENCY_KEYS && store.size < 500) return;
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
  if (store.size >= MAX_IDEMPOTENCY_KEYS) {
    // Hard cap: drop oldest half to bound memory even if attacker floods.
    const surplus = store.size - Math.floor(MAX_IDEMPOTENCY_KEYS / 2);
    const iterator = store.keys();
    for (let i = 0; i < surplus; i += 1) {
      const next = iterator.next();
      if (next.done) break;
      store.delete(next.value);
    }
  }
}

/**
 * Normalize + validate an idempotency key coming from the client.
 * Returns null when the value is missing or malformed.
 */
export function sanitizeIdempotencyKey(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > IDEMPOTENCY_KEY_MAX_LEN) return null;
  if (!/^[a-zA-Z0-9._:-]+$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Look up a previous application ID for the same idempotency key.
 * Returns { previousId } if this is a retry so the caller can respond 200.
 */
export function findIdempotent(key: string): { previousId: string } | null {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    store.delete(key);
    return null;
  }
  return { previousId: entry.id };
}

/**
 * Reserve an idempotency key for the newly created application.
 */
export function rememberIdempotent(key: string, applicationId: string) {
  const now = Date.now();
  evictExpired(now);
  store.set(key, { id: applicationId, expiresAt: now + IDEMPOTENCY_TTL_MS });
}

function hashEmail(email: string) {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/**
 * Look for a duplicate submission by email within the last EMAIL_TTL_MS.
 * Reads the NDJSON store on demand — acceptable because writes are append-only
 * and reads are already used by admin endpoints. Returns the previous ID
 * on match, otherwise null.
 */
export async function findRecentByEmail(email: string): Promise<{ previousId: string } | null> {
  if (!email) return null;
  const cutoff = Date.now() - EMAIL_TTL_MS;
  const target = hashEmail(email);
  const applications = await readApplications();
  // Scan newest-first for a cheap short-circuit on active submissions.
  for (let i = applications.length - 1; i >= 0; i -= 1) {
    const record = applications[i];
    const submittedAt = Date.parse(record.submittedAt);
    if (!submittedAt || submittedAt < cutoff) continue;
    if (hashEmail(record.email) === target) return { previousId: record.id };
  }
  return null;
}
