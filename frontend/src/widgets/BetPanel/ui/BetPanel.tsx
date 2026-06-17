"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { usePlaceBetMutation } from "@/entities/bet/api";
import type { Outcome } from "@/entities/market/types";
import { formatAmountMinor } from "@/entities/market/lib/format";

interface BetPanelProps {
  marketId: string;
  userId: string;
  balanceMinor: number;
  isResolved: boolean;
}

const PRESETS = [1_000, 5_000, 10_000];

export function BetPanel({ marketId, userId, balanceMinor, isResolved }: BetPanelProps) {
  const [side, setSide] = useState<Outcome>("YES");
  const [amount, setAmount] = useState<number>(1_000);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [placeBet, { isLoading }] = usePlaceBetMutation();

  const amountMinor = amount * 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (amountMinor > balanceMinor) {
      setError("Insufficient balance");
      return;
    }

    try {
      const result = await placeBet({
        userId,
        marketId,
        side,
        amountMinor,
        idempotencyKey: `bet-${userId}-${marketId}-${side}-${Date.now()}`
      }).unwrap();

      setSuccess(`Bet placed. New balance: ${formatAmountMinor(result.balanceMinor)}`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { data?: { error?: { message?: string } } })?.data?.error?.message ||
            "Failed to place bet";
      setError(message);
    }
  }

  if (isResolved) {
    return (
      <Card className="space-y-2">
        <span className="eyebrow-mono">Betting</span>
        <p className="text-sm text-body-mid">This market is resolved. No more bets.</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <span className="eyebrow-mono">Place bet</span>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant={side === "YES" ? "accent" : "default"}
          onClick={() => setSide("YES")}
          className="w-full"
        >
          YES
        </Button>
        <Button
          type="button"
          variant={side === "NO" ? "danger" : "default"}
          onClick={() => setSide("NO")}
          className="w-full"
        >
          NO
        </Button>
      </div>

      <div className="flex gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount(preset)}
            className={`flex-1 rounded-pill border py-2 text-xs font-mono uppercase tracking-mono-sm transition ${
              amount === preset
                ? "border-white bg-white text-canvas"
                : "border-white/25 bg-transparent text-body-mid hover:border-white/40 hover:text-ink"
            }`}
          >
            ₦{preset.toLocaleString()}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block font-mono text-xs uppercase tracking-mono-sm text-body-mid">
          Amount (₦)
          <input
            type="number"
            min={100}
            step={100}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-2 block w-full rounded-sm border border-hairline bg-canvas-soft px-3 py-2 text-sm font-normal text-ink outline-none focus:border-white/40"
          />
        </label>

        {error && <p className="text-sm text-accent-sunset">{error}</p>}
        {success && <p className="text-sm text-accent-breeze">{success}</p>}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Placing..." : `Bet ${side} ₦${amount.toLocaleString()}`}
        </Button>
      </form>
    </Card>
  );
}
