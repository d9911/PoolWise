import { Prisma, PrismaClient } from '@prisma/client';
import { TransactionType, Outcome } from '@/shared/types';

/**
 * Idempotency layer.
 *
 * Strategy:
 *  - Every money-mutating operation carries a client-supplied `idempotencyKey`.
 *  - The DB enforces uniqueness on Bet.idempotencyKey and Transaction.idempotencyKey.
 *  - On replay we look up the prior result by key and return it instead of
 *    re-executing the side effects.
 *
 * This file also exposes a typed wrapper around Prisma's transaction callback so
 * the services can be written against an abstraction (TxClient) and tested with
 * an in-memory implementation when no DB is present.
 */

export type TxClient = Prisma.TransactionClient;

export interface PrismaPort {
  /**
   * Run `fn` inside a serializable-ish Prisma transaction. If `fn` throws, the
   * transaction rolls back. Returns fn's result.
   */
  $transaction<R>(fn: (tx: TxClient) => Promise<R>): Promise<R>;
}

/** Wrap a real PrismaClient so it satisfies PrismaPort. */
export function prismaPort(client: PrismaClient): PrismaPort {
  return {
    async $transaction<R>(fn: (tx: TxClient) => Promise<R>): Promise<R> {
      return client.$transaction(fn);
    },
  };
}

/**
 * Outcome of an idempotency check.
 *  - FRESH      -> proceed to execute the operation
 *  - REPLAY     -> return the previously stored result verbatim
 */
export type IdempotencyState = 'FRESH' | 'REPLAY';

export interface ReplayResult<T> {
  state: 'REPLAY';
  result: T;
}
export interface FreshResult {
  state: 'FRESH';
}
export type IdempotencyCheck<T> = ReplayResult<T> | FreshResult;

/** Re-export types used by the schemas/services for convenience. */
export { Prisma, TransactionType, Outcome };
