"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  chestRewardSchema,
  type ChestRewardInput,
} from "@/lib/validations/admin/chest-reward";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { NumberField } from "@/components/shared/number-field";
import { EntitySearchCombobox } from "@/components/shared/entity-search-combobox";
import { EntityThumb } from "@/components/shared/entity-thumb";

type ChestRewardFormDialogProps = {
  trigger: React.ReactNode;
  title: string;
  defaultValues: ChestRewardInput;
  onSubmit: (values: ChestRewardInput) => Promise<boolean>;
  successMessage: string;
};

export function ChestRewardFormDialog({
  trigger,
  title,
  defaultValues,
  onSubmit,
  successMessage,
}: ChestRewardFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ChestRewardInput, unknown, ChestRewardInput>({
    resolver: zodResolver(chestRewardSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(values: ChestRewardInput) {
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

  const itemId = form.watch("itemId");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormItem>
              <FormLabel>Item</FormLabel>
              <div className="flex items-center gap-3">
                <EntitySearchCombobox<{ id: number; name: string }>
                  endpoint="/api/admin/items"
                  value={itemId || null}
                  placeholder="Buscar item..."
                  formatOption={(item) => `${item.name} (#${item.id})`}
                  onSelect={(item) => form.setValue("itemId", item?.id ?? 0)}
                />
                {itemId > 0 && <EntityThumb entityType="item" id={itemId} />}
              </div>
            </FormItem>
            <FormField
              control={form.control}
              name="itemId"
              render={() => <FormMessage />}
            />
            <NumberField control={form.control} name="count" label="Quantidade" />
            <NumberField
              control={form.control}
              name="weight"
              label="Peso (chance relativa de sorteio)"
            />
            <FormField
              control={form.control}
              name="published"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Publicado (ativo no baú)</FormLabel>
                </FormItem>
              )}
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
