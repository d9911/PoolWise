"use client";

import { useState } from "react";
import { MobileShell } from "@/widgets/mobile-shell";
import { Card, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useResolveMarketMutation } from "@/entities/market/api";
import type { Market } from "@/entities/market/types";
import type { Outcome } from "@/entities/market/types";
import { formatAmountMinor } from "@/entities/market/lib/format";

interface AdminPageProps {
  markets: Market[];
}

export function AdminPage({ markets }: AdminPageProps) {
  return (
    <MobileShell title="Admin">
      <div className="space-y-6">
        <section className="space-y-2 pt-2">
          <span className="eyebrow-mono">Admin</span>
          <h1 className="headline-display-sm text-ink">Resolve markets</h1>
        </section>
        {markets.length === 0 ? (
          <p className="text-sm text-body-mid">No open markets.</p>
        ) : (
          markets.map((market) => <AdminMarketCard key={market.id} market={market} />)
        )}
      </div>
    </MobileShell>
  );
}

function AdminMarketCard({ market }: { market: Market }) {
  const [outcome, setOutcome] = useState<Outcome>("YES");
  const [message, setMessage] = useState<string | null>(null);
  const [resolveMarket, { isLoading }] = useResolveMarketMutation();

  async function handleResolve() {
    setMessage(null);
    try {
      await resolveMarket({
        marketId: market.id,
        outcome,
        idempotencyKey: `admin-resolve-${market.id}-${outcome}-${Date.now()}`
      }).unwrap();
      setMessage(`Resolved as ${outcome}`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { data?: { error?: { message?: string } } })?.data?.error?.message ||
            "Failed to resolve";
      setMessage(message);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <span className="eyebrow-mono">Open market</span>
        <CardTitle>{market.question}</CardTitle>
      </div>
      <div className="font-mono text-xs uppercase tracking-mono-sm text-body-mid">
        YES {formatAmountMinor(market.poolYesMinor)} · NO {formatAmountMinor(market.poolNoMinor)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant={outcome === "YES" ? "accent" : "default"}
          onClick={() => setOutcome("YES")}
          className="w-full"
        >
          YES
        </Button>
        <Button
          type="button"
          variant={outcome === "NO" ? "danger" : "default"}
          onClick={() => setOutcome("NO")}
          className="w-full"
        >
          NO
        </Button>
      </div>
      <Button variant="primary" onClick={handleResolve} disabled={isLoading} className="w-full">
        {isLoading ? "Resolving..." : "Resolve market"}
      </Button>
      {message && <p className="text-sm text-accent-breeze">{message}</p>}
    </Card>
  );
}
