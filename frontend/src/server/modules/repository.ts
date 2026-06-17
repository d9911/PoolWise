import {
  Bet,
  Market,
  Transaction,
  User,
  Prisma,
} from '@prisma/client';
import { Outcome, TransactionType, UserRole } from '@/shared/types';
import { balanceFromTransactions, signedAmount } from '@/server/core/money';
import type { TxClient } from '@/server/core/idempotency';

/**
 * Repository abstraction.
 *
 * Services depend on this interface, not on Prisma directly. There are two
 * implementations:
 *  - PrismaRepository (production, talks to PostgreSQL)
 *  - InMemoryRepository (used by the money/service unit tests so they run with
 *    zero infrastructure and exercise the real business rules)
 *
 * Both implementations expose the SAME primitive operations and both honour the
 * TxClient contract: writes performed through a `tx` are atomic.
 */

export interface IBetRepository {
  findByIdempotencyKey(tx: TxClient | null, key: string): Promise<Bet | null>;
  create(
    tx: TxClient | null,
    data: {
      userId: string;
      marketId: string;
      side: Outcome;
      amountMinor: number;
      idempotencyKey: string;
    },
  ): Promise<Bet>;
  findByMarket(tx: TxClient | null, marketId: string): Promise<Bet[]>;
}

export interface IMarketRepository {
  findById(tx: TxClient | null, id: string): Promise<Market | null>;
  findOpen(tx: TxClient | null): Promise<Market[]>;
  /** Atomically add `delta` to a pool field and return the updated market. */
  addToPool(
    tx: TxClient | null,
    marketId: string,
    side: Outcome,
    delta: number,
  ): Promise<Market>;
  markResolved(
    tx: TxClient | null,
    marketId: string,
    outcome: Outcome,
  ): Promise<Market>;
}

export interface ITransactionRepository {
  findByIdempotencyKey(tx: TxClient | null, key: string): Promise<Transaction | null>;
  create(
    tx: TxClient | null,
    data: {
      userId: string | null;
      marketId: string | null;
      betId: string | null;
      type: TransactionType;
      /** magnitude (non-negative); sign is derived from the type. */
      amountMinor: number;
      idempotencyKey: string;
    },
  ): Promise<Transaction>;
  findByUser(tx: TxClient | null, userId: string): Promise<Transaction[]>;
  findByMarket(tx: TxClient | null, marketId: string): Promise<Transaction[]>;
}

export interface IUserRepository {
  findById(tx: TxClient | null, id: string): Promise<User | null>;
  findByUsername(tx: TxClient | null, username: string): Promise<User | null>;
  balanceFor(tx: TxClient | null, userId: string): Promise<number>;
}

export interface Repositories {
  bets: IBetRepository;
  markets: IMarketRepository;
  transactions: ITransactionRepository;
  users: IUserRepository;
}
