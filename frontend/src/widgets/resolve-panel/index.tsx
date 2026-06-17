"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useResolveMarketMutation } from "@/entities/market/api";
import type { Outcome } from "@/entities/market/types";

interface ResolvePanelProps {
  marketId: string;
  isResolved: boolean;
}

export function ResolvePanel({ marketId, isResolved }: ResolvePanelProps) {
  const [outcome, setOutcome] = useState<Outcome>("YES");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resolveMarket, { isLoading }] = useResolveMarketMutation();

  async function handleResolve() {
    setError(null);
    setSuccess(null);

    try {
      await resolveMarket({
        marketId,
        outcome,
        idempotencyKey: `resolve-${marketId}-${outcome}-${Date.now()}`
      }).unwrap();
      setSuccess(`Market resolved as ${outcome}`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { data?: { error?: { message?: string } } })?.data?.error?.message ||
            "Failed to resolve market";
      setError(message);
    }
  }

  if (isResolved) {
    return (
      <Card className="space-y-2">
        <span className="eyebrow-mono">Resolution</span>
        <p className="text-sm text-body-mid">This market is already resolved.</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <span className="eyebrow-mono">Admin · Resolve market</span>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant={outcome === "YES" ? "accent" : "default"}
          onClick={() => setOutcome("YES")}
          className="w-full"
        >
          Resolve YES
        </Button>
        <Button
          type="button"
          variant={outcome === "NO" ? "danger" : "default"}
          onClick={() => setOutcome("NO")}
          className="w-full"
        >
          Resolve NO
        </Button>
      </div>

      {error && <p className="text-sm text-accent-sunset">{error}</p>}
      {success && <p className="text-sm text-accent-breeze">{success}</p>}

      <Button type="button" variant="primary" disabled={isLoading} onClick={handleResolve} className="w-full">
        {isLoading ? "Resolving..." : `Confirm ${outcome}`}
      </Button>
    </Card>
  );
}
