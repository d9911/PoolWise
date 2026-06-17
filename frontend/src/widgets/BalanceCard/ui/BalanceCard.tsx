"use client";

import { Card, CardTitle } from "@/shared/ui/card";
import { useGetBalanceQuery } from "@/entities/user/api";
import { formatAmountMinor } from "@/entities/market/lib/format";

interface BalanceCardProps {
  userId: string;
}

export function BalanceCard({ userId }: BalanceCardProps) {
  const { data, isLoading } = useGetBalanceQuery(userId);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="h-6 w-32 rounded-sm bg-canvas-mid" />
      </Card>
    );
  }

  return (
    <Card className="flex items-center justify-between">
      <div className="space-y-1">
        <span className="block font-mono text-xs uppercase tracking-mono-sm text-body-mid">
          Balance
        </span>
        <CardTitle className="text-2xl">{formatAmountMinor(data?.user.balanceMinor ?? 0)}</CardTitle>
      </div>
      <span className="font-mono text-xs uppercase tracking-mono-sm text-body-mid">
        {data?.user.username}
      </span>
    </Card>
  );
}
