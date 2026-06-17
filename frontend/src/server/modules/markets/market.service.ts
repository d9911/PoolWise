import { Outcome } from '@/shared/types';
import type { PrismaPort, TxClient } from '@/server/core/idempotency';
import type { Repositories } from '../repository';
import { Errors, isUniqueConstraintError } from '../errors';
import { settleMarket, type SettlementResult } from '@/server/core/payout-engine';
import type { ResolveResult } from '@/shared/types';

/**
 * Resolve a market — idempotent, transactional, fully audited via the ledger.
 *
 * Flow (all inside one DB transaction):
 *  1. Market must exist and still be OPEN (double-resolve -> 409).
 *  2. Idempotency: replay prior resolution by key.
 *  3. Load all bets; run the pure payout engine.
 *  4. Write ledger entries: PAYOUT_RECEIVED (winners), RAKE_COLLECTED (house),
 *     HOUSE_COVERED (house covers single-side shortfall, never cancels the bet).
 *  5. Mark market RESOLVED with outcome + resolvedAt.
 */
export interface ResolveInput {
  marketId: string;
  outcome: Outcome;
  idempotencyKey: string;
}

export interface ResolveDeps {
  port: PrismaPort;
  repos: Repositories;
}

const HOUSE_USERNAME = 'house';

export async function resolveMarket(
  input: ResolveInput,
  deps: ResolveDeps,
): Promise<ResolveResult> {
  const { port, repos } = deps;

  if (!input.marketId || !input.idempotencyKey) {
    throw Errors.validation('marketId and idempotencyKey are required.');
  }
  if (input.outcome !== 'YES' && input.outcome !== 'NO') {
    throw Errors.validation('outcome must be YES or NO.');
  }

  return port.$transaction(async (tx) => {
    const market = await repos.markets.findById(tx, input.marketId);
    if (!market) throw Errors.notFound(`Market ${input.marketId} not found.`);
    if (market.status === 'RESOLVED') throw Errors.marketAlreadyResolved(market.id);

    const house = await repos.users.findByUsername(tx, HOUSE_USERNAME);
    if (!house) throw Errors.unprocessable('House account is missing.');

    // Idempotency replay for resolve: if a RAKE_COLLECTED entry with this key
    // already exists, the market was already resolved by this exact call — but
    // because we also gate on status === RESOLVED above, a replay here means the
    // resolution finished. We surface a structured result.
    const priorRake = await repos.transactions.findByIdempotencyKey(tx, input.idempotencyKey);
    if (priorRake) {
      const fresh = await repos.markets.findById(tx, input.marketId);
      return toResolveResult(fresh!, []);
    }

    // Run the pure settlement.
    const allBets = await repos.bets.findByMarket(tx, market.id);
    const winners = allBets
      .filter((b) => b.side === input.outcome)
      .map((b) => ({ betId: b.id, userId: b.userId, amountMinor: b.amountMinor }));

    const settlement: SettlementResult = settleMarket(
      {
        outcome: input.outcome,
        rakeBps: market.rakeBps,
        initialYesProbBps: market.initialYesProbBps,
        pool: { poolYesMinor: market.poolYesMinor, poolNoMinor: market.poolNoMinor },
      },
      winners,
    );

    // Write payouts.
    for (const w of settlement.winners) {
      if (w.payoutMinor <= 0) continue;
      await repos.transactions.create(tx, {
        userId: w.userId,
        marketId: market.id,
        betId: w.betId,
        type: 'PAYOUT_RECEIVED',
        amountMinor: w.payoutMinor,
        idempotencyKey: `payout-${w.betId}`,
      });
    }

    // Rake to the house.
    if (settlement.rakeMinor > 0) {
      await repos.transactions.create(tx, {
        userId: house.id,
        marketId: market.id,
        betId: null,
        type: 'RAKE_COLLECTED',
        amountMinor: settlement.rakeMinor,
        idempotencyKey: input.idempotencyKey,
      });
    }

    // House covers any single-side shortfall.
    if (settlement.houseCoverMinor > 0) {
      await repos.transactions.create(tx, {
        userId: house.id,
        marketId: market.id,
        betId: null,
        type: 'HOUSE_COVERED',
        amountMinor: settlement.houseCoverMinor,
        idempotencyKey: `house-cover-${market.id}`,
      });
    }

    const resolved = await repos.markets.markResolved(tx, market.id, input.outcome);
    return toResolveResult(resolved, settlement.winners);
  });
}

function toResolveResult(
  market: { id: string; status: string; outcome: Outcome | null; resolvedAt: Date | null },
  winners: { betId: string; userId: string; payoutMinor: number }[],
): ResolveResult {
  return {
    success: true,
    marketId: market.id,
    status: market.status as 'OPEN' | 'RESOLVED',
    outcome: market.outcome,
    resolvedAt: market.resolvedAt ? market.resolvedAt.toISOString() : null,
    winners: winners.map((w) => ({ betId: w.betId, userId: w.userId, payoutMinor: w.payoutMinor })),
  };
}
