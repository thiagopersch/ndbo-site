import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";

import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildPaginatedResult, parsePaginationParams } from "@/lib/pagination";
import { postSchema } from "@/lib/validations/admin/post";

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const url = new URL(request.url);
  const { page, pageSize, search } = parsePaginationParams(url);

  const where: Prisma.PostWhereInput = search
    ? { OR: [{ title: { contains: search } }, { slug: { contains: search } }] }
    : {};

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResult(posts, total, page, pageSize));
}

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession();
  if (response) return response;

  const body = await request.json();
  const parsed = postSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const existing = await prisma.post.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return NextResponse.json({ error: "Já existe um post com esse slug." }, { status: 409 });
  }

  const post = await prisma.post.create({
    data: {
      ...parsed.data,
      authorId: Number(session.user.id),
      publishedAt: parsed.data.published ? new Date() : null,
    },
  });

  await logAudit({
    accountId: Number(session.user.id),
    action: "create",
    entity: "post",
    entityId: post.id,
    metadata: { title: post.title },
  });

  return NextResponse.json({ post }, { status: 201 });
}
