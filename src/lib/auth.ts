import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { getSessionCookieConfig, getSessionUser } from '@/server/services/auth/session';
import type { Role, User } from '@/generated/prisma/client';

/**
 * Thrown by requireRole() for BOTH "no valid session" and "wrong role."
 * The spec's error catalog (Section 20) defines INVALID_ROLE (403) for
 * "role isn't permitted for this action" but doesn't separately name a
 * code for "no session at all." Interpretive call, not an explicit
 * requirement: an absent/expired session has no role that could ever be
 * permitted, so it's treated as the same case, through the same single
 * check, returning the same INVALID_ROLE/403 — consistent with Section 21
 * describing requireRole() as one unified authorization checkpoint rather
 * than two different paths for "who are you" vs "are you allowed."
 */
export class AuthorizationError extends Error {
  constructor(message = 'Role not permitted for this action') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Resolves the current request's session cookie to a User, or null if
 * there isn't one, it doesn't match a session, or that session has
 * expired. Never trusts a stale cookie (Section 21) — the caller is
 * responsible for clearing the cookie when this returns null (a route
 * doesn't always need to, e.g. a read that just wants "logged in or not").
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies(); // Next.js 16 async request API (Section 3)
  const { name } = getSessionCookieConfig();
  const token = cookieStore.get(name)?.value;
  if (!token) return null;
  return getSessionUser(prisma, token);
}

/**
 * The single authorization checkpoint every API route calls (Section 21),
 * whether it mutates or not. Checks the caller's role against the
 * documented access column for that route (Section 19). Route handlers
 * call this first, before touching a service — never rely on proxy.ts or
 * a hidden UI button as a substitute (Section 17, Section 28).
 */
export async function requireRole(...allowedRoles: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError();
  if (!allowedRoles.includes(user.role)) throw new AuthorizationError();
  return user;
}
