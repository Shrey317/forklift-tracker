import { z } from 'zod';
import { decimalField } from './decimal';

export const createFuelLogSchema = z.object({
  forkliftId: z.string().uuid('forkliftId must be a valid UUID'),
  fuelAmountLiters: decimalField({ positive: true }), // Section 16: Required, > 0
  fuelCostZar: decimalField({ min: 0 }).optional(), // Optional; if present, >= 0
  readingAtRefuel: decimalField({ min: 0 }), // Required, >= 0
  notes: z.string().max(1000).optional(),
});
export type CreateFuelLogInput = z.infer<typeof createFuelLogSchema>;

export const updateFuelLogSchema = z
  .object({
    fuelAmountLiters: decimalField({ positive: true }).optional(),
    fuelCostZar: decimalField({ min: 0 }).optional(),
    readingAtRefuel: decimalField({ min: 0 }).optional(),
    notes: z.string().max(1000).optional(),
    reason: z.string().max(1000).optional(),
  })
  .refine((data) => Object.keys(data).some((k) => k !== 'reason'), {
    message: 'At least one field must be provided to update.',
  });
export type UpdateFuelLogInput = z.infer<typeof updateFuelLogSchema>;

export const listFuelLogsQuerySchema = z
  .object({
    forkliftId: z.string().uuid().optional(),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: 'from must not be after to',
    path: ['from'],
  });
export type ListFuelLogsQuery = z.infer<typeof listFuelLogsQuerySchema>;
