import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestPrisma } from "./helpers";
import { placeBet } from "@/server/modules/betting/betting.service";
import { toMinor } from "@/server/core/money";

const prisma = createTestPrisma();

describe("placeBet", () => {
  beforeAll(async () => {
    await prisma.$transaction([
      prisma.transaction.deleteMany(),
      prisma.bet.deleteMany(),
      prisma.market.deleteMany(),
      prisma.user.deleteMany()
    ]);

    const user = await prisma.user.create({
      data: { id: "test_user", username: "testuser", role: "USER" }
    });
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: "DEPOSIT",
        amountMinor: toMinor(10_000),
        idempotencyKey: "seed-test"
      }
    });

    await prisma.market.create({
      data: { id: "test_market", question: "Test?", status: "OPEN", rakeBps: 800 }
    });
  });

  afterAll(async () => {
    await prisma.$transaction([
      prisma.transaction.deleteMany(),
      prisma.bet.deleteMany(),
      prisma.market.deleteMany(),
      prisma.user.deleteMany()
    ]);
    await prisma.$disconnect();
  });

  it("places a bet and deducts balance once", async () => {
    const result = await placeBet({
      userId: "test_user",
      marketId: "test_market",
      side: "YES",
      amountMinor: toMinor(1_000),
      idempotencyKey: "place-test-1"
    });

    expect(result.bet.amountMinor).toBe(toMinor(1_000));
    expect(result.balanceMinor).toBe(toMinor(9_000));
    expect(result.market?.poolYesMinor).toBe(toMinor(1_000));
  });

  it("is idempotent", async () => {
    const result1 = await placeBet({
      userId: "test_user",
      marketId: "test_market",
      side: "YES",
      amountMinor: toMinor(1_000),
      idempotencyKey: "place-test-idem"
    });

    const result2 = await placeBet({
      userId: "test_user",
      marketId: "test_market",
      side: "YES",
      amountMinor: toMinor(1_000),
      idempotencyKey: "place-test-idem"
    });

    expect(result1.bet.id).toBe(result2.bet.id);

    const balance = await prisma.transaction.aggregate({
      where: { userId: "test_user", type: "BET_PLACED" },
      _sum: { amountMinor: true }
    });
    expect(balance._sum.amountMinor).toBe(-toMinor(2_000));
  });
});
