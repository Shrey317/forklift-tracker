import { z } from 'zod';
import { decimalField } from './decimal';

export const startShiftSchema = z.object({
  forkliftId: z.string().uuid('forkliftId must be a valid UUID'),
  startingReading: decimalField({ min: 0 }), // Section 16: Required, >= 0
  notes: z.string().max(1000).optional(),
});
export type StartShiftInput = z.infer<typeof startShiftSchema>;

export const endShiftSchema = z.object({
  endingReading: decimalField({ min: 0 }), // Required on end, >= startingReading (checked in the service, not here — needs the shift's own data)
  notes: z.string().max(1000).optional(),
});
export type EndShiftInput = z.infer<typeof endShiftSchema>;

export const forceCloseShiftSchema = endShiftSchema; // same body shape (Section 19)

export const updateShiftSchema = z
  .object({
    startingReading: decimalField({ min: 0 }).optional(),
    endingReading: decimalField({ min: 0 }).optional(),
    notes: z.string().max(1000).optional(),
    reason: z.string().max(1000).optional(),
  })
  .refine((data) => Object.keys(data).some((k) => k !== 'reason'), {
    message: 'At least one field must be provided to update.',
  });
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;

export const listShiftsQuerySchema = z
  .object({
    forkliftId: z.string().uuid().optional(),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    status: z.enum(['ACTIVE', 'COMPLETED']).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: 'from must not be after to',
    path: ['from'],
  });
export type ListShiftsQuery = z.infer<typeof listShiftsQuerySchema>;
