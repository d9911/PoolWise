import { configureStore } from "@reduxjs/toolkit";
import { marketApi } from "@/entities/market/api";
import { userApi } from "@/entities/user/api";
import { betApi } from "@/entities/bet/api";

export const store = configureStore({
  reducer: {
    [marketApi.reducerPath]: marketApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [betApi.reducerPath]: betApi.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(marketApi.middleware, userApi.middleware, betApi.middleware)
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
