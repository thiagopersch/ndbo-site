import { z } from "zod";

/** Tipo da sprite — outfits/effects/missiles usam a numeração do Object Builder; items usam o
 * próprio clientId do items.xml, então não pedimos "número da sprite" pra eles. */
export const LOOKTYPE_CATEGORIES = ["item", "outfit", "effect", "missile"] as const;
export type LooktypeCategory = (typeof LOOKTYPE_CATEGORIES)[number];

export const LOOKTYPE_CATEGORY_LABELS: Record<LooktypeCategory, string> = {
  item: "Item",
  outfit: "Outfit",
  effect: "Efeito",
  missile: "Distance effect",
};

/** "Looktype" é o termo correto só para outfits (numeração de aparência de personagem); os
 * demais tipos são genericamente "Sprite". */
export function spriteTermFor(category: string): string {
  return category === "outfit" ? "Looktype" : "Sprite";
}

export const looktypeSchema = z
  .object({
    name: z.string().min(1, "Informe um nome").max(150),
    category: z.enum(LOOKTYPE_CATEGORIES),
    looktypeNumber: z.number().int().min(0).nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.category !== "item" && data.looktypeNumber === null) {
      ctx.addIssue({
        code: "custom",
        path: ["looktypeNumber"],
        message: "Informe o número da sprite no Object Builder.",
      });
    }
  });

export type LooktypeInput = z.infer<typeof looktypeSchema>;

export const defaultLooktypeValues: LooktypeInput = {
  name: "",
  category: "item",
  looktypeNumber: null,
};

/** Nome do arquivo sem extensão, usado pra pré-preencher o campo "Nome" no create. */
export function fileNameToLooktypeName(fileName: string): string {
  return fileName.replace(/\.[^./\\]+$/, "");
}

/** Label padrão "id — nome (número)" usado em todo select/combobox que escolhe uma looktype do
 * cadastro (NPCs, Tasks, "Vincular sprite do cadastro" em item/monstro/spell/vocação/post) —
 * mesmo formato em todo lugar, pro admin reconhecer a sprite pelo nome, não só pelo id cru. */
export function formatLooktypeOption(lt: { id: number; name: string; looktypeNumber: number | null }): string {
  return `#${lt.id} — ${lt.name}${lt.looktypeNumber !== null ? ` (nº ${lt.looktypeNumber})` : ""}`;
}
