import { describe, it, expect } from 'vitest';
import {
  settleMarket,
  guaranteedMultiplierBps,
  detectSingleSide,
} from '@/server/core/payout-engine';
import { formatMoney, toMinor } from '@/server/core/money';

describe('payout engine — parimutuel (acceptance case)', () => {
  // From the brief:
  //   YES pool = ₦60,000   NO pool = ₦40,000   rake = 8%   outcome = YES
  //   A user who bet ₦1,000 on YES must receive ₦1,533.33
  it('pays a ₦1,000 YES bet exactly ₦1,533.33', () => {
    const result = settleMarket(
      {
        outcome: 'YES',
        rakeBps: 800,
        initialYesProbBps: 6500,
        pool: { poolYesMinor: toMinor(60_000), poolNoMinor: toMinor(40_000) },
      },
      [{ betId: 'b1', userId: 'u1', amountMinor: toMinor(1_000) }],
    );

    // Sanity on the pool math.
    expect(result.totalPoolMinor).toBe(toMinor(100_000));
    expect(result.rakeMinor).toBe(toMinor(8_000));
    expect(result.payoutPoolMinor).toBe(toMinor(92_000));

    const payout = result.winners[0].payoutMinor;
    // ₦1,533.33 == 153333 minor.
    expect(payout).toBe(153_333);
    expect(formatMoney(payout)).toBe('₦1,533.33');
    expect(result.houseCoverMinor).toBe(0);
    expect(result.singleSide).toBe(false);
  });

  it('distributes the net pool proportionally across several YES winners', () => {
    // YES pool = 60k, split 50k/10k between two winners; NO pool = 40k.
    const result = settleMarket(
      {
        outcome: 'YES',
        rakeBps: 800,
        initialYesProbBps: 6500,
        pool: { poolYesMinor: toMinor(60_000), poolNoMinor: toMinor(40_000) },
      },
      [
        { betId: 'b1', userId: 'u1', amountMinor: toMinor(50_000) },
        { betId: 'b2', userId: 'u2', amountMinor: toMinor(10_000) },
      ],
    );

    // payoutPool = 92,000. u1 owns 50/60, u2 owns 10/60.
    expect(result.winners[0].payoutMinor).toBe(toMinor(92_000) * (50_000 / 60_000) | 0);
    expect(result.winners[1].payoutMinor).toBe(toMinor(92_000) * (10_000 / 60_000) | 0);
    // Winners are paid from the net pool; no house cover.
    const totalPaid = result.winners.reduce((s, w) => s + w.payoutMinor, 0);
    expect(totalPaid).toBeLessThanOrEqual(result.payoutPoolMinor);
    expect(result.houseCoverMinor).toBe(0);
    // Dust from flooring folds into rake.
    expect(result.rakeMinor).toBeGreaterThanOrEqual(toMinor(8_000));
  });

  it('resolves NO winners correctly when NO is the outcome', () => {
    const result = settleMarket(
      {
        outcome: 'NO',
        rakeBps: 800,
        initialYesProbBps: 6500,
        pool: { poolYesMinor: toMinor(60_000), poolNoMinor: toMinor(40_000) },
      },
      [{ betId: 'b1', userId: 'u1', amountMinor: toMinor(40_000) }],
    );
    // NO winner owns 100% of NO pool => gets the whole net pool = 92,000.
    expect(result.winners[0].payoutMinor).toBe(toMinor(92_000));
  });
});

describe('payout engine — single-side guarantee (acceptance case)', () => {
  // From the brief:
  //   single YES bet ₦1,000, NO pool empty, implied prob 0.65, rake 8%
  //   multiplier = (1/0.65)*(1-0.08) = 1.4153846...
  //   payout = ₦1,415.38 (the brief shows ₦1,415 rounded in UI text)
  it('computes the guaranteed multiplier 1.4153x (14153 bps)', () => {
    const multBps = guaranteedMultiplierBps(800, 6500);
    // 9200/6500 * 10000 floored = 14153 bps == 1.4153x
    expect(multBps).toBe(14_153);
  });

  it('pays a single-side ₦1,000 YES winner ₦1,415.38 and makes the house cover the gap', () => {
    const yesAmount = toMinor(1_000);
    const result = settleMarket(
      {
        outcome: 'YES',
        rakeBps: 800,
        initialYesProbBps: 6500,
        pool: { poolYesMinor: yesAmount, poolNoMinor: 0 },
      },
      [{ betId: 'b1', userId: 'u1', amountMinor: yesAmount }],
    );

    expect(result.singleSide).toBe(true);
    expect(result.liquidSide).toBe('YES');
    // payout = 100000 * 9200 / 6500 floored = 141538 minor == ₦1,415.38
    expect(result.winners[0].payoutMinor).toBe(141_538);
    expect(formatMoney(result.winners[0].payoutMinor)).toBe('₦1,415.38');

    // Net pool available = stake - rake = 100000 - 8000 = 92000.
    expect(result.payoutPoolMinor).toBe(92_000);
    // Winner is paid 141538, pool only has 92000 -> house covers 49538.
    expect(result.winnersPaidMinor).toBe(141_538);
    expect(result.houseCoverMinor).toBe(141_538 - 92_000);
    expect(result.houseCoverMinor).toBe(49_538);
  });

  it('forfeits a single-side bet when its side LOSES (no payout, no house cover)', () => {
    const result = settleMarket(
      {
        outcome: 'NO',
        rakeBps: 800,
        initialYesProbBps: 6500,
        pool: { poolYesMinor: toMinor(1_000), poolNoMinor: 0 },
      },
      [], // no NO winners
    );
    expect(result.singleSide).toBe(true);
    expect(result.winners).toHaveLength(0);
    expect(result.houseCoverMinor).toBe(0);
    expect(result.winnersPaidMinor).toBe(0);
  });
});

describe('payout engine — helpers', () => {
  it('detectSingleSide classifies pools', () => {
    expect(detectSingleSide({ poolYesMinor: 100, poolNoMinor: 0 })).toBe('YES');
    expect(detectSingleSide({ poolYesMinor: 0, poolNoMinor: 100 })).toBe('NO');
    expect(detectSingleSide({ poolYesMinor: 100, poolNoMinor: 100 })).toBeNull();
    expect(detectSingleSide({ poolYesMinor: 0, poolNoMinor: 0 })).toBeNull();
  });
});

describe('money helpers', () => {
  it('formats minor units consistently', () => {
    expect(formatMoney(0)).toBe('₦0.00');
    expect(formatMoney(153_333)).toBe('₦1,533.33');
    expect(formatMoney(-100_000)).toBe('-₦1,000.00');
  });
  it('toMinor converts major to minor safely', () => {
    expect(toMinor(1_000)).toBe(100_000);
    expect(toMinor('1533.33')).toBe(153_333);
  });
});
