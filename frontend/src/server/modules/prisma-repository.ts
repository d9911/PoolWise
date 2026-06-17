import {
  Bet,
  Market,
  Transaction,
  User,
  Prisma,
} from '@prisma/client';
import { Outcome, TransactionType } from '@/shared/types';
import { balanceFromTransactions, signedAmount } from '@/server/core/money';
import type { TxClient } from '@/server/core/idempotency';
import {
  IBetRepository,
  IMarketRepository,
  ITransactionRepository,
  IUserRepository,
} from './repository';

/**
 * Production repository backed by Prisma + PostgreSQL.
 *
 * The `tx` parameter, when provided, scopes every query to the caller's
 * transaction. When null, a top-level client is used (read-only paths).
 */

export class PrismaBetRepository implements IBetRepository {
  constructor(private readonly client: Prisma.TransactionClient | PrismaClient) {}

  private resolve(tx: TxClient | null) {
    return tx ?? (this.client as Prisma.TransactionClient);
  }

  async findByIdempotencyKey(tx: TxClient | null, key: string): Promise<Bet | null> {
    return this.resolve(tx).bet.findUnique({ where: { idempotencyKey: key } });
  }

  async create(
    tx: TxClient | null,
    data: { userId: string; marketId: string; side: Outcome; amountMinor: number; idempotencyKey: string },
  ): Promise<Bet> {
    return this.resolve(tx).bet.create({ data });
  }

  async findByMarket(tx: TxClient | null, marketId: string): Promise<Bet[]> {
    return this.resolve(tx).bet.findMany({ where: { marketId }, orderBy: { createdAt: 'desc' } });
  }
}

export class PrismaMarketRepository implements IMarketRepository {
  constructor(private readonly client: Prisma.TransactionClient | PrismaClient) {}

  private resolve(tx: TxClient | null) {
    return tx ?? (this.client as Prisma.TransactionClient);
  }

  async findById(tx: TxClient | null, id: string): Promise<Market | null> {
    return this.resolve(tx).market.findUnique({ where: { id } });
  }

  async findOpen(tx: TxClient | null): Promise<Market[]> {
    return this.resolve(tx).market.findMany({ where: { status: 'OPEN' }, orderBy: { createdAt: 'desc' } });
  }

  async addToPool(tx: TxClient | null, marketId: string, side: Outcome, delta: number): Promise<Market> {
    const field = side === 'YES' ? 'poolYesMinor' : 'poolNoMinor';
    return this.resolve(tx).market.update({
      where: { id: marketId },
      data: { [field]: { increment: delta } },
    });
  }

  async markResolved(tx: TxClient | null, marketId: string, outcome: Outcome): Promise<Market> {
    return this.resolve(tx).market.update({
      where: { id: marketId },
      data: { status: 'RESOLVED', outcome, resolvedAt: new Date() },
    });
  }
}

export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private readonly client: Prisma.TransactionClient | PrismaClient) {}

  private resolve(tx: TxClient | null) {
    return tx ?? (this.client as Prisma.TransactionClient);
  }

  async findByIdempotencyKey(tx: TxClient | null, key: string): Promise<Transaction | null> {
    return this.resolve(tx).transaction.findUnique({ where: { idempotencyKey: key } });
  }

  async create(
    tx: TxClient | null,
    data: {
      userId: string | null;
      marketId: string | null;
      betId: string | null;
      type: TransactionType;
      amountMinor: number;
      idempotencyKey: string;
    },
  ): Promise<Transaction> {
    return this.resolve(tx).transaction.create({
      data: { ...data, amountMinor: signedAmount(data.type, data.amountMinor) },
    });
  }

  async findByUser(tx: TxClient | null, userId: string): Promise<Transaction[]> {
    return this.resolve(tx).transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByMarket(tx: TxClient | null, marketId: string): Promise<Transaction[]> {
    return this.resolve(tx).transaction.findMany({
      where: { marketId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly client: Prisma.TransactionClient | PrismaClient) {}

  private resolve(tx: TxClient | null) {
    return tx ?? (this.client as Prisma.TransactionClient);
  }

  async findById(tx: TxClient | null, id: string): Promise<User | null> {
    return this.resolve(tx).user.findUnique({ where: { id } });
  }

  async findByUsername(tx: TxClient | null, username: string): Promise<User | null> {
    return this.resolve(tx).user.findUnique({ where: { username } });
  }

  async balanceFor(tx: TxClient | null, userId: string): Promise<number> {
    const txs = await this.resolve(tx).transaction.findMany({
      where: { userId },
      select: { amountMinor: true },
    });
    return balanceFromTransactions(txs);
  }
}
