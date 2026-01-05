/**
 * Prisma Client Instance
 *
 * Singleton database client for the main process.
 * Handles connection lifecycle and provides typed database access.
 */

import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

/**
 * Get the Prisma client instance (singleton).
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prisma;
}

/**
 * Initialize database connection.
 * Call this during app startup.
 */
export async function initDatabase(): Promise<void> {
  const client = getPrisma();
  await client.$connect();
  console.log('[Database] Connected successfully');
}

/**
 * Close database connection.
 * Call this during app shutdown.
 */
export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    console.log('[Database] Disconnected');
  }
}

/**
 * Execute a database transaction.
 */
export async function withTransaction<T>(
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return getPrisma().$transaction(fn);
}
