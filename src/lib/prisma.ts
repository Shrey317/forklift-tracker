import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// A single shared client across hot-reloads in dev (Next.js dev server
// re-evaluates modules on change; without this, each reload would open a
// fresh pool against Postgres until connections are exhausted).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Prisma 7 requires a driver adapter for every database connection, no
    // exceptions (Section 18). DATABASE_URL is the pooled connection — used for
    // all runtime application queries. Migrations use DIRECT_URL instead, via
    // prisma.config.ts (Section 29's pooled/unpooled distinction).
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
