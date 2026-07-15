import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";

/** Só os levels que realmente existem entre as spells cadastradas — usado pelo filtro
 * "Level" da lista, que não deve oferecer valores sem nenhum resultado possível. */
export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  const rows = await prisma.spell.findMany({
    distinct: ["level"],
    select: { level: true },
    orderBy: { level: "asc" },
  });

  return NextResponse.json({ levels: rows.map((row) => row.level) });
}
