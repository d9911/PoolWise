import { MobileShell } from "@/widgets/MobileShell/ui/MobileShell";
import { MarketCard } from "@/widgets/MarketCard/ui/MarketCard";
import { getOpenMarkets } from "@/server/modules/markets/market.service";

export async function MainHome() {
  const markets = await getOpenMarkets();

  return (
    <MobileShell>
      <div className="space-y-8">
        <section className="space-y-3 pt-4">
          <span className="eyebrow-mono">Parimutuel markets</span>
          <h1 className="headline-display-md text-ink">PoolWise</h1>
          <p className="text-lg font-normal leading-relaxed text-body">
            Predict outcomes. Split the pool. Winners take the losing side minus 8% rake.
            Single-sided markets pay guaranteed odds backed by the house.
          </p>
        </section>

        <section className="space-y-4">
          <span className="eyebrow-mono">Open markets</span>
          <div className="space-y-3">
            {markets.length === 0 ? (
              <p className="text-sm text-body-mid">No open markets yet.</p>
            ) : (
              markets.map((market) => <MarketCard key={market.id} market={market} />)
            )}
          </div>
        </section>
      </div>
    </MobileShell>
  );
}
