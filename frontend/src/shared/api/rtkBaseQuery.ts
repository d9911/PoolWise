import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { apiUrl } from '@/shared/config';

/**
 * RTK Query base query. Uses the API base from config (same-origin by default,
 * which hits the Next.js App Router route handlers in /api).
 */
export const rtkBaseQuery = fetchBaseQuery({
  baseUrl: apiUrl('/api'),
  // Forward our custom idempotency keys on mutating requests via headers.
  prepareHeaders: (headers) => {
    headers.set('Accept', 'application/json');
    return headers;
  },
});
