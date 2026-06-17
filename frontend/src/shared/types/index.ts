/**
 * Shared domain types.
 * These mirror the Prisma enums but live in `shared` so both client and server
 * (and the pure payout engine) can depend on them without pulling in Prisma.
 */

export type Outcome = 'YES' | 'NO';
export type MarketStatus = 'OPEN' | 'RESOLVED';
export type UserRole = 'USER' | 'ADMIN' | 'HOUSE';
export type TransactionType =
  | 'DEPOSIT'
  | 'BET_PLACED'
  | 'PAYOUT_RECEIVED'
  | 'RAKE_COLLECTED'
  | 'HOUSE_COVERED';

/** Money is ALWAYS represented as integer minor units (e.g. ₦1,000.00 => 100000). */
export type Minor = number;

export interface MoneyValue {
  minor: number;
  formatted: string;
}

/** A bet placed on a market. */
export interface BetDto {
  id: string;
  userId: string;
  marketId: string;
  side: Outcome;
  amountMinor: number;
  idempotencyKey: string;
  createdAt: string;
}

/** A ledger transaction (signed amount: credits +, debits -). */
export interface TransactionDto {
  id: string;
  userId: string | null;
  marketId: string | null;
  betId: string | null;
  type: TransactionType;
  amountMinor: number;
  idempotencyKey: string;
  createdAt: string;
}

export interface MarketDto {
  id: string;
  question: string;
  status: MarketStatus;
  outcome: Outcome | null;
  rakeBps: number;
  initialYesProbBps: number;
  poolYesMinor: number;
  poolNoMinor: number;
  totalPoolMinor: number;
  resolvedAt: string | null;
  createdAt: string;
}

export interface UserDto {
  id: string;
  username: string;
  role: UserRole;
  balanceMinor: number;
  balanceFormatted: string;
  recentTransactions: TransactionDto[];
}

/** Result of placing a bet. */
export interface PlaceBetResult {
  success: true;
  betId: string;
  balanceMinor: number;
  market: {
    id: string;
    poolYesMinor: number;
    poolNoMinor: number;
    totalPoolMinor: number;
  };
}

/** Result of resolving a market. */
export interface ResolveResult {
  success: true;
  marketId: string;
  status: MarketStatus;
  outcome: Outcome | null;
  resolvedAt: string | null;
  winners: { betId: string; userId: string; payoutMinor: number }[];
}

/** Standard API error envelope. */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = T | ApiError;

/** Error codes used across the API. */
export const ErrorCode = {
  VALIDATION: 'VALIDATION_ERROR',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  NOT_FOUND: 'NOT_FOUND',
  MARKET_NOT_OPEN: 'MARKET_NOT_OPEN',
  MARKET_ALREADY_RESOLVED: 'MARKET_ALREADY_RESOLVED',
  IDEMPOTENT_REPLAY: 'IDEMPOTENT_REPLAY',
  UNPROCESSABLE: 'UNPROCESSABLE',
  INTERNAL: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
