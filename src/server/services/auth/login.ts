import type { Prisma, PrismaClient, Role } from '@/generated/prisma/client';
import { DUMMY_HASH_FOR_TIMING_PARITY, verifyPassword } from './password';
import {
  IP_THRESHOLD,
  USERNAME_THRESHOLD,
  bumpThrottle,
  ipThrottleKey,
  peekThrottle,
  resetThrottle,
  usernameThrottleKey,
} from './rate-limit';
import { createSession } from './session';

export type LoginResult =
  | { outcome: 'success'; rawToken: string; expiresAt: Date; role: Role; userId: string }
  | { outcome: 'invalid_credentials' }
  | { outcome: 'rate_limited' };

/**
 * The full login flow from Section 21 / Locked Decisions #33, #35:
 *   1. Atomically check (and lazily reset) both throttle keys.
 *   2. If either is already at its threshold, reject WITHOUT checking the
 *      password — but still log the attempt.
 *   3. Verify credentials. An unknown username still runs a real scrypt
 *      derivation (against a fixed dummy hash) so the response takes the
 *      same time either way, and always returns the identical
 *      INVALID_CREDENTIALS result — never revealing which usernames exist.
 *   4. On failure: bump both throttle keys, log the attempt, return
 *      invalid_credentials.
 *   5. On success: reset only the username throttle (never the IP one),
 *      log the attempt, create the session, return it.
 * Everything happens inside one transaction, so a failure partway through
 * (e.g. session creation) rolls the throttle/attempt bookkeeping back too.
 */
export async function login(
  prisma: PrismaClient,
  username: string,
  password: string,
  ipAddress: string,
): Promise<LoginResult> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const usernameKey = usernameThrottleKey(username);
    const ipKey = ipThrottleKey(ipAddress);

    const [usernameCount, ipCount] = await Promise.all([
      peekThrottle(tx, usernameKey),
      peekThrottle(tx, ipKey),
    ]);

    if (usernameCount >= USERNAME_THRESHOLD || ipCount >= IP_THRESHOLD) {
      await tx.loginAttempt.create({
        data: { username, ipAddress, succeeded: false },
      });
      return { outcome: 'rate_limited' } as LoginResult;
    }

    const user = await tx.user.findUnique({ where: { username } });

    const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH_FOR_TIMING_PARITY);
    const valid = user !== null && passwordOk;

    if (!valid) {
      await bumpThrottle(tx, usernameKey);
      await bumpThrottle(tx, ipKey);
      await tx.loginAttempt.create({
        data: { username, ipAddress, succeeded: false },
      });
      return { outcome: 'invalid_credentials' } as LoginResult;
    }

    await resetThrottle(tx, usernameKey);
    await tx.loginAttempt.create({
      data: { username, ipAddress, succeeded: true },
    });

    const { rawToken, expiresAt } = await createSession(tx, user.id);

    return {
      outcome: 'success',
      rawToken,
      expiresAt,
      role: user.role,
      userId: user.id,
    } as LoginResult;
  });
}
