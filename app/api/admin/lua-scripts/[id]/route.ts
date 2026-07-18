import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { luaScriptSchema } from "@/lib/validations/admin/lua-script";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const luaScript = await prisma.luaScript.findUnique({
    where: { id: Number(id) },
  });

  if (!luaScript) {
    return NextResponse.json(
      { error: "Script não encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json({ luaScript });
}

export async function PATCH(request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const body = await request.json();
  const parsed = luaScriptSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 422 },
    );
  }

  if (parsed.data.name) {
    const duplicate = await prisma.luaScript.findFirst({
      where: { name: parsed.data.name, NOT: { id: Number(id) } },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Já existe um script com esse nome." },
        { status: 409 },
      );
    }
  }

  const luaScript = await prisma.luaScript.update({
    where: { id: Number(id) },
    data: parsed.data,
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "update",
    entity: "lua_script",
    entityId: luaScript.id,
    metadata: { name: luaScript.name, category: luaScript.category },
  });

  return NextResponse.json({ luaScript });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  await prisma.luaScript.delete({ where: { id: Number(id) } });

  await logAudit({
    accountId: Number(session.user.id),
    action: "delete",
    entity: "lua_script",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
