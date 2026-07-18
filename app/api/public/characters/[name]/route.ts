import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ name: string }> };

/** Slots de equipamento raiz do inventário: itens equipados têm `pid` = `CONST_SLOT_*` do
 * engine (1 head, 2 necklace, 3 backpack, 4 armor, 5 right-hand, 6 left-hand, 7 legs,
 * 8 feet, 9 ring, 10 ammo) — `sid` é só um id sequencial único da linha, não o slot
 * (confirmado direto na tabela `player_items`: um item equipado tem `pid=4` (armor),
 * não `pid=0`; itens dentro de um container têm `pid` = `sid` do container pai). */
const EQUIPMENT_SLOTS = [
  { pid: 1, key: "head" },
  { pid: 2, key: "necklace" },
  { pid: 3, key: "backpack" },
  { pid: 4, key: "armor" },
  { pid: 5, key: "rightHand" },
  { pid: 6, key: "leftHand" },
  { pid: 7, key: "legs" },
  { pid: 8, key: "feet" },
  { pid: 9, key: "ring" },
  { pid: 10, key: "ammo" },
] as const;
export type EquipmentSlotKey = (typeof EQUIPMENT_SLOTS)[number]["key"];

export async function GET(_request: Request, { params }: Params) {
  const { name } = await params;

  const player = await prisma.player.findFirst({
    where: { name: decodeURIComponent(name), deleted: 0 },
    select: {
      id: true,
      name: true,
      level: true,
      vocation: true,
      experience: true,
      sex: true,
      online: true,
      lastlogin: true,
      rankId: true,
      resets: true,
      balance: true,
      cap: true,
      soul: true,
    },
  });

  if (!player) {
    return NextResponse.json(
      { error: "Personagem não encontrado." },
      { status: 404 },
    );
  }

  const [rank, vocation, equippedItems] = await Promise.all([
    player.rankId
      ? prisma.guildRank.findUnique({
          where: { id: player.rankId },
          include: { guild: { select: { id: true, name: true } } },
        })
      : null,
    prisma.vocation.findUnique({
      where: { id: player.vocation },
      select: { name: true },
    }),
    prisma.playerItem.findMany({
      where: {
        playerId: player.id,
        pid: { in: EQUIPMENT_SLOTS.map((slot) => slot.pid) },
      },
      select: { pid: true, itemtype: true },
    }),
  ]);

  const itemIdByPid = new Map(
    equippedItems.map((row) => [row.pid, row.itemtype]),
  );
  const itemIds = Array.from(new Set(equippedItems.map((row) => row.itemtype)));

  const [items, images] = await Promise.all([
    itemIds.length
      ? prisma.item.findMany({
          where: { id: { in: itemIds } },
          select: {
            id: true,
            name: true,
            description: true,
            weight: true,
            skills: true,
          },
        })
      : Promise.resolve([]),
    itemIds.length
      ? prisma.entityImage.findMany({
          where: { entityType: "item", entityId: { in: itemIds } },
          select: { entityId: true, extension: true, updatedAt: true },
        })
      : Promise.resolve([]),
  ]);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const imageByItemId = new Map(images.map((image) => [image.entityId, image]));

  const equipment = Object.fromEntries(
    EQUIPMENT_SLOTS.map(({ pid, key }) => {
      const itemId = itemIdByPid.get(pid);
      if (itemId == null) return [key, null];

      const item = itemById.get(itemId);
      const image = imageByItemId.get(itemId);
      const skills = (item?.skills as Record<string, number> | null) ?? {};
      return [
        key,
        {
          itemId,
          name: item?.name ?? `Item ${itemId}`,
          description: item?.description ?? "",
          weight: item?.weight ?? 0,
          skills: Object.fromEntries(
            Object.entries(skills).filter(([, value]) => value),
          ),
          image: image
            ? { extension: image.extension, updatedAt: image.updatedAt }
            : null,
        },
      ];
    }),
  );

  return NextResponse.json({
    player: {
      ...player,
      vocationName: vocation?.name ?? "Desconhecida",
      experience: player.experience.toString(),
      guild: rank
        ? { id: rank.guild.id, name: rank.guild.name, rank: rank.name }
        : null,
      equipment,
    },
  });
}
