import path from "node:path";

import { NextResponse } from "next/server";

import { requireSiteAdminSession } from "@/lib/api-guard";
import { withAudit } from "@/lib/api-audit-wrapper";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  InvalidServerPathError,
  inferLuaScriptCategory,
  readServerFile,
  writeServerFile,
} from "@/lib/server-files";

export const GET = withAudit(async function GET(request: Request) {
  const { response } = await requireSiteAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const relativePath = url.searchParams.get("path");

  if (!relativePath) {
    return NextResponse.json({ error: "Informe o caminho do arquivo." }, { status: 422 });
  }

  try {
    const content = await readServerFile(relativePath);
    const category =
      path.extname(relativePath).toLowerCase() === ".lua"
        ? inferLuaScriptCategory(relativePath)
        : null;

    const linkedLuaScript = category
      ? await prisma.luaScript.findUnique({
          where: { name_category: { name: path.basename(relativePath), category } },
          select: { id: true },
        })
      : null;

    return NextResponse.json({
      path: relativePath,
      content,
      category,
      luaScriptId: linkedLuaScript?.id ?? null,
    });
  } catch (error) {
    if (error instanceof InvalidServerPathError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }
    throw error;
  }
});

export const PUT = withAudit(async function PUT(request: Request) {
  const { session, response } = await requireSiteAdminSession();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const relativePath = body?.path;
  const content = body?.content;

  if (typeof relativePath !== "string" || !relativePath) {
    return NextResponse.json({ error: "Informe o caminho do arquivo." }, { status: 422 });
  }
  if (typeof content !== "string") {
    return NextResponse.json({ error: "Conteúdo inválido." }, { status: 422 });
  }

  try {
    await writeServerFile(relativePath, content);

    // Um `.lua` dentro de uma pasta de categoria reconhecida (`data/{categoria}/scripts/*.lua`)
    // também sincroniza com a tabela `LuaScript` (por nome+categoria) — outros arquivos (xml,
    // sql, py, ou `.lua` fora de pasta de categoria) só existem em disco, não há tabela
    // genérica de "arquivo" no banco pra eles.
    const category =
      path.extname(relativePath).toLowerCase() === ".lua"
        ? inferLuaScriptCategory(relativePath)
        : null;

    let linkedLuaScriptId: number | null = null;
    if (category) {
      const name = path.basename(relativePath);
      const luaScript = await prisma.luaScript.upsert({
        where: { name_category: { name, category } },
        update: { content },
        create: { name, content, category },
      });
      linkedLuaScriptId = luaScript.id;
    }

    await logAudit({
      accountId: Number(session.user.id),
      action: "update",
      entity: "server_file",
      entityId: relativePath,
      metadata: { path: relativePath, category, linkedLuaScriptId },
    });

    return NextResponse.json({ path: relativePath, linkedLuaScriptId });
  } catch (error) {
    if (error instanceof InvalidServerPathError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }
    throw error;
  }
});
