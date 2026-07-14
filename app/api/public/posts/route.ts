import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    take: 6,
    select: { id: true, title: true, slug: true, excerpt: true, publishedAt: true },
  });

  return NextResponse.json({ posts });
}
