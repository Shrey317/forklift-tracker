import type { Prisma } from '@/generated/prisma/client';

/**
 * Allocates the next sequenceNumber/displayId pair for a new Forklift,
 * race-free, without ever computing displayId by counting rows or reading
 * a MAX() (Section 18 — the corrected v3.2 sequence, after the earlier
 * "create then update displayId" approach turned out to be impossible
 * against a @unique non-nullable column).
 *
 * Postgres's nextval() is atomic on its own: two concurrent callers can
 * never receive the same sequence value, so there's no window where a row
 * exists without a displayId and no second write ever needed.
 */
export async function allocateDisplayId(
  tx: Prisma.TransactionClient,
): Promise<{ sequenceNumber: number; displayId: string }> {
  // node-postgres returns BIGINT columns/expressions as strings, not
  // numbers or native JS bigint, specifically to avoid silently losing
  // precision above Number.MAX_SAFE_INTEGER — confirmed against a real
  // Postgres instance, not assumed. This sequence will never realistically
  // approach that range (~25 forklifts), so parsing to a regular number
  // here is safe and matches sequenceNumber's Int column type.
  const rows = await tx.$queryRaw<{ nextval: string }[]>`
    SELECT nextval('forklifts_sequence_number_seq')
  `;
  const raw = rows[0]?.nextval;
  if (!raw) {
    throw new Error('Failed to allocate a forklift sequence number.');
  }
  const sequenceNumber = Number.parseInt(raw, 10);
  const displayId = `FL-${String(sequenceNumber).padStart(3, '0')}`;
  return { sequenceNumber, displayId };
}
