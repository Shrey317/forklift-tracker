import { NextRequest, NextResponse } from 'next/server';

const PAGE_REDIRECT_PREFIXES = ['/dashboard', '/admin', '/scan', '/forklift'];

/**
 * Next.js 16 renamed middleware.ts to proxy.ts specifically to stop people
 * treating this file as a security boundary — it isn't one here, and
 * Section 21 is explicit about that. This only does a cheap, early
 * redirect for the common "no session cookie at all" case, purely for UX
 * (skip rendering a protected page just to bounce to /login). It does NOT
 * validate the session against the database, does NOT check role, and is
 * NOT what stops a wrong-role user from reaching something they shouldn't
 * — requireRole() inside every page and every API route is what actually
 * enforces that (Section 17, Section 21, Section 28's explicit test:
 * "UI hiding alone... is never treated as sufficient authorization").
 *
 * Also attaches a request-correlation ID (x-request-id) to every request,
 * including API routes — this is the one thing that genuinely benefits
 * from running here rather than per-route: every downstream handler and
 * every error report can pick the same ID up via headers() without each
 * route having to generate and thread it through individually.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = crypto.randomUUID();
  // A fresh nonce per request, base64-encoded per the CSP spec's own
  // expectation for nonce values. Next.js reads x-nonce from the request
  // headers and applies it automatically to the inline scripts IT
  // generates for hydration — this is what lets script-src avoid
  // 'unsafe-inline' (a real XSS-protection gap) without breaking
  // Next.js's own required inline scripts.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  requestHeaders.set('x-nonce', nonce);

  // Section 41's CSP, built here (not next.config.ts) specifically
  // because the nonce is per-request — next.config.ts's headers()
  // function is evaluated once at build/config time and can't embed a
  // fresh value per request. Every OTHER Section 41 header (HSTS,
  // X-Content-Type-Options, Referrer-Policy, Permissions-Policy,
  // Cache-Control, X-Robots-Tag) has no such constraint and lives in
  // next.config.ts instead, where static path-based rules are simpler to
  // read and maintain.
  //
  // FLAGGED FOR LIVE VERIFICATION: Section 41 itself warns "test the
  // deployed application against the real policy before trusting it — a
  // directive that's too strict breaks a feature silently." This is the
  // one header in the whole security set that genuinely needs that test
  // — the others (HSTS, nosniff, Permissions-Policy, etc.) are
  // mechanical and low-risk; CSP interacts with exactly how Next.js 16.3
  // hydrates, how the qr-scanner library loads its worker, and how
  // @react-pdf/renderer's client-side preview (if any) behaves, none of
  // which could be exercised in a browser in the sandbox this was built
  // in. Treat this as a strong starting point, not a verified-correct one.
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind ships static CSS, but Next.js itself injects some inline styles (font optimization); style-based XSS is a much narrower risk than script-src, so this is a deliberately lower bar than script-src, not an oversight
    `img-src 'self' data:`,
    `font-src 'self'`,
    `connect-src 'self'`, // add the monitoring provider's ingest domain here once one is chosen (Section 38)
    `worker-src 'self'`, // qr-scanner's decode worker
    `object-src 'none'`,
    `base-uri 'self'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
  ].join('; ');

  const isProtectedPage = PAGE_REDIRECT_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtectedPage) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieName = isProd ? '__Host-session' : 'session';

    if (!request.cookies.has(cookieName)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.headers.set('x-request-id', requestId);
      response.headers.set('Content-Security-Policy', csp);
      return response;
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('x-request-id', requestId);
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/scan/:path*', '/forklift/:path*', '/api/:path*'],
};
