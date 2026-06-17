import {
  Bet,
  Market,
  Transaction,
  User,
} from '@prisma/client';
import { Outcome, TransactionType, UserRole } from '@/shared/types';
import { balanceFromTransactions, signedAmount } from '@/server/core/money';
import type { PrismaPort, TxClient } from '@/server/core/idempotency';
import {
  IBetRepository,
  IMarketRepository,
  ITransactionRepository,
  IUserRepository,
  Repositories,
} from './repository';

/**
 * In-memory repository + transaction port.
 *
 * This exists so the money/business services can be unit-tested end-to-end
 * WITHOUT a running PostgreSQL. It mirrors the exact semantics of the Prisma
 * implementation: idempotency uniqueness, atomic transactions (rollback on
 * throw), and balance computed from the ledger.
 *
 * It is NOT for production. Production uses prisma-repository.ts.
 */

// --- Lightweight Prisma-shaped row types (enough of the fields we use) -----

type MemoryUser = User;
type MemoryMarket = Market;
type MemoryBet = Bet;
type MemoryTransaction = Transaction;

export interface MemoryState {
  users: Map<string, MemoryUser>;
  markets: Map<string, MemoryMarket>;
  bets: Map<string, MemoryBet>;
  betsByKey: Map<string, MemoryBet>;
  transactions: Map<string, MemoryTransaction>;
  txByKey: Map<string, MemoryTransaction>;
}

export function createMemoryState(): MemoryState {
  return {
    users: new Map(),
    markets: new Map(),
    bets: new Map(),
    betsByKey: new Map(),
    transactions: new Map(),
    txByKey: new Map(),
  };
}

/** Seed helpers used by both the test harness and seed.ts-style fixtures. */
export function seedUser(
  state: MemoryState,
  id: string,
  username: string,
  role: UserRole = 'USER',
): MemoryUser {
  const now = new Date();
  const user: MemoryUser = {
    id,
    username,
    role,
    createdAt: now,
    updatedAt: now,
    // relations are not materialized in-memory
  } as MemoryUser;
  state.users.set(id, user);
  return user;
}

export function seedMarket(
  state: MemoryState,
  id: string,
  question: string,
  opts: {
    rakeBps?: number;
    initialYesProbBps?: number;
    poolYesMinor?: number;
    poolNoMinor?: number;
    status?: 'OPEN' | 'RESOLVED';
    outcome?: Outcome | null;
  } = {},
): MemoryMarket {
  const now = new Date();
  const market: MemoryMarket = {
    id,
    question,
    status: opts.status ?? 'OPEN',
    outcome: opts.outcome ?? null,
    rakeBps: opts.rakeBps ?? 800,
    initialYesProbBps: opts.initialYesProbBps ?? 6500,
    poolYesMinor: opts.poolYesMinor ?? 0,
    poolNoMinor: opts.poolNoMinor ?? 0,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  } as MemoryMarket;
  state.markets.set(id, market);
  return market;
}

export function seedDeposit(
  state: MemoryState,
  userId: string,
  amountMinor: number,
  idempotencyKey: string,
): MemoryTransaction {
  const tx: MemoryTransaction = {
    id: `tx-${idempotencyKey}`,
    userId,
    marketId: null,
    betId: null,
    type: 'DEPOSIT',
    amountMinor: signedAmount('DEPOSIT', amountMinor),
    idempotencyKey,
    createdAt: new Date(),
  } as MemoryTransaction;
  state.transactions.set(tx.id, tx);
  state.txByKey.set(tx.idempotencyKey, tx);
  return tx;
}

export function seedBet(
  state: MemoryState,
  input: {
    id: string;
    userId: string;
    marketId: string;
    side: Outcome;
    amountMinor: number;
    idempotencyKey: string;
  },
): { bet: MemoryBet; tx: MemoryTransaction } {
  const now = new Date();
  const bet: MemoryBet = {
    id: input.id,
    userId: input.userId,
    marketId: input.marketId,
    side: input.side,
    amountMinor: input.amountMinor,
    idempotencyKey: input.idempotencyKey,
    createdAt: now,
  } as MemoryBet;
  state.bets.set(bet.id, bet);
  state.betsByKey.set(bet.idempotencyKey, bet);

  const ledgerTx: MemoryTransaction = {
    id: `tx-${bet.id}`,
    userId: input.userId,
    marketId: input.marketId,
    betId: bet.id,
    type: 'BET_PLACED',
    amountMinor: signedAmount('BET_PLACED', input.amountMinor),
    idempotencyKey: `bet-ledger-${bet.id}`,
    createdAt: now,
  } as MemoryTransaction;
  state.transactions.set(ledgerTx.id, ledgerTx);
  state.txByKey.set(ledgerTx.idempotencyKey, ledgerTx);

  const m = state.markets.get(input.marketId);
  if (m) {
    if (input.side === 'YES') m.poolYesMinor += input.amountMinor;
    else m.poolNoMinor += input.amountMinor;
  }
  return { bet, tx: ledgerTx };
}

// --- In-memory repository implementations ----------------------------------

export class InMemoryBetRepository implements IBetRepository {
  constructor(private readonly state: MemoryState) {}

  async findByIdempotencyKey(_tx: TxClient | null, key: string): Promise<Bet | null> {
    return this.state.betsByKey.get(key) ?? null;
  }

  async create(
    _tx: TxClient | null,
    data: { userId: string; marketId: string; side: Outcome; amountMinor: number; idempotencyKey: string },
  ): Promise<Bet> {
    if (this.state.betsByKey.has(data.idempotencyKey)) {
      const err = new Error('Unique constraint failed on bet.idempotencyKey');
      (err as Error & { code?: string }).code = 'P2002';
      throw err;
    }
    const bet: MemoryBet = {
      id: `bet-${this.state.bets.size + 1}-${data.idempotencyKey}`,
      ...data,
      createdAt: new Date(),
    } as MemoryBet;
    this.state.bets.set(bet.id, bet);
    this.state.betsByKey.set(bet.idempotencyKey, bet);
    return bet;
  }

  async findByMarket(_tx: TxClient | null, marketId: string): Promise<Bet[]> {
    return [...this.state.bets.values()]
      .filter((b) => b.marketId === marketId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
}

export class InMemoryMarketRepository implements IMarketRepository {
  constructor(private readonly state: MemoryState) {}

  async findById(_tx: TxClient | null, id: string): Promise<Market | null> {
    return this.state.markets.get(id) ?? null;
  }

  async findOpen(_tx: TxClient | null): Promise<Market[]> {
    return [...this.state.markets.values()]
      .filter((m) => m.status === 'OPEN')
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  async addToPool(_tx: TxClient | null, marketId: string, side: Outcome, delta: number): Promise<Market> {
    const m = this.state.markets.get(marketId);
    if (!m) throw new Error(`Market ${marketId} not found`);
    if (side === 'YES') m.poolYesMinor += delta;
    else m.poolNoMinor += delta;
    m.updatedAt = new Date();
    return m;
  }

  async markResolved(_tx: TxClient | null, marketId: string, outcome: Outcome): Promise<Market> {
    const m = this.state.markets.get(marketId);
    if (!m) throw new Error(`Market ${marketId} not found`);
    m.status = 'RESOLVED';
    m.outcome = outcome;
    m.resolvedAt = new Date();
    m.updatedAt = new Date();
    return m;
  }
}

export class InMemoryTransactionRepository implements ITransactionRepository {
  constructor(private readonly state: MemoryState) {}

  async findByIdempotencyKey(_tx: TxClient | null, key: string): Promise<Transaction | null> {
    return this.state.txByKey.get(key) ?? null;
  }

  async create(
    _tx: TxClient | null,
    data: {
      userId: string | null;
      marketId: string | null;
      betId: string | null;
      type: TransactionType;
      amountMinor: number;
      idempotencyKey: string;
    },
  ): Promise<Transaction> {
    if (this.state.txByKey.has(data.idempotencyKey)) {
      const err = new Error('Unique constraint failed on transaction.idempotencyKey');
      (err as Error & { code?: string }).code = 'P2002';
      throw err;
    }
    const tx: MemoryTransaction = {
      id: `tx-${this.state.transactions.size + 1}-${data.idempotencyKey}`,
      ...data,
      amountMinor: signedAmount(data.type, data.amountMinor),
      createdAt: new Date(),
    } as MemoryTransaction;
    this.state.transactions.set(tx.id, tx);
    this.state.txByKey.set(tx.idempotencyKey, tx);
    return tx;
  }

  async findByUser(_tx: TxClient | null, userId: string): Promise<Transaction[]> {
    return [...this.state.transactions.values()]
      .filter((t) => t.userId === userId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  async findByMarket(_tx: TxClient | null, marketId: string): Promise<Transaction[]> {
    return [...this.state.transactions.values()]
      .filter((t) => t.marketId === marketId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
}

export class InMemoryUserRepository implements IUserRepository {
  constructor(private readonly state: MemoryState) {}

  async findById(_tx: TxClient | null, id: string): Promise<User | null> {
    return this.state.users.get(id) ?? null;
  }

  async findByUsername(_tx: TxClient | null, username: string): Promise<User | null> {
    return [...this.state.users.values()].find((u) => u.username === username) ?? null;
  }

  async balanceFor(_tx: TxClient | null, userId: string): Promise<number> {
    const txs = [...this.state.transactions.values()].filter((t) => t.userId === userId);
    return balanceFromTransactions(txs);
  }
}

/**
 * In-memory PrismaPort: supports a single nested transaction at a time. On throw
 * inside the callback it rolls the buffered changes back (deep clone snapshot).
 */
export class InMemoryPrismaPort implements PrismaPort {
  constructor(private readonly state: MemoryState) {}

  async $transaction<R>(fn: (tx: TxClient | null) => Promise<R>): Promise<R> {
    const snapshot = cloneState(this.state);
    try {
      // In memory we pass `null` as the TxClient since our repositories ignore
      // the tx param and operate directly on the shared state. The snapshot
      // gives us atomicity.
      return await fn(null);
    } catch (e) {
      restoreState(this.state, snapshot);
      throw e;
    }
  }
}

export function createInMemoryRepositories(state: MemoryState): Repositories {
  return {
    bets: new InMemoryBetRepository(state),
    markets: new InMemoryMarketRepository(state),
    transactions: new InMemoryTransactionRepository(state),
    users: new InMemoryUserRepository(state),
  };
}

// --- snapshot helpers ------------------------------------------------------

function cloneState(state: MemoryState): MemoryState {
  return {
    users: new Map([...state.users].map(([k, v]) => [k, { ...v }])),
    markets: new Map([...state.markets].map(([k, v]) => [k, { ...v }])),
    bets: new Map([...state.bets].map(([k, v]) => [k, { ...v }])),
    betsByKey: new Map([...state.betsByKey].map(([k, v]) => [k, v])),
    transactions: new Map([...state.transactions].map(([k, v]) => [k, { ...v }])),
    txByKey: new Map([...state.txByKey].map(([k, v]) => [k, v])),
  };
}

function restoreState(target: MemoryState, snapshot: MemoryState): void {
  target.users = snapshot.users;
  target.markets = snapshot.markets;
  target.bets = snapshot.bets;
  target.betsByKey = snapshot.betsByKey;
  target.transactions = snapshot.transactions;
  target.txByKey = snapshot.txByKey;
}
