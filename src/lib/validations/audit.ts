import { z } from 'zod';

export const listAuditLogQuerySchema = z
  .object({
    targetType: z.enum(['FORKLIFT', 'SHIFT', 'FUEL_LOG', 'MAINTENANCE_LOG']).optional(),
    targetId: z.string().uuid().optional(),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: 'from must not be after to',
    path: ['from'],
  });
export type ListAuditLogQuery = z.infer<typeof listAuditLogQuerySchema>;
