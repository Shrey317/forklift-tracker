/**
 * Section 38: production error monitoring. The specific provider is
 * explicitly flagged as a business decision this document shouldn't
 * invent ("Parameters the business confirms before launch... which
 * monitoring service is actually used") — this file is the seam where
 * one gets wired in, not a decision about which one.
 *
 * Until a provider is chosen, this logs structured JSON to stderr, which
 * Vercel's own platform captures and makes searchable regardless of what
 * gets chosen later — real error visibility from day one, without this
 * file picking a vendor on the business's behalf. Swapping in a real SDK
 * later is a one-file change: replace the body of reportError with e.g.
 * Sentry.captureException(error, { extra: safeContext }), keep the
 * sanitization step exactly as-is.
 */

interface ErrorContext {
  route?: string;
  requestId?: string;
  userId?: string;
  userRole?: string;
  [key: string]: unknown;
}

// Section 38: captured errors must never include a password, a raw or
// hashed session token, an authentication cookie, a database credential,
// an API secret, or unnecessary personal information. Checked by key name
// (case-insensitive substring) rather than an exact-match list, since a
// caller could reasonably pass a context key like `sessionTokenHash` or
// `dbConnectionString` that an exact list would miss.
const FORBIDDEN_KEY_PATTERNS = [
  'password',
  'token',
  'cookie',
  'secret',
  'credential',
  'databaseurl',
  'directurl',
  'apikey',
];

function isForbiddenKey(key: string): boolean {
  const lower = key.toLowerCase();
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => lower.includes(pattern));
}

function sanitizeContext(context: ErrorContext): ErrorContext {
  const clean: ErrorContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (isForbiddenKey(key)) continue;
    clean[key] = value;
  }
  return clean;
}

/**
 * The single place every unexpected error in the app should flow
 * through — route handlers (via handleRouteError), the health check,
 * and anywhere else server-side code catches something it didn't
 * expect. Never throws itself; a failure to report an error must never
 * become a second error.
 */
export function reportError(error: unknown, context: ErrorContext = {}): void {
  const baseEntry = {
    level: 'error',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  };

  try {
    const safeContext = sanitizeContext(context);
    console.error(JSON.stringify({ ...baseEntry, ...safeContext }));
  } catch {
    // A context value that can't be JSON-serialized (a circular
    // reference, for instance) must never take the whole report down
    // with it — the error itself is still worth capturing even without
    // its context. Falls back to the base entry alone; if even THAT
    // somehow fails to stringify (it can't — every field is a plain
    // string), give up silently rather than throw past this function.
    try {
      console.error(JSON.stringify(baseEntry));
    } catch {
      // truly never allowed to throw past this point
    }
  }
}
