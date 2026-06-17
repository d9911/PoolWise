import { NextResponse } from "next/server";
import { placeBetSchema } from "@/server/modules/betting/betting.schemas";
import {
  placeBet,
  InsufficientBalanceError,
  MarketClosedError
} from "@/server/modules/betting/betting.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = placeBetSchema.parse(body);
    const result = await placeBet(input);

    return NextResponse.json({
      success: true,
      betId: result.bet.id,
      balanceMinor: result.balanceMinor,
      market: {
        id: result.market?.id,
        poolYesMinor: result.market?.poolYesMinor,
        poolNoMinor: result.market?.poolNoMinor
      }
    });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return NextResponse.json(
        { success: false, error: { code: "INSUFFICIENT_BALANCE", message: error.message } },
        { status: 402 }
      );
    }
    if (error instanceof MarketClosedError) {
      return NextResponse.json(
        { success: false, error: { code: "MARKET_CLOSED", message: error.message } },
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
