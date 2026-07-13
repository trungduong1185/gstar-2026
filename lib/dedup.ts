import { findApplicationByEmailSince } from "@/lib/application-store";
import { prisma } from "@/lib/prisma";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const EMAIL_TTL_MS = 24 * 60 * 60 * 1000;
const IDEMPOTENCY_KEY_MAX_LEN = 128;

export function sanitizeIdempotencyKey(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > IDEMPOTENCY_KEY_MAX_LEN) return null;
  return /^[a-zA-Z0-9._:-]+$/.test(trimmed) ? trimmed : null;
}

export async function findIdempotent(key: string): Promise<{ previousId: string } | null> {
  const entry = await prisma.idempotencyKey.findUnique({ where: { key } });
  if (!entry) return null;
  if (entry.expiresAt <= new Date()) {
    await prisma.idempotencyKey.delete({ where: { key } }).catch(() => undefined);
    return null;
  }
  return { previousId: entry.applicationId };
}

export async function rememberIdempotent(key: string, applicationId: string) {
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);
  await prisma.$transaction([
    prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
    prisma.idempotencyKey.upsert({
      where: { key },
      create: { key, applicationId, expiresAt },
      update: { applicationId, expiresAt }
    })
  ]);
}

export async function findRecentByEmail(email: string): Promise<{ previousId: string } | null> {
  if (!email) return null;
  const application = await findApplicationByEmailSince(email, new Date(Date.now() - EMAIL_TTL_MS));
  return application ? { previousId: application.id } : null;
}
