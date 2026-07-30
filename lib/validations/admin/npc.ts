import { z } from "zod";

export const NPC_TYPES = ["shop", "quest", "misc"] as const;
export type NpcType = (typeof NPC_TYPES)[number];

export const NPC_SHOP_DIRECTIONS = ["buy", "sell"] as const;
export type NpcShopDirection = (typeof NPC_SHOP_DIRECTIONS)[number];

export const npcShopItemSchema = z.object({
  /** `null` enquanto o admin ainda não escolheu compra/venda — só depois disso os campos de
   * item/valor aparecem no formulário (linha incompleta é descartada ao salvar). */
  direction: z.enum(NPC_SHOP_DIRECTIONS).nullable(),
  itemId: z.number().int().positive().nullable(),
  name: z.string(),
  valueCrystal: z.number().min(0),
});

export const npcSchema = z.object({
  name: z
    .string()
    .min(1, "Informe o nome")
    .max(255)
    .refine((value) => !/\d/.test(value), { message: "O nome não pode conter números" }),
  lookTypeId: z.number().int().positive(),
  type: z.enum(NPC_TYPES),
  town: z.string().max(100),
  posX: z.number().int(),
  posY: z.number().int(),
  posZ: z.number().int(),
  direction: z.number().int().min(0).max(3),
  shopItems: z.array(npcShopItemSchema),
  /** Script Lua vinculado (cadastro de Script Lua, categoria "npc") — ignorado para "shop". */
  scriptId: z.number().int().nullable(),
  published: z.boolean(),
});

export type NpcInput = z.infer<typeof npcSchema>;
export type NpcShopItemInput = z.infer<typeof npcShopItemSchema>;

/** Converte o formato legado (`buyPriceCrystal`/`sellPriceCrystal` na mesma linha) pro novo
 * formato (uma linha por direção) — preserva dados de NPCs salvos antes dessa mudança. */
export function normalizeShopItems(raw: unknown): NpcShopItemInput[] {
  const rows = Array.isArray(raw) ? raw : [];
  const result: NpcShopItemInput[] = [];

  for (const row of rows as Record<string, unknown>[]) {
    if (row.direction === "buy" || row.direction === "sell") {
      result.push({
        direction: row.direction,
        itemId: typeof row.itemId === "number" ? row.itemId : null,
        name: typeof row.name === "string" ? row.name : "",
        valueCrystal: typeof row.valueCrystal === "number" ? row.valueCrystal : 0,
      });
      continue;
    }

    const itemId = typeof row.itemId === "number" ? row.itemId : null;
    const name = typeof row.name === "string" ? row.name : "";
    const buyPrice = typeof row.buyPriceCrystal === "number" ? row.buyPriceCrystal : 0;
    const sellPrice = typeof row.sellPriceCrystal === "number" ? row.sellPriceCrystal : 0;

    if (buyPrice > 0) result.push({ direction: "buy", itemId, name, valueCrystal: buyPrice });
    if (sellPrice > 0) result.push({ direction: "sell", itemId, name, valueCrystal: sellPrice });
  }

  return result;
}
