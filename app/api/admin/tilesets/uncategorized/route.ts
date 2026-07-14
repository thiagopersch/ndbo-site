import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";

/** Lista Ground/WallBrush/DoodadBrush ainda sem `tilesetCategoryId` — usada pela
 * ferramenta "Brushes sem categoria" para fechar a migração de dados legados
 * (criados antes desta feature existir) sem forçar uma migração destrutiva no banco. */
export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  const [grounds, walls, doodads] = await Promise.all([
    prisma.ground.findMany({ where: { tilesetCategoryId: null }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.wallBrush.findMany({ where: { tilesetCategoryId: null }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.doodadBrush.findMany({ where: { tilesetCategoryId: null }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
  ]);

  return NextResponse.json({ grounds, walls, doodads });
}
