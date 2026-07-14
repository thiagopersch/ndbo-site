import type { Metadata } from "next";
import { notFound } from "next/navigation";
import dayjs from "dayjs";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findFirst({ where: { slug, published: true } });

  return { title: post?.title ?? "Post não encontrado" };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await prisma.post.findFirst({ where: { slug, published: true } });

  if (!post) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">{post.title}</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Publicado em {dayjs(post.publishedAt ?? post.createdAt).format("DD/MM/YYYY")}
      </p>
      <div className="whitespace-pre-wrap text-base leading-relaxed">{post.content}</div>
    </article>
  );
}
