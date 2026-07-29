import { z } from "zod";

export const chestRewardSchema = z.object({
  itemId: z.number().int().positive(),
  count: z.number().int().min(1).default(1),
  weight: z.number().int().min(1).default(10),
  published: z.boolean().default(true),
});

export type ChestRewardInput = z.infer<typeof chestRewardSchema>;
