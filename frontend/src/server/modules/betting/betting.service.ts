import { Outcome } from '@/shared/types';
import type { PrismaPort, TxClient } from '@/server/core/idempotency';
import type { Repositories } from '../repository';
import { Errors, isUniqueConstraintError } from '../errors';
import type { PlaceBetResult } from '@/shared/types';

/**
 * Place a bet — safe, idempotent, transactional.
 *
 * Flow (all inside one DB transaction):
 *  1. Look up market; must exist and be OPEN.
 *  2. Idempotency: if a bet with this key exists, replay its result.
 *  3. Compute available balance from the ledger (source of truth).
 *  4. If insufficient -> 402 INSUFFICIENT_BALANCE (no write happens).
 *  5. Create Bet, create BET_PLACED ledger entry (signed negative), bump pool.
 *
 * The unique constraint on Bet.idempotencyKey is the LAST line of defense
 * against double-charging under concurrency: even if two requests race past the
 * balance check, only one insert succeeds and the loser rolls back.
 */
export interface PlaceBetInput {
  userId: string;
  marketId: string;
  side: Outcome;
  amountMinor: number;
  idempotencyKey: string;
}

export interface PlaceBetDeps {
  port: PrismaPort;
  repos: Repositories;
}

export async function placeBet(input: PlaceBetInput, deps: PlaceBetDeps): Promise<PlaceBetResult> {
  const { port, repos } = deps;

  // Basic input sanity (full Zod validation happens at the API boundary).
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw Errors.validation('amountMinor must be a positive integer.');
  }
  if (!input.userId || !input.marketId || !input.idempotencyKey) {
    throw Errors.validation('userId, marketId and idempotencyKey are required.');
  }

  return port.$transaction(async (tx) => {
    // 1. Market must exist and be open.
    const market = await repos.markets.findById(tx, input.marketId);
    if (!market) throw Errors.notFound(`Market ${input.marketId} not found.`);
    if (market.status !== 'OPEN') throw Errors.marketNotOpen(market.id);

    const user = await repos.users.findById(tx, input.userId);
    if (!user) throw Errors.notFound(`User ${input.userId} not found.`);

    // 2. Idempotency replay.
    const existing = await repos.bets.findByIdempotencyKey(tx, input.idempotencyKey);
    if (existing) {
      // Replay: recompute live balance + pools and return as if just placed.
      const balanceMinor = await repos.users.balanceFor(tx, input.userId);
      const fresh = await repos.markets.findById(tx, input.marketId);
      return {
        success: true,
        betId: existing.id,
        balanceMinor,
        market: {
          id: fresh!.id,
          poolYesMinor: fresh!.poolYesMinor,
          poolNoMinor: fresh!.poolNoMinor,
          totalPoolMinor: fresh!.poolYesMinor + fresh!.poolNoMinor,
        },
      };
    }

    // 3. Balance check against the ledger.
    const available = await repos.users.balanceFor(tx, input.userId);
    if (available < input.amountMinor) {
      throw Errors.insufficientBalance(available, input.amountMinor);
    }

    // 4. Create bet + ledger entry + bump pool.
    try {
      const bet = await repos.bets.create(tx, {
        userId: input.userId,
        marketId: input.marketId,
        side: input.side,
        amountMinor: input.amountMinor,
        idempotencyKey: input.idempotencyKey,
      });

      await repos.transactions.create(tx, {
        userId: input.userId,
        marketId: input.marketId,
        betId: bet.id,
        type: 'BET_PLACED',
        amountMinor: input.amountMinor,
        idempotencyKey: `bet-ledger-${bet.id}`,
      });

      const updated = await repos.markets.addToPool(tx, input.marketId, input.side, input.amountMinor);

      const balanceMinor = await repos.users.balanceFor(tx, input.userId);

      return {
        success: true,
        betId: bet.id,
        balanceMinor,
        market: {
          id: updated.id,
          poolYesMinor: updated.poolYesMinor,
          poolNoMinor: updated.poolNoMinor,
          totalPoolMinor: updated.poolYesMinor + updated.poolNoMinor,
        },
      };
    } catch (e) {
      if (isUniqueConstraintError(e)) {
        // Lost the idempotency race: replay instead of charging twice.
        const existing = await repos.bets.findByIdempotencyKey(tx, input.idempotencyKey);
        const balanceMinor = await repos.users.balanceFor(tx, input.userId);
        const fresh = await repos.markets.findById(tx, input.marketId);
        return {
          success: true,
          betId: existing!.id,
          balanceMinor,
          market: {
            id: fresh!.id,
            poolYesMinor: fresh!.poolYesMinor,
            poolNoMinor: fresh!.poolNoMinor,
            totalPoolMinor: fresh!.poolYesMinor + fresh!.poolNoMinor,
          },
        };
      }
      throw e;
    }
  });
}
