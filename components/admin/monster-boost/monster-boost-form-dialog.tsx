"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  monsterBoostSchema,
  type MonsterBoostInput,
} from "@/lib/validations/admin/monster-boost";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { NumberField } from "@/components/shared/number-field";
import { EntitySearchCombobox } from "@/components/shared/entity-search-combobox";
import { EntityThumb } from "@/components/shared/entity-thumb";

type MonsterBoostFormDialogProps = {
  trigger: React.ReactNode;
  title: string;
  defaultValues: MonsterBoostInput;
  /** Id do monstro já resolvido pelo caller (edição) — pré-preenche a thumbnail. */
  initialMonsterId?: number | null;
  onSubmit: (values: MonsterBoostInput) => Promise<boolean>;
  successMessage: string;
};

export function MonsterBoostFormDialog({
  trigger,
  title,
  defaultValues,
  initialMonsterId = null,
  onSubmit,
  successMessage,
}: MonsterBoostFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [monsterId, setMonsterId] = useState<number | null>(initialMonsterId);

  const form = useForm<MonsterBoostInput, unknown, MonsterBoostInput>({
    resolver: zodResolver(monsterBoostSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
      setMonsterId(initialMonsterId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(values: MonsterBoostInput) {
    setIsSubmitting(true);
    const ok = await onSubmit(values);
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
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            <FormItem>
              <FormLabel>Monstro (Monster)</FormLabel>
              <div className="flex items-center gap-3">
                <EntitySearchCombobox<{ id: number; name: string }>
                  endpoint="/api/admin/monsters"
                  value={monsterId}
                  placeholder="Buscar monstro..."
                  formatOption={(monster) => monster.name}
                  onSelect={(monster) => {
                    setMonsterId(monster?.id ?? null);
                    form.setValue("monster", monster?.name ?? "");
                  }}
                />
                {monsterId != null && (
                  <EntityThumb entityType="monster" id={monsterId} />
                )}
              </div>
            </FormItem>
            <FormField
              control={form.control}
              name="monster"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <input type="hidden" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <NumberField
              control={form.control}
              name="loot"
              label="Multiplicador de loot (Loot)"
            />
            <NumberField
              control={form.control}
              name="exp"
              label="Multiplicador de experiência (Exp)"
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
