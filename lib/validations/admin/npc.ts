import { z } from "zod";

export const NPC_TYPES = ["shop", "quest", "misc"] as const;
export type NpcType = (typeof NPC_TYPES)[number];

export const npcShopItemSchema = z.object({
  itemId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  buyPriceCrystal: z.number().min(0).default(0),
  sellPriceCrystal: z.number().min(0).default(0),
});

export const npcSchema = z.object({
  name: z.string().min(1).max(255),
  lookTypeId: z.number().int().positive(),
  type: z.enum(NPC_TYPES).default("misc"),
  town: z.string().max(100).default(""),
  posX: z.number().int().default(0),
  posY: z.number().int().default(0),
  posZ: z.number().int().default(0),
  direction: z.number().int().min(0).max(3).default(2),
  shopItems: z.array(npcShopItemSchema).default([]),
  /** Conteúdo do script customizado (type "quest"/"misc"); ignorado para "shop" (usa default.lua). */
  scriptContent: z.string().default(""),
  published: z.boolean().default(true),
});

export type NpcInput = z.infer<typeof npcSchema>;
export type NpcShopItemInput = z.infer<typeof npcShopItemSchema>;
