import { z } from "zod";

export const resolveMarketSchema = z.object({
  marketId: z.string().min(1),
  outcome: z.enum(["YES", "NO"]),
  idempotencyKey: z.string().min(1)
});

export type ResolveMarketInput = z.infer<typeof resolveMarketSchema>;
