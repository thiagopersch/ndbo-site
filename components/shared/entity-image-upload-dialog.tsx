"use client";

import { ImageUp } from "lucide-react";

import type { EntityImageType } from "@/lib/entity-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EntityImageUpload } from "@/components/shared/entity-image-upload";
import type { EntityImageInfo } from "@/components/shared/use-entity-images";

type EntityImageUploadDialogProps = {
  entityType: EntityImageType;
  id: number;
  name?: string;
  image?: EntityImageInfo | null;
  onUploaded?: () => void;
};

/** Upload de imagem sem sair da listagem — usado na coluna de ações das tabelas de admin
 * (item, monster, spell, vocation) como atalho para não precisar entrar na tela de edição. */
export function EntityImageUploadDialog({
  entityType,
  id,
  name,
  image,
  onUploaded,
}: EntityImageUploadDialogProps) {
  return (
    <Dialog onOpenChange={(open) => !open && onUploaded?.()}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <ImageUp className="size-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Imagem — {name ? `${name} (#${id})` : `#${id}`}</DialogTitle>
          <DialogDescription>
            Envie ou troque a imagem sem precisar abrir a edição completa.
          </DialogDescription>
        </DialogHeader>
        <EntityImageUpload entityType={entityType} id={id} name={name} currentImage={image} />
      </DialogContent>
    </Dialog>
  );
}
