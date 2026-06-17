import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton.
 *
 * In dev Next.js hot-reloads modules, which would otherwise spawn a new Prisma
 * client per reload and exhaust DB connections. We stash the client on
 * `globalThis` to reuse it.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
