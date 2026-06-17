import { NextResponse } from "next/server";
import { resolveMarketSchema } from "@/server/modules/markets/market.schemas";
import {
  resolveMarket,
  MarketAlreadyResolvedError
} from "@/server/modules/markets/market.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = resolveMarketSchema.parse(body);
    const market = await resolveMarket(input);

    return NextResponse.json({
      success: true,
      market
    });
  } catch (error) {
    if (error instanceof MarketAlreadyResolvedError) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_RESOLVED", message: error.message } },
        { status: 409 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: error.message } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}
