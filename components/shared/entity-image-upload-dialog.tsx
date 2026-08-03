"use client";

import { useState } from "react";
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
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      // `disablePointerDismissal` bloqueia qualquer fechamento por clique/foco fora do dialog —
      // o seletor de arquivo nativo do SO tira o foco da janela e o base-ui, dependendo do
      // timing, pode interpretar isso de formas diferentes (focus-out, outside-press, ou outra
      // variante interna) como um fechamento, perdendo o upload em andamento. Bloquear a
      // categoria inteira de fechamento por ponteiro/foco é mais robusto que tentar prever cada
      // motivo específico (ver também `eventDetails?.reason` abaixo, mantido como reforço).
      disablePointerDismissal
      onOpenChange={(next, eventDetails) => {
        if (eventDetails?.reason === "focus-out" || eventDetails?.reason === "outside-press") return;
        setOpen(next);
        if (!next) onUploaded?.();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" title="Enviar/trocar imagem">
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
