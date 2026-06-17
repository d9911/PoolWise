import "dotenv/config";
import { PrismaClient, Outcome, TransactionType, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const NGN = (n: number) => Math.round(n * 100); // minor units: 1 NGN = 100 kobo

async function main() {
  await prisma.transaction.deleteMany();
  await prisma.bet.deleteMany();
  await prisma.market.deleteMany();
  await prisma.user.deleteMany();

  const alice = await prisma.user.create({
    data: { id: "user_alice", username: "alice", role: UserRole.USER }
  });
  const bob = await prisma.user.create({
    data: { id: "user_bob", username: "bob", role: UserRole.USER }
  });
  const carol = await prisma.user.create({
    data: { id: "user_carol", username: "carol", role: UserRole.USER }
  });
  const admin = await prisma.user.create({
    data: { id: "user_admin", username: "admin", role: UserRole.ADMIN }
  });
  await prisma.user.create({
    data: { id: "user_house", username: "house", role: UserRole.HOUSE }
  });

  // Seed balances via deposits
  for (const user of [alice, bob, carol, admin]) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: TransactionType.DEPOSIT,
        amountMinor: NGN(100_000),
        idempotencyKey: `seed-deposit-${user.id}`
      }
    });
  }

  const market1 = await prisma.market.create({
    data: {
      id: "market_1",
      question: "Will Team A win the final?",
      status: "OPEN",
      rakeBps: 800,
      initialYesProbBps: 6500,
      poolYesMinor: 0,
      poolNoMinor: 0
    }
  });

  const market2 = await prisma.market.create({
    data: {
      id: "market_2",
      question: "Will BTC close above $70k this month?",
      status: "OPEN",
      rakeBps: 800,
      initialYesProbBps: 6500,
      poolYesMinor: 0,
      poolNoMinor: 0
    }
  });

  // Acceptance case: YES pool 60k, NO pool 40k, alice has 1k YES
  const yesBets = [
    { user: alice, amount: 1_000 },
    { user: bob, amount: 25_000 },
    { user: carol, amount: 19_000 },
    { user: bob, amount: 15_000 }
  ];
  const noBets = [
    { user: alice, amount: 10_000 },
    { user: bob, amount: 20_000 },
    { user: carol, amount: 10_000 }
  ];

  let idx = 0;
  for (const bet of yesBets) {
    await placeBetSeed(bet.user.id, market1.id, Outcome.YES, NGN(bet.amount), idx++);
  }
  for (const bet of noBets) {
    await placeBetSeed(bet.user.id, market1.id, Outcome.NO, NGN(bet.amount), idx++);
  }

  // Single-side case: alice YES 1k, NO pool empty
  await placeBetSeed(alice.id, market2.id, Outcome.YES, NGN(1_000), 0);

  const market1Final = await prisma.market.findUnique({ where: { id: market1.id } });
  console.log("Seeded successfully");
  console.log(`Market 1: YES ${market1Final?.poolYesMinor} NO ${market1Final?.poolNoMinor}`);
}

async function placeBetSeed(
  userId: string,
  marketId: string,
  side: Outcome,
  amountMinor: number,
  index: number
) {
  const idempotencyKey = `seed-${marketId}-${userId}-${side}-${index}`;
  await prisma.$transaction(async (tx) => {
    const existing = await tx.bet.findUnique({ where: { idempotencyKey } });
    if (existing) return;

    await tx.bet.create({
      data: { userId, marketId, side, amountMinor, idempotencyKey }
    });
    await tx.transaction.create({
      data: {
        userId,
        marketId,
        type: TransactionType.BET_PLACED,
        amountMinor: -amountMinor,
        idempotencyKey: `tx-${idempotencyKey}`
      }
    });
    await tx.market.update({
      where: { id: marketId },
      data:
        side === Outcome.YES
          ? { poolYesMinor: { increment: amountMinor } }
          : { poolNoMinor: { increment: amountMinor } }
    });
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
