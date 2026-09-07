import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const LOGIN_ATTEMPT_RETENTION_DAYS = 90; // Section 21

/**
 * Scheduled cleanup — never a business decision, purely operational
 * hygiene, and deliberately scoped to ONLY the two tables where that's
 * true: LoginAttempt (explicit 90-day retention, Section 21) and expired
 * Session rows (a session past its own expiresAt is dead weight, not a
 * record anyone needs). This script MUST NEVER touch Forklift, Shift,
 * FuelLog, MaintenanceLog, or AuditLogEntry — those are never
 * hard-deleted (Locked Decision #16) and audit-log retention is
 * explicitly a business decision this document declines to invent
 * (Section 40's "parameters the business confirms" list), not something
 * a cron job should ever decide on its own.
 */
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const cutoff = new Date(Date.now() - LOGIN_ATTEMPT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const deletedAttempts = await prisma.loginAttempt.deleteMany({
      where: { attemptedAt: { lt: cutoff } },
    });
    console.log(`[cleanup] Pruned ${deletedAttempts.count} login attempt(s) older than ${LOGIN_ATTEMPT_RETENTION_DAYS} days.`);

    const deletedSessions = await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    console.log(`[cleanup] Pruned ${deletedSessions.count} expired session(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[cleanup] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
