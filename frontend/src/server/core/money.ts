import { TransactionType } from '@/shared/types';

/**
 * Money utilities.
 *
 * RULE: money is NEVER stored or computed as a float. It is always an integer
 * count of "minor units" (the smallest currency unit). ₦1,000.00 == 100000.
 *
 * All arithmetic that could produce fractional minor units (shares, multipliers,
 * rake) is done with integer-friendly rounding helpers below so that the result
 * is deterministic and never drifts.
 */

export const MINOR_DECIMALS = 2;
export const MINOR_SCALE = 10 ** MINOR_DECIMALS; // 100

/** Currency symbol used across the UI. */
export const CURRENCY_SYMBOL = '₦';

/**
 * Convert a major-unit value (number or decimal string) into minor units.
 * Uses banker-safe rounding via scaled integer math to avoid 0.1+0.2 drift.
 */
export function toMinor(amount: number | string): number {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) {
    throw new Error(`toMinor: invalid amount "${String(amount)}"`);
  }
  // Round to 2 decimals first (scaled int), then scale to minor.
  const roundedToMajorCents = Math.round((n + Number.EPSILON) * MINOR_SCALE);
  const minor = Math.round(roundedToMajorCents);
  if (!Number.isSafeInteger(minor)) {
    throw new Error(`toMinor: amount out of safe integer range`);
  }
  return minor;
}

/**
 * Format minor units into a human readable string, e.g. 153333 => "₦1,533.33".
 * Negative values render with a leading minus, e.g. -100000 => "-₦1,000.00".
 */
export function formatMoney(minor: number, symbol: string = CURRENCY_SYMBOL): string {
  if (!Number.isInteger(minor)) {
    // Defensive: never silently round floats.
    throw new Error(`formatMoney: expected integer minor units, got ${minor}`);
  }
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const major = abs / MINOR_SCALE;
  const formatted = major.toLocaleString('en-US', {
    minimumFractionDigits: MINOR_DECIMALS,
    maximumFractionDigits: MINOR_DECIMALS,
  });
  return `${negative ? '-' : ''}${symbol}${formatted}`;
}

/** Add two minor values. */
export function addMinor(a: number, b: number): number {
  assertMinor(a);
  assertMinor(b);
  return a + b;
}

/** Subtract b from a. */
export function subMinor(a: number, b: number): number {
  assertMinor(a);
  assertMinor(b);
  return a - b;
}

/**
 * Multiply a minor value by an exact integer ratio `numerator / denominator`.
 * Preferred over float multipliers because it keeps everything in integer math
 * until the final (controlled) rounding step.
 *
 * Rounding modes:
 *  - 'floor'     -> truncate toward zero (favors the house, dust -> rake)
 *  - 'half-up'   -> round half away from zero (standard for final payouts)
 */
export function mulRatio(
  minor: number,
  numerator: number,
  denominator: number,
  mode: 'floor' | 'half-up' = 'floor',
): number {
  assertMinor(minor);
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    throw new Error('mulRatio: numerator/denominator must be integers');
  }
  if (denominator === 0) {
    throw new Error('mulRatio: division by zero');
  }
  const product = minor * numerator; // exact integer product (within safe range)
  if (mode === 'floor') {
    // Integer division truncating toward zero.
    return Math.trunc(product / denominator);
  }
  // half-up: add half of denominator (sign-aware) then truncate.
  const sign = product < 0 || denominator < 0 ? -1 : 1;
  const absProd = Math.abs(product);
  const absDen = Math.abs(denominator);
  return sign * Math.trunc((absProd + Math.trunc(absDen / 2)) / absDen);
}

/** Basis points helper: returns the bps fraction of `minor` (floored integer). */
export function takeBps(minor: number, bps: number, mode: 'floor' | 'half-up' = 'floor'): number {
  return mulRatio(minor, bps, 10_000, mode);
}

function assertMinor(n: number): void {
  if (!Number.isInteger(n)) {
    throw new Error(`Expected integer minor units, got ${n}`);
  }
}

/** Sign convention for ledger amounts by transaction type. */
const SIGNED_AMOUNT: Record<TransactionType, -1 | 1> = {
  DEPOSIT: 1,
  BET_PLACED: -1,
  PAYOUT_RECEIVED: 1,
  RAKE_COLLECTED: 1,
  HOUSE_COVERED: -1,
};

/**
 * Compute the signed ledger amount for a transaction type given a magnitude
 * (always a non-negative minor value). The sign is derived from the type.
 * This is the value that gets STORED in Transaction.amountMinor.
 *
 *   DEPOSIT         +magnitude  (user balance up)
 *   BET_PLACED      -magnitude  (user balance down)
 *   PAYOUT_RECEIVED +magnitude  (winner balance up)
 *   RAKE_COLLECTED  +magnitude  (house balance up)
 *   HOUSE_COVERED   -magnitude  (house balance down)
 */
export function signedAmount(type: TransactionType, magnitudeMinor: number): number {
  assertMinor(magnitudeMinor);
  if (magnitudeMinor < 0) {
    throw new Error('signedAmount: magnitude must be non-negative');
  }
  return SIGNED_AMOUNT[type] * magnitudeMinor;
}

/**
 * Balance is the source-of-truth and is simply the SUM of the stored (already
 * signed) ledger amounts for a user. No sign re-derivation needed here.
 */
export function balanceFromTransactions(
  txs: ReadonlyArray<{ amountMinor: number }>,
): number {
  return txs.reduce((sum, t) => {
    assertMinor(t.amountMinor);
    return sum + t.amountMinor;
  }, 0);
}
