import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { LUA_SCRIPT_CATEGORIES } from "@/lib/validations/admin/lua-script";

/**
 * Import de um ou mais arquivos `.lua` de uma vez — diferente do import de Item/Movement
 * (um XML com várias linhas), aqui cada arquivo enviado vira um `LuaScript` próprio
 * (`name` = nome do arquivo). A categoria é obrigatória e se aplica a todos os arquivos
 * do lote (reflete o fato de que, na prática, se importa uma pasta de scripts por vez).
 */
export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);
  const category = formData.get("category");
  const replaceExisting = formData.get("replaceExisting") === "true";

  if (
    typeof category !== "string" ||
    !LUA_SCRIPT_CATEGORIES.includes(category as never)
  ) {
    return NextResponse.json(
      { error: "Selecione a categoria (pasta de scripts) para importar." },
      { status: 422 },
    );
  }

  if (files.length === 0) {
    return NextResponse.json(
      { error: "Selecione ao menos um arquivo .lua." },
      { status: 422 },
    );
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const file of files) {
    if (!file.name.endsWith(".lua")) {
      skipped += 1;
      errors.push(`${file.name}: não é um arquivo .lua`);
      continue;
    }

    const content = await file.text();
    const existing = await prisma.luaScript.findUnique({
      where: { name: file.name },
    });

    if (existing && !replaceExisting) {
      skipped += 1;
      errors.push(
        `${file.name}: já existe (marque "substituir" para sobrescrever)`,
      );
      continue;
    }

    await prisma.luaScript.upsert({
      where: { name: file.name },
      update: { content, category },
      create: { name: file.name, content, category },
    });
    imported += 1;
  }

  await logAudit({
    accountId: Number(session.user.id),
    action: "import",
    entity: "lua_script",
    metadata: { imported, skipped, category, replaceExisting },
  });

  return NextResponse.json({ imported, skipped, errors: errors.slice(0, 50) });
}
