import 'dotenv/config';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/server/services/auth/password.js';
import { deleteAllSessionsForUser } from '../src/server/services/auth/session.js';

const MIN_PASSWORD_LENGTH = 16;

const ENV_VAR_BY_USERNAME: Record<string, string> = {
  admin: 'ADMIN_PASSWORD',
  supervisor: 'SUPERVISOR_PASSWORD',
  fuel_supervisor: 'FUEL_SUPERVISOR_PASSWORD',
};

function parseArgs(argv: string[]) {
  let account: string | null = null;
  let confirm = false;

  for (const arg of argv) {
    if (arg.startsWith('--account=')) {
      account = arg.slice('--account='.length);
    } else if (arg === '--confirm') {
      confirm = true;
    }
  }

  return { account, confirm };
}

async function main() {
  const { account, confirm } = parseArgs(process.argv.slice(2));

  if (!account) {
    console.error('Usage: pnpm db:rotate-password --account=<username> --confirm');
    console.error('  <username> must be one of: admin, supervisor, fuel_supervisor');
    process.exit(1);
  }
  if (!(account in ENV_VAR_BY_USERNAME)) {
    console.error(`Unknown account "${account}". Must be one of: admin, supervisor, fuel_supervisor`);
    process.exit(1);
  }
  if (!confirm) {
    // Requires the explicit flag so this can't be triggered by muscle
    // memory or a copy-pasted command (Section 21).
    console.error(`This will immediately invalidate all active sessions for "${account}".`);
    console.error('Re-run with --confirm to proceed.');
    process.exit(1);
  }

  const envVar = ENV_VAR_BY_USERNAME[account];
  if (!envVar) {
    // Unreachable given the `in` check above, but noUncheckedIndexedAccess
    // can't see that guarantee here — handle it explicitly rather than
    // asserting past it.
    console.error(`Unknown account "${account}".`);
    process.exit(1);
  }
  const newPassword = process.env[envVar];
  if (!newPassword) {
    console.error(`Set ${envVar} to the new password before running this command.`);
    process.exit(1);
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    console.error(`${envVar} does not meet the minimum length of ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.user.findUnique({ where: { username: account } });
    if (!user) {
      console.error(`No user row exists for "${account}" — run db:seed first.`);
      process.exit(1);
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      // Every existing session for this user is invalidated — a
      // compromised credential shouldn't leave old sessions valid after
      // the fix (Section 21).
      await deleteAllSessionsForUser(tx, user.id);
    });

    console.log(`[rotate-password] Rotated password for "${account}" and revoked all its sessions.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[rotate-password] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
