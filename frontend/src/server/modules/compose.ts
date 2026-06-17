import { prisma } from '@/server/db/prisma';
import { prismaPort } from '@/server/core/idempotency';
import {
  PrismaBetRepository,
  PrismaMarketRepository,
  PrismaTransactionRepository,
  PrismaUserRepository,
} from './prisma-repository';
import type { Repositories } from './repository';

/**
 * Production composition root: wire the Prisma client into the repository
 * implementations and the transaction port used by the services.
 */
export function createPrismaDeps() {
  const repos: Repositories = {
    bets: new PrismaBetRepository(prisma),
    markets: new PrismaMarketRepository(prisma),
    transactions: new PrismaTransactionRepository(prisma),
    users: new PrismaUserRepository(prisma),
  };
  return { port: prismaPort(prisma), repos };
}

export type PrismaDeps = ReturnType<typeof createPrismaDeps>;
