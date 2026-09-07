import { z } from 'zod';

/**
 * A decimal-valued input field (readings, costs, amounts). Accepts either
 * a JSON number or a string from the client, and normalizes to a
 * validated decimal string — matching Locked Decision #29's string
 * convention on the way OUT by applying the same discipline on the way
 * IN, rather than trusting a raw JSON float for a value that gets
 * persisted to a DECIMAL column and later summed across reports.
 */
export function decimalField(opts: { min?: number; positive?: boolean } = {}) {
  return z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .refine((v) => /^-?\d+(\.\d+)?$/.test(v), { message: 'Must be a valid decimal number' })
    .refine((v) => !opts.positive || Number(v) > 0, { message: 'Must be greater than 0' })
    .refine(
      (v) => opts.min === undefined || Number(v) >= opts.min,
      { message: `Must be ${opts.min} or greater` },
    );
}
