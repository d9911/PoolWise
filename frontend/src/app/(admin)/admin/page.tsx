import { AdminPage } from "@/pages-layer/AdminPage/ui/AdminPage";
import { getOpenMarkets } from "@/server/modules/markets/market.service";

export default async function AdminRoute() {
  const markets = await getOpenMarkets();
  return <AdminPage markets={markets} />;
}
