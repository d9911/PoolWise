import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestPrisma } from "./helpers";
import { placeBet } from "@/server/modules/betting/betting.service";
import { resolveMarket } from "@/server/modules/markets/market.service";
import { toMinor } from "@/server/core/money";

const prisma = createTestPrisma();

describe("resolveMarket", () => {
  beforeAll(async () => {
    await prisma.$transaction([
      prisma.transaction.deleteMany(),
      prisma.bet.deleteMany(),
      prisma.market.deleteMany(),
      prisma.user.deleteMany()
    ]);

    const user = await prisma.user.create({
      data: { id: "resolve_user", username: "resolveuser", role: "USER" }
    });
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: "DEPOSIT",
        amountMinor: toMinor(100_000),
        idempotencyKey: "seed-resolve"
      }
    });

    await prisma.market.create({
      data: { id: "resolve_market", question: "Resolve?", status: "OPEN", rakeBps: 800 }
    });

    await placeBet({
      userId: "resolve_user",
      marketId: "resolve_market",
      side: "YES",
      amountMinor: toMinor(1_000),
      idempotencyKey: "resolve-bet"
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

  it("resolves single-side market and pays guaranteed amount", async () => {
    const result = await resolveMarket({
      marketId: "resolve_market",
      outcome: "YES",
      idempotencyKey: "resolve-test-1"
    });

    expect(result?.status).toBe("RESOLVED");
    expect(result?.outcome).toBe("YES");

    const payout = await prisma.transaction.findFirst({
      where: { type: "PAYOUT_RECEIVED", marketId: "resolve_market" }
    });
    expect(payout?.amountMinor).toBe(toMinor(1_415.38));

    const houseCover = await prisma.transaction.findFirst({
      where: { type: "HOUSE_COVERED", marketId: "resolve_market" }
    });
    expect(houseCover?.amountMinor).toBe(toMinor(495.38));
  });

  it("prevents repeated resolve", async () => {
    await expect(
      resolveMarket({
        marketId: "resolve_market",
        outcome: "YES",
        idempotencyKey: "resolve-test-2"
      })
    ).rejects.toThrow("Market is already resolved");
  });
});
