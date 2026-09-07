import { randomBytes, createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '@/generated/prisma/client';

const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12h absolute expiry (Section 21)

/**
 * Cookie name and attributes are environment-conditional, driven by
 * NODE_ENV rather than a manual toggle someone has to remember before
 * deploying (Section 21, fixed in v3.3). __Host- can't be set at all
 * without Secure, which plain http://localhost doesn't support, so local
 * dev uses a plain cookie name with Secure=false instead. HttpOnly,
 * SameSite=Lax, and Path=/ apply in both environments.
 */
export function getSessionCookieConfig() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    name: isProd ? '__Host-session' : 'session',
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS, // Max-Age=43200
    // No `domain` attribute set at all, in either environment — required
    // for __Host- in production, and kept consistent in dev so clearing
    // the cookie later can't be foiled by a mismatched attribute set.
  };
}

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Creates a session row and returns the RAW token to set as the cookie
 * value. Only the SHA-256 hash of that token is ever persisted (Locked
 * Decision #26) — reading the sessions table alone never yields a working
 * session, and the raw token is never stored or logged server-side.
 */
export async function createSession(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await tx.session.create({
    data: {
      tokenHash: hashToken(rawToken),
      userId,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
}

/**
 * Looks up a session by its raw cookie token (hashing it first — the DB
 * only ever stores the hash) and returns the associated user if the
 * session exists and hasn't expired. An expired or unmatched token
 * resolves to null; callers must treat that as fully unauthenticated and
 * clear the cookie, never trust a stale one (Section 21).
 */
export async function getSessionUser(prisma: PrismaClient, rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  return session.user;
}

/** Deletes a session by its raw cookie token — used on logout. */
export async function deleteSessionByToken(prisma: PrismaClient, rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

/** Deletes every session belonging to a user — used by password rotation, so a compromised credential doesn't leave old sessions valid. */
export async function deleteAllSessionsForUser(
  tx: Prisma.TransactionClient | PrismaClient,
  userId: string,
): Promise<void> {
  await tx.session.deleteMany({ where: { userId } });
}
