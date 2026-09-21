import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { neon, Pool } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || '';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // The pool has to be able to hold every in-flight interactive transaction at
  // once. Order placement holds a connection for the life of its transaction,
  // so a pool smaller than the concurrency target fails with "Unable to start a
  // transaction in the given time" long before the database is under any real
  // strain. KPI #6 asks for 20 concurrent orders; leave headroom above that.
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    max: Number(process.env.DB_POOL_MAX ?? 30),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 20_000,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const sql = databaseUrl ? neon(databaseUrl) : null;
export const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;

export default prisma;
