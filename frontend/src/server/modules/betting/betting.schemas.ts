import { z } from "zod";

export const placeBetSchema = z.object({
  userId: z.string().min(1),
  marketId: z.string().min(1),
  side: z.enum(["YES", "NO"]),
  amountMinor: z.number().int().positive(),
  idempotencyKey: z.string().min(1)
});

export type PlaceBetInput = z.infer<typeof placeBetSchema>;
