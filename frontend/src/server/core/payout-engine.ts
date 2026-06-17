import { roundToMinor, type Side } from "./money";

export interface PayoutResult {
  totalPoolMinor: number;
  rakeMinor: number;
  payoutPoolMinor: number;
  winnerPoolMinor: number;
  loserPoolMinor: number;
  guaranteedMultiplier?: number;
  houseCoverMinor: number;
  payouts: { userId: string; betId: string; amountMinor: number }[];
  rakeAmountMinor: number;
}

export function calculatePayouts(
  outcome: Side,
  poolYesMinor: number,
  poolNoMinor: number,
  rakeBps: number,
  initialYesProbBps: number,
  bets: { id: string; userId: string; side: Side; amountMinor: number }[]
): PayoutResult {
  const totalPoolMinor = poolYesMinor + poolNoMinor;
  const rakeMinor = roundToMinor((totalPoolMinor * rakeBps) / 10000);
  const payoutPoolMinor = totalPoolMinor - rakeMinor;

  const winnerPoolMinor = outcome === "YES" ? poolYesMinor : poolNoMinor;
  const loserPoolMinor = outcome === "YES" ? poolNoMinor : poolYesMinor;

  const winningBets = bets.filter((b) => b.side === outcome);

  let houseCoverMinor = 0;
  let payouts: { userId: string; betId: string; amountMinor: number }[] = [];
  let guaranteedMultiplier: number | undefined;

  if (winnerPoolMinor === 0) {
    // No winners — payout pool becomes entire rake/house profit. No payouts.
    payouts = [];
  } else if (loserPoolMinor === 0) {
    // Single-side case: guaranteed payout according to implied probability.
    const impliedProb = outcome === "YES" ? initialYesProbBps / 10000 : 1 - initialYesProbBps / 10000;
    guaranteedMultiplier = (1 / impliedProb) * (1 - rakeBps / 10000);

    for (const bet of winningBets) {
      const rawPayout = bet.amountMinor * guaranteedMultiplier;
      const payout = roundToMinor(rawPayout);
      payouts.push({ userId: bet.userId, betId: bet.id, amountMinor: payout });
    }

    const totalPayoutMinor = payouts.reduce((sum, p) => sum + p.amountMinor, 0);
    const availableAfterRake = totalPoolMinor - rakeMinor;
    houseCoverMinor = Math.max(0, totalPayoutMinor - availableAfterRake);
  } else {
    // Normal parimutuel: distribute payout pool proportionally to winning stakes.
    for (const bet of winningBets) {
      const share = bet.amountMinor / winnerPoolMinor;
      const payout = roundToMinor(payoutPoolMinor * share);
      payouts.push({ userId: bet.userId, betId: bet.id, amountMinor: payout });
    }
  }

  return {
    totalPoolMinor,
    rakeMinor,
    payoutPoolMinor,
    winnerPoolMinor,
    loserPoolMinor,
    guaranteedMultiplier,
    houseCoverMinor,
    payouts,
    rakeAmountMinor: rakeMinor
  };
}

export function calculateOdds(
  poolYesMinor: number,
  poolNoMinor: number,
  rakeBps: number,
  initialYesProbBps: number
): { yesMultiplier: number; noMultiplier: number; impliedYesProb: number } {
  const total = poolYesMinor + poolNoMinor;
  if (total === 0) {
    return {
      yesMultiplier: (1 / (initialYesProbBps / 10000)) * (1 - rakeBps / 10000),
      noMultiplier: (1 / (1 - initialYesProbBps / 10000)) * (1 - rakeBps / 10000),
      impliedYesProb: initialYesProbBps / 10000
    };
  }

  const yesMultiplier =
    poolYesMinor > 0 ? ((total * (1 - rakeBps / 10000)) / poolYesMinor) : 0;
  const noMultiplier = poolNoMinor > 0 ? ((total * (1 - rakeBps / 10000)) / poolNoMinor) : 0;
  const impliedYesProb = poolYesMinor / total;

  return { yesMultiplier, noMultiplier, impliedYesProb };
}
