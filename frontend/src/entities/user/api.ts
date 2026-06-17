import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { User, Transaction } from "./types";

export interface BalanceResponse {
  success: boolean;
  user: User;
  transactions: Transaction[];
}

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["User"],
  endpoints: (builder) => ({
    getBalance: builder.query<BalanceResponse, string>({
      query: (id) => `/user/${id}/balance`,
      providesTags: (result, error, id) => [{ type: "User", id }]
    })
  })
});

export const { useGetBalanceQuery } = userApi;
