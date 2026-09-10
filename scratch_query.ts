import { PrismaClient } from './src/generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({ username: u.username, role: u.role, passwordHash: u.passwordHash })));
}

main().finally(() => prisma.$disconnect());
