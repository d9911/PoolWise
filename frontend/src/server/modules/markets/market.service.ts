import { prisma } from "@/server/db/prisma";
import { calculatePayouts } from "@/server/core/payout-engine";
import type { ResolveMarketInput } from "./market.schemas";
import type { Side } from "@/server/core/money";

export class MarketAlreadyResolvedError extends Error {
  constructor() {
    super("Market is already resolved.");
    this.name = "MarketAlreadyResolvedError";
  }
}

export async function resolveMarket(input: ResolveMarketInput) {
  const existing = await prisma.transaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey }
  });

  if (existing) {
    return prisma.market.findUnique({ where: { id: input.marketId } });
  }

  const market = await prisma.market.findUnique({
    where: { id: input.marketId },
    include: { bets: true }
  });

  if (!market) throw new Error("Market not found");
  if (market.status === "RESOLVED") throw new MarketAlreadyResolvedError();

  const bets = market.bets.map((b) => ({
    id: b.id,
    userId: b.userId,
    side: b.side as Side,
    amountMinor: b.amountMinor
  }));

  const result = calculatePayouts(
    input.outcome,
    market.poolYesMinor,
    market.poolNoMinor,
    market.rakeBps,
    market.initialYesProbBps,
    bets
  );

  await prisma.$transaction(async (tx) => {
    for (const payout of result.payouts) {
      await tx.transaction.create({
        data: {
          userId: payout.userId,
          marketId: input.marketId,
          betId: payout.betId,
          type: "PAYOUT_RECEIVED",
          amountMinor: payout.amountMinor,
          idempotencyKey: `${input.idempotencyKey}-payout-${payout.betId}`
        }
      });
    }

    await tx.transaction.create({
      data: {
        marketId: input.marketId,
        type: "RAKE_COLLECTED",
        amountMinor: result.rakeAmountMinor,
        idempotencyKey: `${input.idempotencyKey}-rake`
      }
    });

    if (result.houseCoverMinor > 0) {
      await tx.transaction.create({
        data: {
          marketId: input.marketId,
          type: "HOUSE_COVERED",
          amountMinor: result.houseCoverMinor,
          idempotencyKey: `${input.idempotencyKey}-house-cover`
        }
      });
    }

    await tx.market.update({
      where: { id: input.marketId },
      data: {
        status: "RESOLVED",
        outcome: input.outcome,
        resolvedAt: new Date()
      }
    });
  });

  return prisma.market.findUnique({
    where: { id: input.marketId },
    include: { bets: true, transactions: true }
  });
}

export async function getMarketById(marketId: string) {
  return prisma.market.findUnique({
    where: { id: marketId },
    include: { bets: { include: { user: { select: { username: true } } } }, transactions: true }
  });
}

export async function getOpenMarkets() {
  return prisma.market.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" }
  });
}
