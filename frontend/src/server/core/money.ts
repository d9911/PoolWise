export const NGN_MINOR = 100; // 1 NGN = 100 kobo

export function toMinor(amount: number): number {
  return Math.round(amount * NGN_MINOR);
}

export function fromMinor(amountMinor: number): number {
  return amountMinor / NGN_MINOR;
}

export function formatNgn(amountMinor: number): string {
  const value = fromMinor(amountMinor);
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function roundToMinor(value: number): number {
  return Math.round(value);
}

export type Side = "YES" | "NO";
