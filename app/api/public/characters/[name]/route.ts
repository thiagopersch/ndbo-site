import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ name: string }> };

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
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Personagem não encontrado." }, { status: 404 });
  }

  const rank = player.rankId
    ? await prisma.guildRank.findUnique({
        where: { id: player.rankId },
        include: { guild: { select: { id: true, name: true } } },
      })
    : null;

  return NextResponse.json({
    player: {
      ...player,
      experience: player.experience.toString(),
      guild: rank ? { id: rank.guild.id, name: rank.guild.name, rank: rank.name } : null,
    },
  });
}
