import 'dotenv/config';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/server/services/auth/password.js';

const MIN_PASSWORD_LENGTH = 16; // Section 21: "16+ characters, generated randomly"

// Usernames are fixed constants in code (Locked Decision #5) — not
// configurable, so there is nothing to seed for them. Only the three
// passwords come from the environment.
const ACCOUNTS: { username: string; role: Role; displayName: string; envVar: string }[] = [
  { username: 'admin', role: Role.ADMIN, displayName: 'Master Administrator', envVar: 'ADMIN_PASSWORD' },
  { username: 'supervisor', role: Role.SUPERVISOR, displayName: 'Supervisor', envVar: 'SUPERVISOR_PASSWORD' },
  {
    username: 'fuel_supervisor',
    role: Role.FUEL_SUPERVISOR,
    displayName: 'Fuel Supervisor',
    envVar: 'FUEL_SUPERVISOR_PASSWORD',
  },
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    for (const account of ACCOUNTS) {
      const password = process.env[account.envVar];

      if (!password) {
        throw new Error(`Missing required environment variable: ${account.envVar}`);
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        // Never echo the password itself into an error message or log.
        throw new Error(
          `${account.envVar} does not meet the minimum length of ${MIN_PASSWORD_LENGTH} characters.`,
        );
      }

      // Bootstrap-only: creates accounts that don't yet exist and leaves
      // existing ones alone (MUST NOT #23). Rotating a password is a
      // separate, explicit command (db:rotate-password), never this
      // script silently resetting it on a re-run.
      const existing = await prisma.user.findUnique({ where: { username: account.username } });
      if (existing) {
        console.log(`[seed] ${account.username} already exists — skipping (not overwritten).`);
        continue;
      }

      const passwordHash = await hashPassword(password);
      await prisma.user.create({
        data: {
          username: account.username,
          displayName: account.displayName,
          passwordHash,
          role: account.role,
        },
      });
      console.log(`[seed] Created ${account.username} (${account.role}).`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[seed] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
