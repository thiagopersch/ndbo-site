"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import type { Looktype } from "@/lib/generated/prisma/client";
import { fileNameToLooktypeName, type LooktypeCategory } from "@/lib/validations/admin/looktype";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LooktypeCategoryFields } from "@/components/admin/looktypes/looktype-category-fields";

const MAX_FILES = 50;

type PendingFile = {
  file: File;
  name: string;
  looktypeNumber: number | null;
};

type LooktypeCreateDialogProps = {
  trigger: React.ReactNode;
  onCreated: (looktype: Looktype) => void;
};

export function LooktypeCreateDialog({ trigger, onCreated }: LooktypeCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState<LooktypeCategory>("item");
  const [sharedLooktypeNumber, setSharedLooktypeNumber] = useState<number | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setCategory("item");
    setSharedLooktypeNumber(null);
    setPendingFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    if (files.length > MAX_FILES) {
      toast.error(`Selecione no máximo ${MAX_FILES} arquivos por vez.`);
      return;
    }

    setPendingFiles(
      files.map((file) => ({
        file,
        name: fileNameToLooktypeName(file.name),
        looktypeNumber: sharedLooktypeNumber,
      })),
    );
  }

  function updatePendingFile(index: number, patch: Partial<PendingFile>) {
    setPendingFiles((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removePendingFile(index: number) {
    setPendingFiles((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (pendingFiles.length === 0) {
      toast.error("Selecione ao menos um arquivo (.obd, PNG ou GIF).");
      return;
    }
    if (pendingFiles.some((row) => !row.name.trim())) {
      toast.error("Informe um nome para todos os arquivos.");
      return;
    }
    if (category !== "item" && pendingFiles.some((row) => row.looktypeNumber === null)) {
      toast.error("Informe o número da sprite no Object Builder para todos os arquivos.");
      return;
    }

    setIsSubmitting(true);

    let createdCount = 0;
    let firstError: string | null = null;

    for (const row of pendingFiles) {
      const formData = new FormData();
      formData.append("file", row.file);
      formData.append("name", row.name.trim());
      formData.append("category", category);
      if (row.looktypeNumber !== null) formData.append("looktypeNumber", String(row.looktypeNumber));

      const response = await fetch("/api/admin/looktypes", { method: "POST", body: formData });

      if (!response.ok) {
        if (!firstError) {
          const data = await response.json().catch(() => null);
          firstError = data?.error ?? `Não foi possível criar "${row.name}".`;
        }
        continue;
      }

      const data = await response.json();
      onCreated(data.looktype);
      createdCount += 1;
    }

    setIsSubmitting(false);

    if (createdCount > 0) toast.success(`${createdCount} looktype(s) criada(s) com sucesso.`);
    if (firstError) toast.error(firstError);

    if (firstError === null) {
      reset();
      setOpen(false);
    }
  }

  const showReview = pendingFiles.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next, eventDetails) => {
        // O seletor de arquivo nativo do SO tira o foco da janela — o base-ui interpreta isso
        // como "focus-out" e tentaria fechar o dialog no meio da seleção. Ignora esse motivo.
        if (eventDetails?.reason === "focus-out") return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className={showReview ? "sm:max-w-2xl" : undefined}>
        <DialogHeader>
          <DialogTitle>Nova sprite / looktype</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Arquivos (.obd, PNG ou GIF — até {MAX_FILES} por vez)</Label>
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              {pendingFiles.length > 0
                ? `${pendingFiles.length} arquivo(s) selecionado(s)`
                : "Selecionar arquivos..."}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".obd,image/png,image/gif"
              multiple
              className="absolute h-px w-px opacity-0"
              onChange={handleFilesSelected}
            />
            <p className="text-xs text-muted-foreground">
              `.obd` do Object Builder vira animação; PNG/GIF ficam estáticos.
            </p>
          </div>

          <LooktypeCategoryFields
            category={category}
            onCategoryChange={setCategory}
            looktypeNumber={sharedLooktypeNumber}
            onLooktypeNumberChange={setSharedLooktypeNumber}
          />

          {showReview && (
            <div className="flex flex-col gap-2">
              <Label>Revisar antes de salvar</Label>
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-md border border-border p-2">
                {pendingFiles.map((row, index) => (
                  <div key={`${row.file.name}-${index}`} className="flex items-center gap-2">
                    <span className="w-40 shrink-0 truncate text-xs text-muted-foreground" title={row.file.name}>
                      {row.file.name}
                    </span>
                    <Input
                      value={row.name}
                      onChange={(event) => updatePendingFile(index, { name: event.target.value })}
                      placeholder="Nome"
                      className="flex-1"
                    />
                    {category !== "item" && (
                      <Input
                        type="number"
                        value={row.looktypeNumber ?? ""}
                        onChange={(event) =>
                          updatePendingFile(index, {
                            looktypeNumber: event.target.value === "" ? null : Number(event.target.value),
                          })
                        }
                        placeholder="Número"
                        className="w-24 shrink-0"
                      />
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => removePendingFile(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || pendingFiles.length === 0}>
              {isSubmitting ? "Criando..." : `Criar${pendingFiles.length > 1 ? ` (${pendingFiles.length})` : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
