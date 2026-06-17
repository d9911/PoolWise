/**
 * Payout engine — pure functions for parimutuel settlement.
 *
 * This module contains the financially critical math of the whole product. It is
 * intentionally pure (no DB, no IO) so it can be exhaustively unit tested and so
 * the exact acceptance numbers from the brief are provable.
 *
 * Money conventions (see money.ts):
 *  - all amounts are integer minor units
 *  - bps = basis points (800 bps == 8%)
 *  - probBps = probability in basis points (6500 bps == 0.65)
 *
 * Two settlement modes:
 *  1. Parimutuel (both sides have liquidity) — winners share the net pool.
 *  2. Single-side guarantee (one side empty) — winner paid at a guaranteed
 *     multiplier derived from the market's implied probability, with the HOUSE
 *     covering any shortfall (never cancelling the bet).
 */

import { Outcome } from '@/shared/types';
import { mulRatio, takeBps } from './money';

export interface PoolSnapshot {
  poolYesMinor: number;
  poolNoMinor: number;
}

export interface SettlementInput {
  outcome: Outcome;
  rakeBps: number;
  /** Implied probability of YES in bps (used only for the single-side case). */
  initialYesProbBps: number;
  pool: PoolSnapshot;
}

export interface WinnerInput {
  betId: string;
  userId: string;
  amountMinor: number;
}

export interface WinnerSettlement {
  betId: string;
  userId: string;
  /** Gross payout to the winning user (includes their stake). */
  payoutMinor: number;
}

export interface SettlementResult {
  outcome: Outcome;
  /** true when the losing side had zero liquidity (single-side guarantee). */
  singleSide: boolean;
  /** Side that had liquidity. For single-side this is the winning side. */
  liquidSide: Outcome | null;
  poolYesMinor: number;
  poolNoMinor: number;
  totalPoolMinor: number;
  /** Rake retained by the house. */
  rakeMinor: number;
  /** Pool available to pay winners (totalPool - rake). */
  payoutPoolMinor: number;
  /** Sum actually paid to winners (before any house cover). */
  winnersPaidMinor: number;
  /** Shortfall the house had to cover (single-side only). */
  houseCoverMinor: number;
  winners: WinnerSettlement[];
}

/**
 * Decide which side carries liquidity given an outcome.
 * Returns null when BOTH sides have liquidity (pure parimutuel).
 */
export function detectSingleSide(pool: PoolSnapshot): Outcome | null {
  const yesEmpty = pool.poolYesMinor <= 0;
  const noEmpty = pool.poolNoMinor <= 0;
  if (yesEmpty && !noEmpty) return 'NO'; // only NO side funded
  if (!yesEmpty && noEmpty) return 'YES'; // only YES side funded
  return null; // both funded, or (edge) both empty
}

/**
 * Guaranteed multiplier used when only one side has liquidity.
 *
 *   guaranteedMultiplier = (1 / impliedProbability) * (1 - rake)
 *
 * Implemented as exact integer math:
 *   multiplier(numer/denom) = (10_000 - rakeBps) / (probBps)
 *   payout = amount * (10_000 - rakeBps) / probBps
 *
 * For the acceptance case (implied=0.65, rake=8%): multiplier = 9200/6500 = 1.4153846...
 * ₦1,000.00 -> 100000 minor -> 100000 * 9200 / 6500 = 141538 minor -> ₦1,415.38.
 */
export function guaranteedMultiplierBps(rakeBps: number, probBps: number): number {
  // Returns the multiplier scaled by 10_000 (i.e. 14153 bps == 1.4153x).
  return mulRatio(10_000, 10_000 - rakeBps, probBps, 'floor');
}

/**
 * Settle a market. Pure function — pass in the pool snapshot + winning bets,
 * get back every ledger amount needed.
 *
 * Rounding policy (documented, deterministic):
 *  - each winner's payout is floored to an integer minor value
 *    (favors the house; dust is NOT lost — it is folded into rake below)
 *  - for the single-side case the guaranteed payout is floored too; any dust is
 *    retained by the house (recorded as RAKE_COLLECTED implicitly via the
 *    leftover of payoutPool/houseCover accounting).
 */
export function settleMarket(input: SettlementInput, winners: WinnerInput[]): SettlementResult {
  const { outcome, rakeBps, initialYesProbBps, pool } = input;

  const totalPoolMinor = pool.poolYesMinor + pool.poolNoMinor;
  const rakeMinor = takeBps(totalPoolMinor, rakeBps, 'floor');
  const payoutPoolMinor = totalPoolMinor - rakeMinor;

  const singleSideLiquid = detectSingleSide(pool);

  if (singleSideLiquid === null && winners.length === 0) {
    // No winners and both sides empty/zero — nothing to pay. Still return a
    // well-formed result (e.g. a market resolved before any bets).
    return {
      outcome,
      singleSide: false,
      liquidSide: null,
      poolYesMinor: pool.poolYesMinor,
      poolNoMinor: pool.poolNoMinor,
      totalPoolMinor,
      rakeMinor,
      payoutPoolMinor,
      winnersPaidMinor: 0,
      houseCoverMinor: 0,
      winners: [],
    };
  }

  // ---- Single-side guarantee path -----------------------------------------
  if (singleSideLiquid !== null) {
    // The liquid side IS the winning side for this path to apply. If the liquid
    // side lost, winners is empty (they simply lose their stake — no payout).
    const liquidWon = singleSideLiquid === outcome;

    if (!liquidWon) {
      // Liquid side bet on the losing outcome: stake forfeited, no payout.
      return {
        outcome,
        singleSide: true,
        liquidSide: singleSideLiquid,
        poolYesMinor: pool.poolYesMinor,
        poolNoMinor: pool.poolNoMinor,
        totalPoolMinor,
        rakeMinor,
        payoutPoolMinor,
        winnersPaidMinor: 0,
        houseCoverMinor: 0,
        winners: [],
      };
    }

    // Liquid side won -> pay every winning bet at the guaranteed multiplier.
    // Implied prob corresponds to the winning (liquid) side.
    const probBps =
      singleSideLiquid === 'YES'
        ? initialYesProbBps
        : 10_000 - initialYesProbBps;

    // Multiplier numerator/denominator in integer form: (10_000 - rakeBps)/probBps
    const numer = 10_000 - rakeBps;
    const denom = probBps;

    const settled: WinnerSettlement[] = winners.map((w) => ({
      betId: w.betId,
      userId: w.userId,
      payoutMinor: mulRatio(w.amountMinor, numer, denom, 'floor'),
    }));

    const winnersPaidMinor = settled.reduce((s, w) => s + w.payoutMinor, 0);

    // The house must cover any payout exceeding the net pool available.
    // payoutPoolMinor here is just the collected stake minus rake.
    const shortfall = Math.max(0, winnersPaidMinor - payoutPoolMinor);

    return {
      outcome,
      singleSide: true,
      liquidSide: singleSideLiquid,
      poolYesMinor: pool.poolYesMinor,
      poolNoMinor: pool.poolNoMinor,
      totalPoolMinor,
      rakeMinor,
      payoutPoolMinor,
      winnersPaidMinor,
      houseCoverMinor: shortfall,
      winners: settled,
    };
  }

  // ---- Parimutuel path (both sides have liquidity) ------------------------
  // Winners share payoutPoolMinor proportionally to their stake in the winning
  // pool. Each payout is floored; any leftover dust folds into the rake.
  const winnerPoolMinor = winners.reduce((s, w) => s + w.amountMinor, 0);

  if (winnerPoolMinor <= 0) {
    return {
      outcome,
      singleSide: false,
      liquidSide: null,
      poolYesMinor: pool.poolYesMinor,
      poolNoMinor: pool.poolNoMinor,
      totalPoolMinor,
      rakeMinor,
      payoutPoolMinor,
      winnersPaidMinor: 0,
      houseCoverMinor: 0,
      winners: [],
    };
  }

  const settled: WinnerSettlement[] = winners.map((w) => ({
    betId: w.betId,
    userId: w.userId,
    payoutMinor: mulRatio(payoutPoolMinor, w.amountMinor, winnerPoolMinor, 'floor'),
  }));

  const winnersPaidMinor = settled.reduce((s, w) => s + w.payoutMinor, 0);
  // Dust from proportional flooring is retained by the house (added to rake).
  const dust = payoutPoolMinor - winnersPaidMinor;

  return {
    outcome,
    singleSide: false,
    liquidSide: null,
    poolYesMinor: pool.poolYesMinor,
    poolNoMinor: pool.poolNoMinor,
    totalPoolMinor,
    rakeMinor: rakeMinor + dust,
    payoutPoolMinor,
    winnersPaidMinor,
    houseCoverMinor: 0,
    winners: settled,
  };
}

/**
 * Implied probability of YES from current pools (for UI display).
 * Uses the standard parimutuel price: price_yes = total / yes, prob = 1/price.
 * With one empty side this falls back to the market's initial probability.
 */
export function impliedYesProbBps(pool: PoolSnapshot, fallbackYesProbBps: number): number {
  if (pool.poolYesMinor <= 0 || pool.poolNoMinor <= 0) {
    return fallbackYesProbBps;
  }
  const total = pool.poolYesMinor + pool.poolNoMinor;
  return mulRatio(total, pool.poolYesMinor, total, 'floor') === pool.poolYesMinor
    ? mulRatio(10_000, pool.poolYesMinor, total, 'floor')
    : Math.round((pool.poolYesMinor / total) * 10_000);
}
