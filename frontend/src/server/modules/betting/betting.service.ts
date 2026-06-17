import { prisma } from "@/server/db/prisma";
import { getUserBalanceMinor } from "@/server/modules/users/user.repository";
import type { PlaceBetInput } from "./betting.schemas";

export class InsufficientBalanceError extends Error {
  constructor() {
    super("Not enough balance to place this bet.");
    this.name = "InsufficientBalanceError";
  }
}

export class MarketClosedError extends Error {
  constructor() {
    super("Market is already resolved.");
    this.name = "MarketClosedError";
  }
}

export async function placeBet(input: PlaceBetInput) {
  const existingBet = await prisma.bet.findUnique({
    where: { idempotencyKey: input.idempotencyKey }
  });

  if (existingBet) {
    const market = await prisma.market.findUnique({ where: { id: input.marketId } });
    const balance = await getUserBalanceMinor(input.userId);
    return { bet: existingBet, market, balanceMinor: balance };
  }

  const market = await prisma.market.findUnique({ where: { id: input.marketId } });
  if (!market) throw new Error("Market not found");
  if (market.status === "RESOLVED") throw new MarketClosedError();

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error("User not found");

  const balance = await getUserBalanceMinor(input.userId);
  if (balance < input.amountMinor) throw new InsufficientBalanceError();

  const result = await prisma.$transaction(async (tx) => {
    const bet = await tx.bet.create({
      data: {
        userId: input.userId,
        marketId: input.marketId,
        side: input.side,
        amountMinor: input.amountMinor,
        idempotencyKey: input.idempotencyKey
      }
    });

    await tx.transaction.create({
      data: {
        userId: input.userId,
        marketId: input.marketId,
        betId: bet.id,
        type: "BET_PLACED",
        amountMinor: -input.amountMinor,
        idempotencyKey: `tx-${input.idempotencyKey}`
      }
    });

    const updatedMarket = await tx.market.update({
      where: { id: input.marketId },
      data:
        input.side === "YES"
          ? { poolYesMinor: { increment: input.amountMinor } }
          : { poolNoMinor: { increment: input.amountMinor } }
    });

    return { bet, market: updatedMarket };
  });

  const newBalance = await getUserBalanceMinor(input.userId);
  return { bet: result.bet, market: result.market, balanceMinor: newBalance };
}
