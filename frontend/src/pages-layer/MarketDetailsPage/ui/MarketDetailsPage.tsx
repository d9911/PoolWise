"use client";

import { useParams } from "next/navigation";
import { MobileShell } from "@/widgets/MobileShell/ui/MobileShell";
import { BalanceCard } from "@/widgets/BalanceCard/ui/BalanceCard";
import { MarketPool } from "@/widgets/MarketPool/ui/MarketPool";
import { BetPanel } from "@/widgets/BetPanel/ui/BetPanel";
import { ResolvePanel } from "@/widgets/ResolvePanel/ui/ResolvePanel";
import { useGetMarketQuery } from "@/entities/market/api";
import { useGetBalanceQuery } from "@/entities/user/api";
import { formatAmountMinor } from "@/entities/market/lib/format";

const DEMO_USER_ID = "user_alice";

export function MarketDetailsPage() {
  const params = useParams<{ id: string }>();
  const marketId = params.id;
  const { data: marketData, isLoading: marketLoading } = useGetMarketQuery(marketId);
  const { data: userData } = useGetBalanceQuery(DEMO_USER_ID);

  const market = marketData?.market;
  const balanceMinor = userData?.user.balanceMinor ?? 0;

  if (marketLoading || !market) {
    return (
      <MobileShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent" />
        </div>
      </MobileShell>
    );
  }

  const isResolved = market.status === "RESOLVED";
  const winningOutcome = market.outcome;

  return (
    <MobileShell title="Market">
      <div className="space-y-6">
        <section className="space-y-2 pt-2">
          <span className="eyebrow-mono">
            {isResolved ? `Resolved · ${winningOutcome}` : "Open for betting"}
          </span>
          <h1 className="headline-display-sm text-ink">{market.question}</h1>
        </section>

        <BalanceCard userId={DEMO_USER_ID} />
        <MarketPool market={market} />

        <BetPanel
          marketId={marketId}
          userId={DEMO_USER_ID}
          balanceMinor={balanceMinor}
          isResolved={isResolved}
        />

        <ResolvePanel marketId={marketId} isResolved={isResolved} />

        {isResolved && market.transactions && market.transactions.length > 0 && (
          <section className="space-y-3">
            <span className="eyebrow-mono">Resolution ledger</span>
            <div className="space-y-2 text-sm">
              {market.transactions
                .filter((t) => t.type !== "BET_PLACED")
                .map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-sm border border-hairline bg-canvas-card px-4 py-3"
                  >
                    <span className="font-mono text-xs uppercase tracking-mono-sm text-body-mid">
                      {t.type}
                    </span>
                    <span className={t.amountMinor >= 0 ? "text-accent-breeze" : "text-accent-sunset"}>
                      {formatAmountMinor(t.amountMinor)}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </MobileShell>
  );
}
