import { prisma } from '@/lib/prisma';
import { reportError } from '@/lib/monitoring';

/**
 * Unauthenticated on purpose (Section 39) — hosting/monitoring
 * infrastructure (uptime checks, load balancers) needs to reach this
 * without a session. Never returns a stack trace, a database credential,
 * or another infrastructure detail — a failed DB check returns a generic
 * body, not the underlying error.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    // SELECT 1 confirms the app can actually reach and query the
    // database — not just that a connection object was constructed.
    await prisma.$queryRaw`SELECT 1`;

    return Response.json(
      {
        status: 'healthy',
        database: 'connected',
        latencyMs: Date.now() - startedAt,
      },
      {
        status: 200,
        // A cached "healthy" response defeats the entire point of
        // health-checking (Section 39).
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (error) {
    // The real error is never included in the response — logged
    // server-side only, through the same reportError path every other
    // unexpected failure goes through (Section 38).
    reportError(error, { route: '/api/health' });
    return Response.json(
      { status: 'unhealthy', database: 'unreachable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
