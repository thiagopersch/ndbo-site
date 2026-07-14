import type { Monster, Prisma } from "@/lib/generated/prisma/client";
import {
  ELEMENT_KEYS,
  IMMUNITY_KEYS,
  defaultMonsterFlags,
  type ElementKey,
  type ImmunityKey,
  type MonsterFormInput,
} from "@/lib/validations/admin/monster";

export function monsterFormToRow(input: MonsterFormInput) {
  return {
    name: input.name,
    nameDescription: input.nameDescription,
    bestiary: input.bestiary,
    category: input.category,
    subcategory: input.subcategory,
    race: input.race,
    experience: input.experience,
    speed: input.speed,
    manacost: input.manacost,
    healthNow: BigInt(input.healthNow),
    healthMax: BigInt(input.healthMax),
    lookType: input.lookType,
    lookTypeEx: input.lookTypeEx,
    lookHead: input.lookHead,
    lookBody: input.lookBody,
    lookLegs: input.lookLegs,
    lookFeet: input.lookFeet,
    lookAddons: input.lookAddons,
    corpse: input.corpse,
    targetChangeInterval: input.targetChangeInterval,
    targetChangeChance: input.targetChangeChance,
    strategyAttack: input.strategyAttack,
    strategyDefense: input.strategyDefense,
    flags: input.flags as Prisma.InputJsonValue,
    attacks: input.attacks as Prisma.InputJsonValue,
    defenses: { armor: input.defenseArmor, defense: input.defenseValue, list: input.defenses } as Prisma.InputJsonValue,
    immunities: input.immunities as Prisma.InputJsonValue,
    elements: input.elements as Prisma.InputJsonValue,
    voices: { interval: input.voiceInterval, chance: input.voiceChance, list: input.voices } as Prisma.InputJsonValue,
    loot: input.loot as Prisma.InputJsonValue,
    summons: { maxSummons: input.maxSummons, list: input.summons } as Prisma.InputJsonValue,
    script: input.script as Prisma.InputJsonValue,
  };
}

function zeroRecord<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
}

export function monsterRowToFormInput(monster: Monster): MonsterFormInput {
  const defenses = (monster.defenses ?? {}) as { armor?: number; defense?: number; list?: unknown[] };
  const voices = (monster.voices ?? {}) as { interval?: number; chance?: number; list?: unknown[] };
  const summons = (monster.summons ?? {}) as { maxSummons?: number; list?: unknown[] };
  const immunitiesRaw = (monster.immunities ?? {}) as Record<string, number>;
  const elementsRaw = (monster.elements ?? {}) as Record<string, number>;

  return {
    name: monster.name,
    nameDescription: monster.nameDescription,
    bestiary: monster.bestiary,
    category: monster.category,
    subcategory: monster.subcategory,
    race: monster.race,
    experience: monster.experience,
    speed: monster.speed,
    manacost: monster.manacost,
    healthNow: Number(monster.healthNow),
    healthMax: Number(monster.healthMax),
    lookType: monster.lookType,
    lookTypeEx: monster.lookTypeEx,
    lookHead: monster.lookHead,
    lookBody: monster.lookBody,
    lookLegs: monster.lookLegs,
    lookFeet: monster.lookFeet,
    lookAddons: monster.lookAddons,
    corpse: monster.corpse,
    targetChangeInterval: monster.targetChangeInterval,
    targetChangeChance: monster.targetChangeChance,
    strategyAttack: monster.strategyAttack,
    strategyDefense: monster.strategyDefense,
    flags: { ...defaultMonsterFlags, ...(monster.flags as object) },
    attacks: (monster.attacks as MonsterFormInput["attacks"]) ?? [],
    defenseArmor: defenses.armor ?? 0,
    defenseValue: defenses.defense ?? 0,
    defenses: (defenses.list as MonsterFormInput["defenses"]) ?? [],
    immunities: {
      ...zeroRecord(IMMUNITY_KEYS),
      ...Object.fromEntries(IMMUNITY_KEYS.map((key: ImmunityKey) => [key, immunitiesRaw[key] ?? 0])),
    },
    elements: {
      ...zeroRecord(ELEMENT_KEYS),
      ...Object.fromEntries(ELEMENT_KEYS.map((key: ElementKey) => [key, elementsRaw[key] ?? 0])),
    },
    voiceInterval: voices.interval ?? 5000,
    voiceChance: voices.chance ?? 0,
    voices: (voices.list as MonsterFormInput["voices"]) ?? [],
    loot: (monster.loot as MonsterFormInput["loot"]) ?? [],
    maxSummons: summons.maxSummons ?? 0,
    summons: (summons.list as MonsterFormInput["summons"]) ?? [],
    script: (monster.script as string[]) ?? [],
  };
}
