import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface PlaceBetResponse {
  success: boolean;
  betId: string;
  balanceMinor: number;
  market: {
    id: string;
    poolYesMinor: number;
    poolNoMinor: number;
  };
}

export const betApi = createApi({
  reducerPath: "betApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Market", "User"],
  endpoints: (builder) => ({
    placeBet: builder.mutation<
      PlaceBetResponse,
      {
        userId: string;
        marketId: string;
        side: "YES" | "NO";
        amountMinor: number;
        idempotencyKey: string;
      }
    >({
      query: (body) => ({
        url: "/bet",
        method: "POST",
        body
      }),
      invalidatesTags: (result, error, { marketId, userId }) => [
        { type: "Market", id: marketId },
        { type: "User", id: userId }
      ]
    })
  })
});

export const { usePlaceBetMutation } = betApi;
