import { Prisma } from '@/generated/prisma/client';

export const USERNAME_THRESHOLD = 5; // Locked Decision #33
export const IP_THRESHOLD = 20; // Locked Decision #35
const WINDOW_MINUTES = 15;

/**
 * Atomically reads the current failed-attempt count for a throttle key,
 * resetting it first if the window has expired — all in one
 * INSERT ... ON CONFLICT DO UPDATE, never a separate read-then-decide.
 * This is what Section 21 means by "atomically upsert the throttle row";
 * a bare SELECT-then-UPDATE here is exactly the race v3.2's changelog
 * called out as not actually atomic.
 */
export async function peekThrottle(
  tx: Prisma.TransactionClient,
  key: string,
): Promise<number> {
  const rows = await tx.$queryRaw<{ failed_count: number }[]>`
    INSERT INTO login_throttles (key, failed_count, window_start, updated_at)
    VALUES (${key}, 0, now(), now())
    ON CONFLICT (key) DO UPDATE SET
      failed_count = CASE
        WHEN login_throttles.window_start < now() - interval '${Prisma.raw(String(WINDOW_MINUTES))} minutes'
        THEN 0
        ELSE login_throttles.failed_count
      END,
      window_start = CASE
        WHEN login_throttles.window_start < now() - interval '${Prisma.raw(String(WINDOW_MINUTES))} minutes'
        THEN now()
        ELSE login_throttles.window_start
      END,
      updated_at = now()
    RETURNING failed_count
  `;
  return rows[0]?.failed_count ?? 0;
}

/** Atomically increments a throttle key's failed count on a failed login, resetting first if the window lapsed. */
export async function bumpThrottle(tx: Prisma.TransactionClient, key: string): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO login_throttles (key, failed_count, window_start, updated_at)
    VALUES (${key}, 1, now(), now())
    ON CONFLICT (key) DO UPDATE SET
      failed_count = CASE
        WHEN login_throttles.window_start < now() - interval '${Prisma.raw(String(WINDOW_MINUTES))} minutes'
        THEN 1
        ELSE login_throttles.failed_count + 1
      END,
      window_start = CASE
        WHEN login_throttles.window_start < now() - interval '${Prisma.raw(String(WINDOW_MINUTES))} minutes'
        THEN now()
        ELSE login_throttles.window_start
      END,
      updated_at = now()
  `;
}

/**
 * Resets a throttle key's failed count on a successful login. Only ever
 * called on the username:<username> key — the IP-level counter is
 * deliberately NOT reset by an individual success (Locked Decision #35),
 * since a shared office network's IP throttle shouldn't clear just because
 * one of many users behind it logged in correctly.
 */
export async function resetThrottle(tx: Prisma.TransactionClient, key: string): Promise<void> {
  await tx.$executeRaw`
    UPDATE login_throttles SET failed_count = 0, updated_at = now() WHERE key = ${key}
  `;
}

export function usernameThrottleKey(username: string): string {
  return `username:${username}`;
}

export function ipThrottleKey(ipAddress: string): string {
  return `ip:${ipAddress}`;
}

/**
 * Extracts the client IP from the platform's own trusted forwarded-IP
 * header, never a header a client could set itself (MUST NOT #24).
 * On Vercel, x-forwarded-for is set by Vercel's edge network and any
 * client-supplied value is overwritten before the request reaches this
 * function — that's what makes it trustworthy here. There is no
 * equivalent trusted signal in local development (no edge proxy in front
 * of `next dev`), so this falls back to a fixed loopback address locally;
 * that fallback must never ship as the production behavior.
 */
export function getTrustedClientIp(headers: Headers): string {
  if (process.env.NODE_ENV === 'production') {
    const forwardedFor = headers.get('x-forwarded-for');
    if (forwardedFor) {
      // Vercel sets this as a comma-separated list; the first entry is the
      // original client as seen by Vercel's own edge, which is the part we
      // trust — anything a downstream proxy appended after that isn't ours
      // to trust further.
      const first = forwardedFor.split(',')[0];
      if (first) return first.trim();
    }
    // No forwarded-IP header at all in production is unexpected on Vercel;
    // fail toward a shared bucket rather than an unthrottled one.
    return 'unknown';
  }
  return '127.0.0.1';
}
