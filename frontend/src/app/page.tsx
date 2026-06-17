import Link from "next/link";
import { Card, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { MobileShell } from "@/widgets/mobile-shell";
import { getOpenMarkets } from "@/server/modules/markets/market.service";
import { formatAmountMinor } from "@/entities/market/lib/format";

export default async function HomePage() {
  const markets = await getOpenMarkets();

  return (
    <MobileShell>
      <div className="space-y-8">
        <section className="space-y-3 pt-4">
          <span className="eyebrow-mono">Parimutuel markets</span>
          <h1 className="headline-display-md text-ink">PoolWise</h1>
          <p className="text-lg font-normal leading-relaxed text-body">
            Predict outcomes. Split the pool. Winners take the losing side minus 8% rake. Single-sided
            markets pay guaranteed odds backed by the house.
          </p>
        </section>

        <section className="space-y-4">
          <span className="eyebrow-mono">Open markets</span>
          <div className="space-y-3">
            {markets.length === 0 ? (
              <p className="text-sm text-body-mid">No open markets yet.</p>
            ) : (
              markets.map((market) => (
                <Card key={market.id} className="space-y-4">
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
              ))
            )}
          </div>
        </section>
      </div>
    </MobileShell>
  );
}
