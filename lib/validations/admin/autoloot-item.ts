import { z } from "zod";

export const autolootItemSchema = z.object({
  itemId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  published: z.boolean().default(true),
});

export type AutolootItemInput = z.infer<typeof autolootItemSchema>;

export const autolootItemBulkSchema = z.object({
  items: z
    .array(z.object({ itemId: z.number().int().positive(), name: z.string().min(1).max(255) }))
    .min(1)
    .max(200),
  published: z.boolean().default(true),
});

export type AutolootItemBulkInput = z.infer<typeof autolootItemBulkSchema>;
