export function formatAmountMinor(amountMinor: number): string {
  const value = amountMinor / 100;
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatMultiplier(value: number): string {
  return `${value.toFixed(3)}x`;
}

export function formatProbability(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
