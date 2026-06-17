import { describe, it, expect } from "vitest";
import { calculatePayouts, calculateOdds } from "@/server/core/payout-engine";
import { toMinor } from "@/server/core/money";

describe("calculatePayouts", () => {
  it("acceptance case: YES 60k / NO 40k / rake 8% / outcome YES / 1k bet -> 1,533.33", () => {
    const yesPool = toMinor(60_000);
    const noPool = toMinor(40_000);
    const bets = [{ id: "b1", userId: "u1", side: "YES" as const, amountMinor: toMinor(1_000) }];

    const result = calculatePayouts("YES", yesPool, noPool, 800, 6500, bets);

    expect(result.totalPoolMinor).toBe(toMinor(100_000));
    expect(result.rakeMinor).toBe(toMinor(8_000));
    expect(result.payoutPoolMinor).toBe(toMinor(92_000));
    expect(result.payouts[0].amountMinor).toBe(toMinor(1_533.33));
  });

  it("single-side YES case: 1k bet / implied 0.65 / rake 8% -> payout ~1,415 and house covers", () => {
    const yesPool = toMinor(1_000);
    const noPool = 0;
    const bets = [{ id: "b1", userId: "u1", side: "YES" as const, amountMinor: toMinor(1_000) }];

    const result = calculatePayouts("YES", yesPool, noPool, 800, 6500, bets);

    expect(result.guaranteedMultiplier).toBeCloseTo(1.41538, 3);
    expect(result.payouts[0].amountMinor).toBe(toMinor(1_415.38));
    expect(result.houseCoverMinor).toBe(toMinor(495.38));
  });

  it("single-side NO case: bet loses -> no payout", () => {
    const yesPool = toMinor(1_000);
    const noPool = 0;
    const bets = [{ id: "b1", userId: "u1", side: "YES" as const, amountMinor: toMinor(1_000) }];

    const result = calculatePayouts("NO", yesPool, noPool, 800, 6500, bets);

    expect(result.payouts).toHaveLength(0);
    expect(result.rakeMinor).toBe(toMinor(80));
  });
});

describe("calculateOdds", () => {
  it("empty pool uses implied probability with rake", () => {
    const odds = calculateOdds(0, 0, 800, 6500);
    expect(odds.yesMultiplier).toBeCloseTo(1.41538, 3);
    expect(odds.noMultiplier).toBeCloseTo(2.62857, 3);
  });
});
