import Link from "next/link";
import { Card, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { formatAmountMinor } from "@/entities/market/lib/format";
import type { Market } from "@/entities/market/types";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{market.question}</CardTitle>
          <CardDescription>
            YES {formatAmountMinor(market.poolYesMinor)} · NO{" "}
            {formatAmountMinor(market.poolNoMinor)}
          </CardDescription>
        </div>
        <span className="rounded-pill border border-white/25 px-2 py-1 text-xs font-mono uppercase tracking-mono-sm text-ink">
          OPEN
        </span>
      </div>
      <Link href={`/markets/${market.id}`} className="block">
        <Button className="w-full">Open market</Button>
      </Link>
    </Card>
  );
}
