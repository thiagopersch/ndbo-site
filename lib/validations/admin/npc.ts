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

export const npcCustomMessageSchema = z.object({
  text: z.string().min(1, "Informe a mensagem").max(255),
  /** Intervalo mínimo entre tentativas de falar essa mensagem. */
  intervalMs: z.number().int().min(1000),
  /** Chance (%) de falar a mensagem a cada intervalo decorrido. */
  chance: z.number().int().min(1).max(100),
});

/** Mensagens padrão nativas do XML (`<parameter key="message_x" value="..." />`, lidas por
 * `NpcSystem.parseParameters` em `data/npc/lib/npcsystem/main.lua`) — mostradas independente do
 * Tipo do NPC, mas só as de categoria "general" viram `npcHandler:setMessage(...)` no script
 * gerado pra NPCs quest/misc (as de categoria "shop" só fazem sentido no módulo de loja nativo,
 * que só existe pra NPCs do tipo Loja). */
export const NPC_DEFAULT_MESSAGE_KEYS = [
  { key: "message_greet", label: "Saudação (greet)", category: "general" },
  { key: "message_farewell", label: "Despedida (farewell)", category: "general" },
  { key: "message_decline", label: "Recusa (decline)", category: "general" },
  { key: "message_walkaway", label: "Jogador se afastou (walkaway)", category: "general" },
  { key: "message_idletimeout", label: "Tempo ocioso (idletimeout)", category: "general" },
  { key: "message_alreadyfocused", label: "Já em conversa (alreadyfocused)", category: "general" },
  { key: "message_placedinqueue", label: "Colocado na fila (placedinqueue)", category: "general" },
  { key: "message_sendtrade", label: "Abrir negociação (sendtrade)", category: "shop" },
  { key: "message_noshop", label: "Sem itens à venda (noshop)", category: "shop" },
  { key: "message_oncloseshop", label: "Fechar loja (oncloseshop)", category: "shop" },
  { key: "message_onbuy", label: "Ao comprar (onbuy)", category: "shop" },
  { key: "message_onsell", label: "Ao vender (onsell)", category: "shop" },
  { key: "message_missingmoney", label: "Dinheiro insuficiente (missingmoney)", category: "shop" },
  { key: "message_needmoney", label: "Precisa de dinheiro (needmoney)", category: "shop" },
  { key: "message_missingitem", label: "Item insuficiente (missingitem)", category: "shop" },
  { key: "message_needitem", label: "Precisa do item (needitem)", category: "shop" },
  { key: "message_needmorespace", label: "Precisa de mais espaço (needmorespace)", category: "shop" },
  { key: "message_needspace", label: "Precisa de espaço (needspace)", category: "shop" },
  { key: "message_buy", label: "Confirmar compra (buy)", category: "shop" },
  { key: "message_sell", label: "Confirmar venda (sell)", category: "shop" },
  { key: "message_bought", label: "Compra concluída (bought)", category: "shop" },
  { key: "message_sold", label: "Venda concluída (sold)", category: "shop" },
] as const;
export type NpcDefaultMessageKey = (typeof NPC_DEFAULT_MESSAGE_KEYS)[number]["key"];

export const npcDefaultMessagesSchema = z.record(z.string(), z.string());
export type NpcDefaultMessagesInput = z.infer<typeof npcDefaultMessagesSchema>;

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
  /** Falas ambiente geradas no script padrão — ignoradas quando `scriptId` está vinculado
   * (o script do admin tem prioridade e não é sobrescrito). */
  customMessages: z.array(npcCustomMessageSchema),
  /** Mensagens padrão do XML nativo (ver `NPC_DEFAULT_MESSAGE_KEYS`) — chave só entra no
   * XML/script gerado quando o valor não é vazio. */
  defaultMessages: npcDefaultMessagesSchema,
  published: z.boolean(),
});

export type NpcInput = z.infer<typeof npcSchema>;
export type NpcShopItemInput = z.infer<typeof npcShopItemSchema>;
export type NpcCustomMessageInput = z.infer<typeof npcCustomMessageSchema>;

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

/** Normaliza o JSON salvo (`Npc.defaultMessages`) pro formato do formulário — tolera `null`
 * (NPCs criados antes desse campo existir) e descarta chaves desconhecidas/malformadas. */
export function normalizeDefaultMessages(raw: unknown): NpcDefaultMessagesInput {
  if (raw == null || typeof raw !== "object") return {};

  const validKeys = new Set<string>(NPC_DEFAULT_MESSAGE_KEYS.map((entry) => entry.key));
  const result: NpcDefaultMessagesInput = {};

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (validKeys.has(key) && typeof value === "string" && value.length > 0) {
      result[key] = value;
    }
  }

  return result;
}

/** Normaliza o JSON salvo (`Npc.customMessages`) pro formato do formulário — tolera `null`
 * (NPCs criados antes desse campo existir) e linhas malformadas. */
export function normalizeCustomMessages(raw: unknown): NpcCustomMessageInput[] {
  const rows = Array.isArray(raw) ? raw : [];
  const result: NpcCustomMessageInput[] = [];

  for (const row of rows as Record<string, unknown>[]) {
    if (typeof row.text !== "string" || !row.text) continue;
    result.push({
      text: row.text,
      intervalMs: typeof row.intervalMs === "number" ? row.intervalMs : 30000,
      chance: typeof row.chance === "number" ? row.chance : 100,
    });
  }

  return result;
}
