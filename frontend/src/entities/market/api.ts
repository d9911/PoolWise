import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { Market } from "./types";

export interface MarketResponse {
  success: boolean;
  market: Market;
}

export interface ResolveMarketRequest {
  marketId: string;
  outcome: "YES" | "NO";
  idempotencyKey: string;
}

export const marketApi = createApi({
  reducerPath: "marketApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Market"],
  endpoints: (builder) => ({
    getMarket: builder.query<MarketResponse, string>({
      query: (id) => `/market/${id}`,
      providesTags: (result, error, id) => [{ type: "Market", id }]
    }),
    resolveMarket: builder.mutation<MarketResponse, ResolveMarketRequest>({
      query: (body) => ({
        url: "/market/resolve",
        method: "POST",
        body
      }),
      invalidatesTags: (result, error, { marketId }) => [{ type: "Market", id: marketId }]
    })
  })
});

export const { useGetMarketQuery, useResolveMarketMutation } = marketApi;
