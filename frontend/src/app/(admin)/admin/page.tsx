import { AdminPage } from "@/pages-layer/AdminPage/ui/AdminPage";
import { getOpenMarkets } from "@/server/modules/markets/market.service";

export const dynamic = "force-dynamic";

export default async function AdminRoute() {
  const markets = await getOpenMarkets();
  return <AdminPage markets={markets} />;
}
