import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { parseVocationsXml } from "@/lib/vocation-xml-parser";
import { vocationInputToPrismaData } from "@/lib/vocation-mapper";

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const formData = await request.formData();
  const file = formData.get("file");
  const replaceExisting = formData.get("replaceExisting") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 422 });
  }

  const xml = await file.text();
  const { vocations, errors } = parseVocationsXml(xml);

  if (vocations.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma vocação válida encontrada no arquivo.", details: errors },
      { status: 422 }
    );
  }

  const classNames = [...new Set(vocations.map((v) => v.typeClassName).filter(Boolean))];
  const universeNames = [...new Set(vocations.map((v) => v.typeUniverseName).filter(Boolean))];

  const classIdByName = new Map<string, number>();
  for (const name of classNames) {
    const record = await prisma.vocationTypeClass.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    classIdByName.set(name, record.id);
  }

  const universeIdByName = new Map<string, number>();
  for (const name of universeNames) {
    const record = await prisma.vocationTypeUniverse.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    universeIdByName.set(name, record.id);
  }

  if (replaceExisting) {
    await prisma.vocation.deleteMany({});
  }

  for (const vocation of vocations) {
    const data = vocationInputToPrismaData({
      ...vocation,
      typeClassId: vocation.typeClassName ? (classIdByName.get(vocation.typeClassName) ?? null) : null,
      typeUniverseId: vocation.typeUniverseName
        ? (universeIdByName.get(vocation.typeUniverseName) ?? null)
        : null,
    });

    await prisma.vocation.upsert({
      where: { id: vocation.id },
      update: data,
      create: data,
    });
  }

  await logAudit({
    accountId: Number(session.user.id),
    action: "import",
    entity: "vocation",
    metadata: { imported: vocations.length, skipped: errors.length, replaceExisting },
  });

  return NextResponse.json({
    imported: vocations.length,
    skipped: errors.length,
    errors: errors.slice(0, 50),
  });
}
