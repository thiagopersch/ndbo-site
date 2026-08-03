"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import type { EntityImageType } from "@/lib/entity-image";
import type { Looktype } from "@/lib/generated/prisma/client";
import { LOOKTYPE_CATEGORY_LABELS, formatLooktypeOption, type LooktypeCategory } from "@/lib/validations/admin/looktype";
import { Button } from "@/components/ui/button";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { EntitySearchCombobox } from "@/components/shared/entity-search-combobox";
import type { EntityImageInfo } from "@/components/shared/use-entity-images";

type EntityImageUploadProps = {
  entityType: EntityImageType;
  id: number;
  name?: string;
  currentImage?: EntityImageInfo | null;
};

/** Upload imediato (independente do resto do form — a entidade já precisa existir, então esta
 * seção só aparece em modo de edição, nunca em "novo"). */
export function EntityImageUpload({ entityType, id, name, currentImage }: EntityImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<EntityImageInfo | null | undefined>(currentImage);
  const [isUploading, setIsUploading] = useState(false);
  const [showLooktypePicker, setShowLooktypePicker] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/admin/images/${entityType}/${id}`, {
      method: "POST",
      body: formData,
    });

    setIsUploading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível enviar a imagem.");
      return;
    }

    const data = await response.json();
    setImage({ extension: data.image.extension, updatedAt: data.image.updatedAt, looktype: data.image.looktype ?? null });
    toast.success("Imagem atualizada.");
  }

  async function handleRemove() {
    setIsUploading(true);
    const response = await fetch(`/api/admin/images/${entityType}/${id}`, { method: "DELETE" });
    setIsUploading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível remover a imagem.");
      return;
    }

    setImage(null);
    toast.success("Imagem removida.");
  }

  async function handleLinkLooktype(looktype: Looktype | null) {
    if (!looktype) return;

    setIsUploading(true);
    const response = await fetch(`/api/admin/images/${entityType}/${id}/link-looktype`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ looktypeId: looktype.id }),
    });
    setIsUploading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível vincular a sprite.");
      return;
    }

    const data = await response.json();
    setImage({ extension: data.image.extension, updatedAt: data.image.updatedAt, looktype: data.image.looktype });
    setShowLooktypePicker(false);
    toast.success("Sprite vinculada a partir do cadastro de looktypes.");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <EntityThumb entityType={entityType} id={id} name={name} size="md" image={image} />
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? "Enviando..." : image ? "Trocar imagem" : "Enviar imagem"}
          </Button>
          {image && (
            <Button type="button" variant="ghost" size="sm" disabled={isUploading} onClick={handleRemove}>
              Remover imagem
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isUploading}
            onClick={() => setShowLooktypePicker((v) => !v)}
          >
            Vincular sprite do cadastro
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".obd,image/png,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {showLooktypePicker && (
        <EntitySearchCombobox<Looktype>
          endpoint="/api/admin/looktypes"
          value={null}
          placeholder="Buscar sprite/looktype por id ou número..."
          formatOption={(lt) =>
            `${formatLooktypeOption(lt)} — ${LOOKTYPE_CATEGORY_LABELS[lt.category as LooktypeCategory] ?? lt.category}`
          }
          onSelect={handleLinkLooktype}
        />
      )}
      <p className="text-xs text-muted-foreground">
        PNG ou GIF (até 2MB) ficam estáticos. Envie um `.obd` do Object Builder (até 8MB) para animação
        automática — cria/atualiza uma sprite no cadastro de looktypes e vincula por baixo dos panos.
      </p>
    </div>
  );
}
