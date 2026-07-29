import { z } from "zod";

import { TASK_DIFFICULTIES } from "@/lib/task-difficulty";

export const taskMonsterSchema = z.object({
  name: z.string().min(1, "Selecione um monstro"),
  kills: z.number().int().min(1),
});

export const taskRewardItemSchema = z.object({
  itemId: z.number().int().min(1, "Selecione um item"),
  count: z.number().int().min(1),
});

export const taskDefinitionSchema = z.object({
  id: z
    .string()
    .min(1, "Informe o identificador")
    .max(50)
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e underscore"),
  name: z.string().min(1, "Informe o nome").max(255),
  lookType: z.number().int().min(0),
  categoryId: z.number().int().min(1, "Selecione uma categoria"),
  type: z.string().min(1).max(20),
  difficulty: z.enum(TASK_DIFFICULTIES, { message: "Selecione uma dificuldade" }),
  levelRequired: z.number().int().min(0),
  rankRequired: z.number().int().min(0),
  killsRequired: z.number().int().min(0),
  points: z.number().int().min(0),
  experience: z.number().int().min(0),
  money: z.number().int().min(0),
  published: z.boolean(),
  monsters: z.array(taskMonsterSchema).min(1, "Adicione ao menos um monstro"),
  rewardItems: z.array(taskRewardItemSchema),
  deliveryEnabled: z.boolean(),
  deliveryItemId: z.number().int().min(0),
  deliveryCount: z.number().int().min(0),
  postId: z.number().int().nullable(),
});

export type TaskDefinitionInput = z.infer<typeof taskDefinitionSchema>;

export const defaultTaskDefinitionValues: TaskDefinitionInput = {
  id: "",
  name: "",
  lookType: 0,
  categoryId: 0,
  type: "kill",
  difficulty: "easy",
  levelRequired: 0,
  rankRequired: 0,
  killsRequired: 0,
  points: 0,
  experience: 0,
  money: 0,
  published: true,
  monsters: [],
  rewardItems: [],
  deliveryEnabled: false,
  deliveryItemId: 0,
  deliveryCount: 0,
  postId: null,
};

type TaskMonster = z.infer<typeof taskMonsterSchema>;
type TaskMonsterDetail = {
  name: string;
  level: number;
  size: string;
  location: string;
  probability: number;
};

/** Payload que vai pro Prisma (colunas JSON) a partir dos campos "achatados" do formulário.
 * `categoryName` resolve `categoryId` -> `category` (string denormalizada que o
 * `task_db_loader.lua` lê — nunca fica dessincronizada, ver `/api/admin/categories`). */
export function taskDefinitionInputToRow(input: TaskDefinitionInput, categoryName: string) {
  const { categoryId, rewardItems, deliveryEnabled, deliveryItemId, deliveryCount, monsters, ...rest } = input;

  return {
    ...rest,
    categoryId,
    category: categoryName,
    monsters,
    rewards: { items: rewardItems.map((item) => [item.itemId, item.count]) },
    delivery: deliveryEnabled
      ? { enabled: true, itemId: deliveryItemId, count: deliveryCount }
      : { enabled: false },
    monsterDetails: monsters.map(
      (monster: TaskMonster): TaskMonsterDetail => ({
        name: monster.name,
        level: 0,
        size: "Unknown",
        location: "Unknown",
        probability: 0,
      }),
    ),
  };
}
