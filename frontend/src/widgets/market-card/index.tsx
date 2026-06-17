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
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>{market.question}</CardTitle>
          <CardDescription>
            YES {formatAmountMinor(market.poolYesMinor)} · NO{" "}
            {formatAmountMinor(market.poolNoMinor)}
          </CardDescription>
        </div>
        <span
          className={`rounded-full border px-2 py-1 text-xs ${
            market.status === "OPEN" ? "border-accent text-accent" : "border-muted-foreground text-muted-foreground"
          }`}
        >
          {market.status}
        </span>
      </div>
      <Link href={`/markets/${market.id}`}>
        <Button className="w-full">Open market</Button>
      </Link>
    </Card>
  );
}
