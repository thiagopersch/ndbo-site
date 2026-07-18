import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { luaScriptSchema } from "@/lib/validations/admin/lua-script";

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);
  const category = url.searchParams.get("category");

  const where: Prisma.LuaScriptWhereInput = {
    ...(search ? { name: { contains: search } } : {}),
    ...(category ? { category } : {}),
  };

  const [scripts, total] = await Promise.all([
    prisma.luaScript.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.luaScript.count({ where }),
  ]);

  return NextResponse.json(
    buildPaginatedResult(scripts, total, page, pageSize),
  );
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = luaScriptSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 422 },
    );
  }

  const existing = await prisma.luaScript.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe um script com esse nome." },
      { status: 409 },
    );
  }

  const luaScript = await prisma.luaScript.create({ data: parsed.data });

  await logAudit({
    accountId: Number(session.user.id),
    action: "create",
    entity: "lua_script",
    entityId: luaScript.id,
    metadata: { name: luaScript.name, category: luaScript.category },
  });

  return NextResponse.json({ luaScript }, { status: 201 });
}
