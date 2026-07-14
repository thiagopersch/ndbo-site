import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { postSchema } from "@/lib/validations/admin/post";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  const body = await request.json();
  const parsed = postSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const current = await prisma.post.findUnique({ where: { id: Number(id) } });

  const post = await prisma.post.update({
    where: { id: Number(id) },
    data: {
      ...parsed.data,
      publishedAt:
        parsed.data.published && !current?.published
          ? new Date()
          : parsed.data.published === false
            ? null
            : undefined,
    },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "update",
    entity: "post",
    entityId: post.id,
    metadata: parsed.data,
  });

  return NextResponse.json({ post });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const { id } = await params;
  await prisma.post.delete({ where: { id: Number(id) } });

  await logAudit({
    accountId: Number(session.user.id),
    action: "delete",
    entity: "post",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
