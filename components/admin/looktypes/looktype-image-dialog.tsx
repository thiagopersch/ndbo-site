"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import type { Looktype } from "@/lib/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LooktypeAnimatedImage } from "@/components/shared/looktype-animated-image";

type LooktypeImageDialogProps = {
  trigger: React.ReactNode;
  looktype: Looktype;
  onUpdated: (looktype: Looktype) => void;
};

/** Aceita `.obd` (Object Builder — vira animação, ver `lib/obd/`) ou PNG/GIF estático. */
export function LooktypeImageDialog({ trigger, looktype, onUpdated }: LooktypeImageDialogProps) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(looktype);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/admin/looktypes/${looktype.id}/image`, {
      method: "POST",
      body: formData,
    });

    setIsUploading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível processar o arquivo.");
      return;
    }

    const data = await response.json();
    setCurrent(data.looktype);
    onUpdated(data.looktype);
    toast.success("Imagem atualizada.");
  }

  async function handleRemove() {
    setIsUploading(true);
    const response = await fetch(`/api/admin/looktypes/${looktype.id}/image`, { method: "DELETE" });
    setIsUploading(false);

    if (!response.ok) {
      toast.error("Não foi possível remover a imagem.");
      return;
    }

    const data = await response.json();
    setCurrent(data.looktype);
    onUpdated(data.looktype);
    toast.success("Imagem removida.");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next, eventDetails) => {
        // O seletor de arquivo nativo do SO tira o foco da janela — o base-ui interpreta isso
        // como "focus-out" e tentaria fechar o dialog no meio do upload. Ignora esse motivo.
        if (eventDetails?.reason === "focus-out") return;
        setOpen(next);
        if (next) setCurrent(looktype);
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Imagem — looktype #{looktype.id}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <LooktypeAnimatedImage
            key={current.frameCount}
            looktypeId={current.id}
            frameCount={current.frameCount}
            frameDurationsMs={current.frameDurationsMs as number[]}
            updatedAt={current.updatedAt}
            size="lg"
          />
          {current.category && (
            <p className="text-xs text-muted-foreground">
              Categoria detectada: {current.category} · {current.frameCount} frame(s)
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={isUploading} onClick={() => inputRef.current?.click()}>
              {isUploading ? "Enviando..." : "Enviar .obd / PNG / GIF"}
            </Button>
            {current.frameCount > 0 && (
              <Button type="button" variant="ghost" disabled={isUploading} onClick={handleRemove}>
                Remover
              </Button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".obd,image/png,image/gif"
            className="absolute h-px w-px opacity-0"
            onChange={handleFileChange}
          />
          <p className="text-center text-xs text-muted-foreground">
            Arquivos `.obd` do Object Builder viram animação (outfit anda para o sul; item/efeito/missile ciclam os
            frames). PNG/GIF ficam estáticos.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
