import { Card } from "@/shared/ui/card";
import { formatAmountMinor, formatMultiplier, formatProbability } from "@/entities/market/lib/format";
import type { Market } from "@/entities/market/types";

interface MarketPoolProps {
  market: Market;
}

export function MarketPool({ market }: MarketPoolProps) {
  const total = market.poolYesMinor + market.poolNoMinor;
  const odds = market.odds;

  return (
    <Card className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="font-mono text-xs uppercase tracking-mono-sm text-accent-sunset">YES pool</div>
          <div className="headline-display-sm text-ink">{formatAmountMinor(market.poolYesMinor)}</div>
          <div className="font-mono text-xs uppercase tracking-mono-sm text-body-mid">
            {odds ? formatMultiplier(odds.yesMultiplier) : "—"}
          </div>
        </div>
        <div className="space-y-1 text-right">
          <div className="font-mono text-xs uppercase tracking-mono-sm text-accent-twilight">NO pool</div>
          <div className="headline-display-sm text-ink">{formatAmountMinor(market.poolNoMinor)}</div>
          <div className="font-mono text-xs uppercase tracking-mono-sm text-body-mid">
            {odds ? formatMultiplier(odds.noMultiplier) : "—"}
          </div>
        </div>
      </div>

      <div className="border-t border-hairline pt-4">
        <div className="flex items-center justify-between py-1 text-sm">
          <span className="font-mono text-xs uppercase tracking-mono-sm text-body-mid">Total pool</span>
          <span className="font-mono text-sm uppercase tracking-mono-sm text-ink">
            {formatAmountMinor(total)}
          </span>
        </div>
        <div className="flex items-center justify-between py-1 text-sm">
          <span className="font-mono text-xs uppercase tracking-mono-sm text-body-mid">Rake (8%)</span>
          <span className="font-mono text-sm uppercase tracking-mono-sm text-ink">
            {formatAmountMinor(Math.round((total * 800) / 10000))}
          </span>
        </div>
        {odds && (
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="font-mono text-xs uppercase tracking-mono-sm text-body-mid">Implied YES</span>
            <span className="font-mono text-sm uppercase tracking-mono-sm text-ink">
              {formatProbability(odds.impliedYesProb)}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
