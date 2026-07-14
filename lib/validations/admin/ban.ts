import { z } from "zod";

export const banSchema = z.object({
  type: z.number().int().min(1).max(5),
  value: z.number().int(),
  reason: z.number().int(),
  comment: z.string().max(1000),
  statement: z.string().max(255),
  active: z.boolean(),
  expires: z.number().int(),
});

export type BanInput = z.infer<typeof banSchema>;

export const BAN_TYPES = [
  { value: 1, label: "IP" },
  { value: 2, label: "Personagem" },
  { value: 3, label: "Conta" },
  { value: 4, label: "Notação" },
  { value: 5, label: "Namelock" },
] as const;
