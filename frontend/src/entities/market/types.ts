export type MarketStatus = "OPEN" | "RESOLVED";
export type Outcome = "YES" | "NO";

export interface Market {
  id: string;
  question: string;
  status: MarketStatus;
  outcome: Outcome | null;
  rakeBps: number;
  initialYesProbBps: number;
  poolYesMinor: number;
  poolNoMinor: number;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  bets?: BetInMarket[];
  transactions?: TransactionInMarket[];
  odds?: Odds;
}

export interface Odds {
  yesMultiplier: number;
  noMultiplier: number;
  impliedYesProb: number;
}

export interface BetInMarket {
  id: string;
  userId: string;
  marketId: string;
  side: Outcome;
  amountMinor: number;
  user?: { username: string };
  createdAt: string;
}

export interface TransactionInMarket {
  id: string;
  userId: string | null;
  marketId: string | null;
  betId: string | null;
  type: string;
  amountMinor: number;
  createdAt: string;
}
