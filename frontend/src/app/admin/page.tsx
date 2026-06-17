import { AdminPage } from "@/pages-layer/admin-page";
import { getOpenMarkets } from "@/server/modules/markets/market.service";

export default async function AdminRoute() {
  const markets = await getOpenMarkets();
  return <AdminPage markets={markets} />;
}
