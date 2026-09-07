import { z } from 'zod';
import { decimalField } from './decimal';

export const maintenanceStatusEnum = z.enum(['SCHEDULED', 'COMPLETED']);

export const createMaintenanceLogSchema = z.object({
  forkliftId: z.string().uuid('forkliftId must be a valid UUID'),
  date: z.string().date(), // Section 16: valid ISO 8601 date
  description: z.string().min(1, 'Description is required').max(500),
  costZar: decimalField({ min: 0 }).optional(),
  status: maintenanceStatusEnum.optional(), // defaults to SCHEDULED (schema default)
});
export type CreateMaintenanceLogInput = z.infer<typeof createMaintenanceLogSchema>;

export const updateMaintenanceLogSchema = z
  .object({
    description: z.string().min(1).max(500).optional(),
    costZar: decimalField({ min: 0 }).optional(),
    status: maintenanceStatusEnum.optional(),
    reason: z.string().max(1000).optional(),
  })
  .refine((data) => Object.keys(data).some((k) => k !== 'reason'), {
    message: 'At least one field must be provided to update.',
  });
export type UpdateMaintenanceLogInput = z.infer<typeof updateMaintenanceLogSchema>;

export const listMaintenanceLogsQuerySchema = z.object({
  forkliftId: z.string().uuid().optional(),
  status: maintenanceStatusEnum.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
});
export type ListMaintenanceLogsQuery = z.infer<typeof listMaintenanceLogsQuerySchema>;
