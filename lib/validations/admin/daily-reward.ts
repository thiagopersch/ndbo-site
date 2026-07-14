import { z } from "zod";

export const dailyRewardMonthlySchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  day: z.number().int().min(1).max(31),
  itemId: z.number().int(),
  count: z.number().int().min(1),
  clientId: z.number().int(),
});

export type DailyRewardMonthlyInput = z.infer<typeof dailyRewardMonthlySchema>;
