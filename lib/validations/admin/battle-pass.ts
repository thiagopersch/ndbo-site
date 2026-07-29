import { z } from "zod";

export const BATTLE_PASS_MISSION_TYPES = ["kill", "quest", "spell_kill"] as const;
export const BATTLE_PASS_TRACKS = ["bronze", "gold"] as const;
export const BATTLE_PASS_RARITIES = [
  "comum",
  "incomum",
  "raro",
  "super_raro",
  "lendario",
  "mitico",
] as const;

export const battlePassMissionSchema = z.object({
  type: z.enum(BATTLE_PASS_MISSION_TYPES),
  target: z.object({
    monster: z.string().optional(),
    amount: z.number().int().min(1).optional(),
    questId: z.number().int().optional(),
    spell: z.string().optional(),
  }),
  description: z.string().min(1).max(255),
  xpReward: z.number().int().min(0),
  published: z.boolean().default(true),
});

export const battlePassRewardSchema = z.object({
  level: z.number().int().min(1),
  track: z.enum(BATTLE_PASS_TRACKS),
  rarity: z.enum(BATTLE_PASS_RARITIES),
  itemId: z.number().int().positive(),
  count: z.number().int().min(1).default(1),
});

export const battlePassSeasonSchema = z.object({
  maxLevel: z.number().int().min(1).default(100),
  xpPerLevel: z.number().int().min(1).default(1000),
  goldPassItemId: z.number().int().min(0).default(0),
  goldPassCost: z.number().int().min(0).default(0),
});

export type BattlePassMissionInput = z.infer<typeof battlePassMissionSchema>;
export type BattlePassRewardInput = z.infer<typeof battlePassRewardSchema>;
export type BattlePassSeasonInput = z.infer<typeof battlePassSeasonSchema>;

/** Ordem de raridade esperada conforme o level sobe — usado para validar `BattlePassReward`. */
export const RARITY_ORDER: Record<(typeof BATTLE_PASS_RARITIES)[number], number> = {
  comum: 0,
  incomum: 1,
  raro: 2,
  super_raro: 3,
  lendario: 4,
  mitico: 5,
};
