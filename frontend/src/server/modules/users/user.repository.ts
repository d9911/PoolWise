import { prisma } from "@/server/db/prisma";

export async function getUserBalanceMinor(userId: string) {
  const result = await prisma.transaction.aggregate({
    where: { userId },
    _sum: { amountMinor: true }
  });
  return result._sum.amountMinor ?? 0;
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function getUserTransactions(userId: string) {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50
  });
}
