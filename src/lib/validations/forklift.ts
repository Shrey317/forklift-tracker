import { z } from 'zod';

export const forkliftStatusEnum = z.enum(['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE']);

export const createForkliftSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(80, 'Name must be 80 characters or fewer'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  model: z.string().min(1, 'Model is required'),
});
export type CreateForkliftInput = z.infer<typeof createForkliftSchema>;

// PATCH body never includes status/endTime-style fields that could bypass
// a dedicated flow — but isActive IS listed here per Section 19's table.
// A true->false transition through this path runs the exact same
// open-shift check as the dedicated deactivate endpoint (see
// services/forklifts/set-active.ts) — Locked Decision #27 is an invariant
// on the STATE CHANGE itself, not a rule that only one specific route
// enforces.
export const updateForkliftSchema = z
  .object({
    name: z.string().min(3).max(80).optional(),
    manufacturer: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    status: forkliftStatusEnum.optional(),
    isActive: z.boolean().optional(),
    reason: z.string().max(1000).optional(), // audit-log reason capture (Section 19)
  })
  .refine((data) => Object.keys(data).some((k) => k !== 'reason'), {
    message: 'At least one field must be provided to update.',
  });
export type UpdateForkliftInput = z.infer<typeof updateForkliftSchema>;

// Business Rule 29: out-of-bounds page/pageSize is REJECTED
// (VALIDATION_FAILED), never silently clamped — z.max()/.min() reject
// rather than clamp, which is what that rule requires.
export const listForkliftsQuerySchema = z.object({
  search: z.string().max(100).optional(),
  status: forkliftStatusEnum.optional(),
  // Not itself named in Section 19's query params — added to resolve a
  // real tension: Business Rule 22 excludes deactivated forklifts from
  // lists "by default," but the Admin fleet-management page (Section 24)
  // has no other way to find a deactivated forklift to reactivate it.
  // Defaults to false, matching "excluded by default" literally, while
  // giving that page an explicit opt-in.
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((v) => v === 'true'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
});
export type ListForkliftsQuery = z.infer<typeof listForkliftsQuerySchema>;

export const lookupForkliftQuerySchema = z.object({
  code: z.string().min(1, 'code is required'), // the qrToken, per Section 24's identifier rules
});
