/** Runtime configuration sourced from public env vars (NEXT_PUBLIC_*). */

export const config = {
  /** Base URL for the REST API. Empty string => same origin (App Router API). */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
  /** The demo user the UI acts as (MVP has no real auth). */
  demoUserId: process.env.NEXT_PUBLIC_DEMO_USER_ID ?? 'alice',
  /** Default rake in basis points (800 == 8%). */
  defaultRakeBps: Number(process.env.NEXT_PUBLIC_DEFAULT_RAKE_BPS ?? '800'),
  /** Prefix for bet idempotency keys generated in the UI. */
  betKeyPrefix: process.env.NEXT_PUBLIC_BET_KEY_PREFIX ?? 'bet-ui',
} as const;

/** Build a fetch URL relative to the API base. */
export function apiUrl(path: string): string {
  const base = config.apiBaseUrl.replace(/\/$/, '');
  const tail = path.startsWith('/') ? path : `/${path}`;
  return `${base}${tail}`;
}
