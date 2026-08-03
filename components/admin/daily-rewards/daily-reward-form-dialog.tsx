"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  dailyRewardMonthlySchema,
  type DailyRewardMonthlyInput,
} from "@/lib/validations/admin/daily-reward";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { NumberField } from "@/components/shared/number-field";
import { EntitySearchCombobox } from "@/components/shared/entity-search-combobox";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { MonthYearFields } from "@/components/shared/month-year-fields";

type NamedRow = { id: number; name: string };

type DailyRewardFormDialogProps = {
  trigger: React.ReactNode;
  title: string;
  defaultValues: DailyRewardMonthlyInput;
  onSubmit: (values: DailyRewardMonthlyInput) => Promise<boolean>;
  successMessage: string;
};

export function DailyRewardFormDialog({
  trigger,
  title,
  defaultValues,
  onSubmit,
  successMessage,
}: DailyRewardFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DailyRewardMonthlyInput, unknown, DailyRewardMonthlyInput>({
    resolver: zodResolver(dailyRewardMonthlySchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(values: DailyRewardMonthlyInput) {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <MonthYearFields control={form.control} yearName="year" monthName="month" />
              <NumberField control={form.control} name="day" label="Dia" />
              <NumberField control={form.control} name="count" label="Quantidade" />
              <NumberField control={form.control} name="clientId" label="Client ID" />
            </div>

            <FormField
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item</FormLabel>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <EntitySearchCombobox<NamedRow>
                        endpoint="/api/admin/items"
                        value={field.value || null}
                        placeholder="Buscar item por nome ou id..."
                        formatOption={(item) => `${item.name} (#${item.id})`}
                        renderOption={(item) => (
                          <span className="flex items-center gap-2">
                            <EntityThumb entityType="item" id={item.id} name={item.name} size="32" />
                            {item.name} (#{item.id})
                          </span>
                        )}
                        onSelect={(item) => field.onChange(item?.id ?? 0)}
                      />
                    </div>
                    {itemId > 0 && <EntityThumb entityType="item" id={itemId} size="32" />}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
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
