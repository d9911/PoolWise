# PoolWise — Prediction Market MVP

A small, production-like prototype of a parimutuel prediction market. Users bet YES/NO on an event, an admin resolves the market, winners are paid proportionally minus an 8% rake, and single-sided markets receive a guaranteed payout backed by the house.

## Status

✅ **Stable MVP.** All core logic tested. Docker full-stack working. Ready for HR review.

**Tests:** 8/8 passing.  
**Demo:** `make docker-up` → http://localhost:5179

## Live Demo

**Local Docker setup (recommended):**
```bash
make docker-up
```

Starts postgres + Next.js dev server.  
Opens on http://localhost:5179

## UI / design

The interface follows the xAI marketing-site language: a near-black canvas (`#0a0a0a`), white outline pills as the only interactive shape, Inter as the display/body face, and JetBrains Mono in uppercase for section eyebrows and metric labels. Cards sit on a charcoal fill (`#191919`) with a hairline border, and the system is mobile-first.

## What is implemented

- User balances tracked via a ledger (transactions), not a mutable `balance` field.
- YES/NO bets on markets.
- 8% rake deducted from the total pool before payouts.
- Parimutuel payout: winners split the payout pool proportionally to their stake.
- Single-side edge case: if only one side has bets, a guaranteed multiplier is used and the house covers the shortfall.
- Idempotency keys on every money-changing request to prevent double-spending.
- Prisma transactions so a bet or a resolution either fully commits or fully rolls back.
- Admin page to resolve markets.
- Mobile-first dark UI.
- Acceptance tests for the reference numbers in the brief.

## Tech stack

- Next.js 14 App Router
- TypeScript
- React + Tailwind CSS
- Redux Toolkit / RTK Query
- Prisma ORM
- PostgreSQL
- Docker + Docker Compose
- Vitest
- Zod for validation

## Money model

Money is stored as integer **minor units** (1 NGN = 100 kobo). Floats are never used for money calculations.

All money movements are recorded in the `Transaction` ledger:

- `DEPOSIT` — seed balance.
- `BET_PLACED` — negative amount, stake locked.
- `PAYOUT_RECEIVED` — winnings.
- `RAKE_COLLECTED` — house commission.
- `HOUSE_COVERED` — house top-up in the single-side case.

A user balance is the sum of their ledger rows.

## Payout formulas

### Normal parimutuel case

```
totalPool = yesPool + noPool
rake = totalPool * 8%
payoutPool = totalPool - rake
userPayout = payoutPool * (userStake / winningPool)
```

Reference check: YES ₦60k, NO ₦40k, rake 8%, outcome YES, a ₦1k YES bet pays **₦1,533.33**.

### Single-side case

When one side of the pool is empty, the winning bets are not cancelled. Instead:

```
multiplier = (1 / impliedProbability) * (1 - rake)
guaranteedPayout = stake * multiplier
```

For a ₦1k YES bet with implied probability 0.65 and rake 8%:

```
multiplier = (1 / 0.65) * 0.92 ≈ 1.415x
payout ≈ ₦1,415.38
```

If the payout exceeds the pool after rake, the difference is recorded as `HOUSE_COVERED`.

## Project structure

```
poolwise/
├── Makefile
├── docker-compose.yml
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── app/              # Next.js routes
│   │   ├── entities/         # Business entities (market, user, bet)
│   │   ├── features/         # User actions (place-bet, resolve-market)
│   │   ├── widgets/          # UI blocks (market-card, bet-panel, balance-card)
│   │   ├── pages-layer/      # Page compositions
│   │   ├── processes/        # Redux store / providers
│   │   ├── server/           # Core logic, modules, tests
│   │   └── shared/           # UI primitives, config, types
```

## How to run locally

### Requirements

- Node.js 20+
- PostgreSQL 15+ (or use Docker)

### 1. Install

```bash
make install
```

### 2. Set up the database

Copy `frontend/.env.example` to `frontend/.env` and set `DATABASE_URL`.

With PostgreSQL running locally:

```bash
cd frontend
npx prisma migrate dev
npm run seed
```

### 3. Run

```bash
make dev
```

Open http://localhost:5179.

### 4. Test

```bash
make test
```

## Run with Docker

```bash
make docker-up
make seed
make docker-logs
```

The app is at http://localhost:5179.

## Seed data

The seed creates:

- `alice`, `bob`, `carol` — ₦100,000 each.
- `admin` — admin role.
- `house` — system account.
- Market 1: "Will Team A win the final?" with YES ₦60,000 and NO ₦40,000.
- Market 2: "Will BTC close above $70k this month?" with a single YES ₦1,000 bet.

## API examples

### Place a bet

```bash
curl -X POST http://localhost:5179/api/bet \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_alice",
    "marketId": "market_1",
    "side": "YES",
    "amountMinor": 100000,
    "idempotencyKey": "example-bet-1"
  }'
```

### Resolve a market

```bash
curl -X POST http://localhost:5179/api/market/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "marketId": "market_1",
    "outcome": "YES",
    "idempotencyKey": "example-resolve-1"
  }'
```

### Get market / balance

```bash
curl http://localhost:5179/api/market/market_1
curl http://localhost:5179/api/user/user_alice/balance
```

## Tests

```bash
cd frontend
npm run test
```

Covered:

- Payout engine reference numbers.
- Single-side guaranteed payout and house cover.
- Bet placement, balance deduction, and idempotency.
- Market resolution, payout ledger entries, and repeated-resolve guard.

## Trade-offs

- No real auth or separate admin middleware. Roles are seeded; admin actions are simple buttons for the prototype.
- No real-time updates (WebSocket). RTK Query refetches on mutations.
- Single currency (NGN) hard-coded. Adding multi-currency is a matter of adding a `currency` column and a per-currency minor-unit factor.
- Rounding remainder is kept in the payout amount; the house cover absorbs the remainder in the single-side case.

## Video walkthrough

A 2–3 minute screen recording is included in the submission. It shows:

- the mobile UI;
- placing a bet;
- resolving a market;
- the test suite passing;
- the ledger and money logic.
