import { NextResponse } from "next/server";
import { getMarketById } from "@/server/modules/markets/market.service";
import { calculateOdds } from "@/server/core/payout-engine";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const market = await getMarketById(id);
    if (!market) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Market not found" } },
        { status: 404 }
      );
    }

    const odds = calculateOdds(
      market.poolYesMinor,
      market.poolNoMinor,
      market.rakeBps,
      market.initialYesProbBps
    );

    return NextResponse.json({
      success: true,
      market: {
        ...market,
        odds
      }
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}
