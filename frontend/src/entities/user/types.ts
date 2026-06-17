export type UserRole = "USER" | "ADMIN" | "HOUSE";

export interface User {
  id: string;
  username: string;
  role: UserRole;
  balanceMinor: number;
  formattedBalance: string;
}

export interface Transaction {
  id: string;
  userId: string | null;
  marketId: string | null;
  betId: string | null;
  type: string;
  amountMinor: number;
  createdAt: string;
}
