import type { NextConfig } from 'next';

// Section 41's non-nonce-dependent headers. CSP lives in proxy.ts instead
// (it needs a fresh nonce per request, which a static config file can't
// provide) — see the comment there for the full reasoning and the
// live-verification flag.

// Safe to apply to literally every path, including Next.js's own static
// asset chunks under /_next/static/* — none of these interact with
// caching, so there's no risk of accidentally breaking asset performance.
const GLOBAL_SECURITY_HEADERS = [
  // Only meaningful once the app is served exclusively over HTTPS
  // (Section 41) — harmless to set unconditionally, since it has no
  // effect on a plain HTTP connection anyway.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Equivalent to the CSP frame-ancestors 'none' set in proxy.ts — kept
  // as a second, independent layer since older browsers only understand
  // this header, not the CSP directive.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Belt-and-suspenders alongside the per-page `robots` metadata already
  // set in the root layout — this covers API JSON responses too, which
  // have no HTML <meta> tag to carry the same instruction.
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

// Deliberately NOT applied via a global '/:path*' matcher — Next.js's own
// static asset chunks (/_next/static/*) live under that same tree and
// MUST stay cacheable; a private/no-store default across everything would
// silently defeat their content-hashed, immutable caching and hurt real
// performance for no security benefit (a static JS bundle isn't
// sensitive). Scoped to the actual application routes instead — Section
// 41's intent ("nothing in this app belongs in a shared cache") is about
// application content, not the framework's own build output.
const NO_STORE_ROUTES = ['/', '/login', '/scan', '/dashboard', '/admin/:path*', '/forklift/:path*', '/api/:path*'];

// Camera access granted ONLY on the routes that actually use it (Section
// 24: /scan and /forklift/[code]/*) — every other browser feature this
// application never uses (microphone, geolocation, and the rest) is
// disabled everywhere.
const PERMISSIONS_POLICY_DEFAULT = 'camera=(), microphone=(), geolocation=(), interest-cohort=()';
const PERMISSIONS_POLICY_CAMERA_ALLOWED = 'camera=(self), microphone=(), geolocation=(), interest-cohort=()';

const nextConfig: NextConfig = {
  poweredByHeader: false, // Section 41: no reason to advertise the framework

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [...GLOBAL_SECURITY_HEADERS, { key: 'Permissions-Policy', value: PERMISSIONS_POLICY_DEFAULT }],
      },
      ...NO_STORE_ROUTES.map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      })),
      {
        source: '/scan',
        headers: [{ key: 'Permissions-Policy', value: PERMISSIONS_POLICY_CAMERA_ALLOWED }],
      },
      {
        source: '/forklift/:path*',
        headers: [{ key: 'Permissions-Policy', value: PERMISSIONS_POLICY_CAMERA_ALLOWED }],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false, // Temporary redirect because they might later be redirected to /admin/dashboard if logged in
      },
    ];
  },
};

export default nextConfig;
