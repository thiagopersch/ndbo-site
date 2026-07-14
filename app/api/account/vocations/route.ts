import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";

/** Vocações publicadas — disponíveis para escolha na criação de personagem. */
export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const vocations = await prisma.vocation.findMany({
    where: { published: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return NextResponse.json({ vocations });
}
