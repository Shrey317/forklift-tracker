import { ZodError } from 'zod';
import { headers } from 'next/headers';
import { AuthorizationError } from './auth';
import { reportError } from './monitoring';

/** Matches Section 20's error-code catalog exactly. */
export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_ROLE'
  | 'CSRF_REJECTED'
  | 'NOT_FOUND'
  | 'FORKLIFT_NOT_AVAILABLE'
  | 'SHIFT_ALREADY_ACTIVE'
  | 'SHIFT_ALREADY_COMPLETED'
  | 'FORKLIFT_HAS_ACTIVE_SHIFT'
  | 'INVALID_READING'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  INVALID_CREDENTIALS: 401,
  INVALID_ROLE: 403,
  CSRF_REJECTED: 403,
  NOT_FOUND: 404,
  FORKLIFT_NOT_AVAILABLE: 409,
  SHIFT_ALREADY_ACTIVE: 409,
  SHIFT_ALREADY_COMPLETED: 409,
  FORKLIFT_HAS_ACTIVE_SHIFT: 409,
  INVALID_READING: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

/** A known, intentional business-rule rejection — anything a route throws on purpose. */
export class ApiError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export function apiSuccess<T>(data: T, status = 200, extra?: Record<string, unknown>): Response {
  return Response.json({ data, ...extra }, { status });
}

function apiErrorResponse(code: ErrorCode, message: string): Response {
  return Response.json({ error: { code, message } }, { status: STATUS_BY_CODE[code] });
}

/**
 * The single place every route's catch block funnels through. Never
 * returns a stack trace, a raw Prisma/database error, a password hash, or
 * a session token (Section 19, MUST NOT #15) — anything not explicitly
 * recognized becomes a generic INTERNAL_ERROR, with the real error
 * captured server-side only, through the same monitoring seam every
 * other unexpected failure goes through (Section 38).
 */
export async function handleRouteError(error: unknown): Promise<Response> {
  if (error instanceof ApiError) {
    return apiErrorResponse(error.code, error.message);
  }
  if (error instanceof AuthorizationError) {
    return apiErrorResponse('INVALID_ROLE', error.message);
  }
  if (error instanceof ZodError) {
    return apiErrorResponse('VALIDATION_FAILED', 'Input failed validation.');
  }

  // Anything else — a Prisma error, a network hiccup, a genuine bug —
  // never reaches the client raw. requestId comes from proxy.ts, which
  // attaches it to every request (including API routes) before this ever
  // runs — one correlation ID a person can report and a developer can
  // trace, without every route having to generate and thread it through
  // by hand.
  let requestId: string | undefined;
  try {
    requestId = (await headers()).get('x-request-id') ?? undefined;
  } catch {
    // headers() can only be called within a request context; if that's
    // ever not the case, proceed without a requestId rather than fail
    // the whole error-handling path over a missing correlation ID.
  }

  reportError(error, { requestId });
  return apiErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred.');
}
