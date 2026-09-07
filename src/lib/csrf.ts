import { ApiError } from './errors';

/**
 * Every authenticated mutating request (POST, PATCH, DELETE) is checked
 * against the canonical APP_BASE_URL env var via Origin, falling back to
 * Referer if Origin is absent. Rejected with CSRF_REJECTED if the header
 * is absent, unparseable, or doesn't match (Locked Decision #36) —
 * deliberately checked against the env var, not a hardcoded or guessed
 * origin, so the check can't silently drift from what's actually deployed.
 * Applies to every mutating route, /api/auth/logout included.
 */
export function assertCsrfSafe(headers: Headers): void {
  const appBaseUrl = process.env.APP_BASE_URL;
  if (!appBaseUrl) {
    // Misconfigured deployment — fail closed rather than skip the check.
    throw new ApiError('CSRF_REJECTED', 'Origin/Referer could not be verified.');
  }

  const candidate = headers.get('origin') ?? headers.get('referer');
  if (!candidate) {
    throw new ApiError('CSRF_REJECTED', 'Origin/Referer header missing on a mutating request.');
  }

  let candidateOrigin: string;
  let expectedOrigin: string;
  try {
    candidateOrigin = new URL(candidate).origin;
    expectedOrigin = new URL(appBaseUrl).origin;
  } catch {
    throw new ApiError('CSRF_REJECTED', 'Origin/Referer header could not be parsed.');
  }

  if (candidateOrigin !== expectedOrigin) {
    throw new ApiError('CSRF_REJECTED', 'Origin/Referer did not match the expected application origin.');
  }
}
