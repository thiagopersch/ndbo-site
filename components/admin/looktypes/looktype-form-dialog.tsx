"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { looktypeSchema, type LooktypeInput, type LooktypeCategory } from "@/lib/validations/admin/looktype";
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
import { LooktypeUsagePanel } from "@/components/admin/looktypes/looktype-usage-panel";

type LooktypeFormDialogProps = {
  trigger: React.ReactNode;
  title: string;
  looktypeId: number;
  defaultValues: LooktypeInput;
  onSubmit: (values: LooktypeInput) => Promise<boolean>;
  successMessage: string;
};

/** Edição de uma looktype já criada: tipo + número (mesmos campos do create) e um painel
 * mostrando os cadastros reais (NPC/Vocação/Monstro) que referenciam essa sprite. Trocar a
 * imagem em si continua no botão dedicado (`LooktypeImageDialog`). */
export function LooktypeFormDialog({
  trigger,
  title,
  looktypeId,
  defaultValues,
  onSubmit,
  successMessage,
}: LooktypeFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(defaultValues.name);
  const [category, setCategory] = useState<LooktypeCategory>(defaultValues.category);
  const [looktypeNumber, setLooktypeNumber] = useState<number | null>(defaultValues.looktypeNumber);

  useEffect(() => {
    if (open) {
      setName(defaultValues.name);
      setCategory(defaultValues.category);
      setLooktypeNumber(defaultValues.looktypeNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = looktypeSchema.safeParse({ name, category, looktypeNumber });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }

    setIsSubmitting(true);
    const ok = await onSubmit(parsed.data);
    setIsSubmitting(false);

    if (!ok) {
      toast.error("Não foi possível salvar.");
      return;
    }

    toast.success(successMessage);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <LooktypeUsagePanel looktypeId={looktypeId} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
