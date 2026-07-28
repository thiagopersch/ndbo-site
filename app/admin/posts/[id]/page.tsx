import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { PostForm } from "@/components/admin/posts/post-form";

export const metadata: Metadata = {
  title: "Editar post",
};

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) notFound();

  const image = await prisma.entityImage.findUnique({
    where: { entityType_entityId: { entityType: "post", entityId: post.id } },
    select: { extension: true, updatedAt: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar post: {post.title || "Sem título"}</h1>
        <p className="text-muted-foreground">
          As alterações são salvas automaticamente 1 segundo após você sair de um campo.
        </p>
      </div>
      <PostForm
        post={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          page: post.page,
          excerpt: post.excerpt,
          content: post.content,
          published: post.published,
          image: image ? { extension: image.extension, updatedAt: image.updatedAt.toISOString() } : null,
        }}
      />
    </div>
  );
}
