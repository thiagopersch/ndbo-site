"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

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

type LooktypeCreateDialogProps = {
  trigger: React.ReactNode;
  onCreated: (looktype: Looktype) => void;
};

export function LooktypeCreateDialog({ trigger, onCreated }: LooktypeCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState<LooktypeCategory>("item");
  const [looktypeNumber, setLooktypeNumber] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setCategory("item");
    setLooktypeNumber(null);
    setFileName("");
    setName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error("Selecione um arquivo (.obd, PNG ou GIF).");
      return;
    }
    if (!name.trim()) {
      toast.error("Informe um nome.");
      return;
    }
    if (category !== "item" && looktypeNumber === null) {
      toast.error("Informe o número da sprite no Object Builder.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name.trim());
    formData.append("category", category);
    if (looktypeNumber !== null) formData.append("looktypeNumber", String(looktypeNumber));

    setIsSubmitting(true);
    const response = await fetch("/api/admin/looktypes", { method: "POST", body: formData });
    setIsSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível criar a looktype.");
      return;
    }

    const data = await response.json();
    onCreated(data.looktype);
    toast.success("Criado com sucesso.");
    reset();
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova sprite / looktype</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Arquivo (.obd, PNG ou GIF)</Label>
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              {fileName || "Selecionar arquivo..."}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".obd,image/png,image/gif"
              className="hidden"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                setFileName(selected?.name ?? "");
                if (selected) setName((current) => current || fileNameToLooktypeName(selected.name));
              }}
            />
            <p className="text-xs text-muted-foreground">
              `.obd` do Object Builder vira animação; PNG/GIF ficam estáticos.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <LooktypeCategoryFields
            category={category}
            onCategoryChange={setCategory}
            looktypeNumber={looktypeNumber}
            onLooktypeNumberChange={setLooktypeNumber}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
