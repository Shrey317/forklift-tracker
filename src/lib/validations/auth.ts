import { z } from 'zod';

// Username format: lowercase, [a-z_]+ (Section 16's Validation Matrix).
// Deliberately doesn't check against the specific three seeded usernames
// here — an unrecognized-but-well-formed username still needs to flow
// through the real rate-limited lookup (Locked Decision #35), not get
// rejected early by validation in a way that could reveal format
// differences between "unknown format" and "unknown user."
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .regex(/^[a-z_]+$/, 'Invalid username format'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
