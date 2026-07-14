"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { BAN_TYPES, banSchema, type BanInput } from "@/lib/validations/admin/ban";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Ban } from "@/lib/generated/prisma/client";

type BanFormDialogProps = {
  trigger: React.ReactNode;
  ban?: Ban;
  onSaved: () => void;
};

export function BanFormDialog({ trigger, ban, onSaved }: BanFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BanInput>({
    resolver: zodResolver(banSchema),
    defaultValues: {
      type: ban?.type ?? 3,
      value: ban?.value ?? 0,
      reason: ban?.reason ?? 0,
      comment: ban?.comment ?? "",
      statement: ban?.statement ?? "",
      active: ban?.active ?? true,
      expires: ban?.expires ?? 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        type: ban?.type ?? 3,
        value: ban?.value ?? 0,
        reason: ban?.reason ?? 0,
        comment: ban?.comment ?? "",
        statement: ban?.statement ?? "",
        active: ban?.active ?? true,
        expires: ban?.expires ?? 0,
      });
    }
  }, [open, ban, form]);

  async function onSubmit(values: BanInput) {
    setIsSubmitting(true);

    const url = ban ? `/api/admin/bans/${ban.id}` : "/api/admin/bans";
    const method = ban ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      toast.error("Não foi possível salvar o banimento.");
      return;
    }

    toast.success(ban ? "Banimento atualizado." : "Banimento criado.");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ban ? "Editar banimento" : "Novo banimento"}</DialogTitle>
          <DialogDescription>
            Tipo: 1=IP, 2=Personagem, 3=Conta, 4=Notação, 5=Namelock. `value` é o id/IP alvo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BAN_TYPES.map((type) => (
                        <SelectItem key={type.value} value={String(type.value)}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (id do alvo)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expires"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expira em (unix, 0 = permanente)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentário</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
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
