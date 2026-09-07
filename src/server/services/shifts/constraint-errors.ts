/**
 * Detects a violation of shifts_one_active_per_forklift — the partial
 * unique index from Locked Decision #25 — so it can be translated into a
 * clean SHIFT_ALREADY_ACTIVE response instead of a raw database error
 * (Section 19, 27).
 *
 * This constraint is hand-authored raw SQL, not a `@@unique` in
 * schema.prisma (deliberately — Section 18 avoids the partialIndexes
 * preview feature for the system's single most safety-critical
 * constraint). That means Prisma's generated client doesn't have this
 * constraint in its own metadata the way it would for a schema-declared
 * unique field. The spec's own text ("catch the resulting Prisma P2002")
 * describes the expected common case — Prisma maps ANY Postgres unique
 * violation (SQLSTATE 23505) to P2002 based on the raw driver error, not
 * on prior schema knowledge, so this should still work. But because this
 * exact path (a P2002 from a constraint absent from the schema) couldn't
 * be run end-to-end against a real generated client in the sandbox this
 * was built in, this checks multiple error shapes defensively rather than
 * assuming only one — confirm this against a real Prisma error object
 * once `prisma generate` can run, and simplify if the P2002 check alone
 * turns out to be sufficient.
 */
export function isShiftUniqueConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const err = error as {
    code?: unknown;
    meta?: { target?: unknown; constraint?: unknown };
    message?: unknown;
  };

  // Primary path: Prisma's own known-error code.
  if (err.code === 'P2002') {
    const target = err.meta?.target;
    if (target === undefined) return true; // P2002 with no identifiable target — treat conservatively as a match
    if (typeof target === 'string' && target.includes('shifts_one_active_per_forklift')) return true;
    if (Array.isArray(target) && target.some((t) => String(t).includes('shifts_one_active_per_forklift'))) {
      return true;
    }
    // A P2002 for some OTHER constraint entirely (shouldn't happen on the
    // shifts insert path today, but don't misclassify it as this one).
    return false;
  }

  // Defensive fallback: the raw Postgres error shape, confirmed directly
  // against this project's local database — code 23505
  // (unique_violation), constraint name shifts_one_active_per_forklift.
  if (err.code === '23505') {
    const constraint = err.meta?.constraint;
    if (typeof constraint === 'string' && constraint.includes('shifts_one_active_per_forklift')) return true;
    if (typeof err.message === 'string' && err.message.includes('shifts_one_active_per_forklift')) return true;
  }

  return false;
}
