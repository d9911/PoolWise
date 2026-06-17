import { NextResponse } from "next/server";
import { getUserById, getUserBalanceMinor, getUserTransactions } from "@/server/modules/users/user.repository";
import { formatNgn } from "@/server/core/money";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    const balanceMinor = await getUserBalanceMinor(id);
    const transactions = await getUserTransactions(id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        balanceMinor,
        formattedBalance: formatNgn(balanceMinor)
      },
      transactions
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}
