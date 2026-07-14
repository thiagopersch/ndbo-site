import { z } from "zod";

export const postSchema = z.object({
  title: z.string().min(3).max(255),
  slug: z
    .string()
    .min(3)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens"),
  excerpt: z.string().max(500),
  content: z.string().min(1),
  published: z.boolean(),
});

export type PostInput = z.infer<typeof postSchema>;
