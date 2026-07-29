import { z } from "zod";

export const autolootItemSchema = z.object({
  itemId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  published: z.boolean().default(true),
});

export type AutolootItemInput = z.infer<typeof autolootItemSchema>;
