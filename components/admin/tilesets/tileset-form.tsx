"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { defaultTilesetValues, tilesetFormSchema, type TilesetFormInput } from "@/lib/validations/admin/tileset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NumberField } from "@/components/shared/number-field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type TilesetFormProps = {
  tilesetId?: number;
  initialValues?: TilesetFormInput;
  /** Após criar, para onde navegar (padrão: direto para o detalhe, onde categorias são gerenciadas). */
  onSaved?: (tilesetId: number) => void;
};

export function TilesetForm({ tilesetId, initialValues, onSaved }: TilesetFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = tilesetId != null;

  const form = useForm<TilesetFormInput, unknown, TilesetFormInput>({
    resolver: zodResolver(tilesetFormSchema),
    defaultValues: initialValues ?? defaultTilesetValues,
  });

  async function onSubmit(values: TilesetFormInput) {
    setIsSubmitting(true);

    const url = isEditing ? `/api/admin/tilesets/${tilesetId}` : "/api/admin/tilesets";
    const method = isEditing ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    setIsSubmitting(false);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      toast.error(data?.error ?? "Não foi possível salvar o tileset.");
      return;
    }

    toast.success(isEditing ? "Tileset atualizado." : "Tileset criado.");

    if (onSaved) {
      onSaved(data.tileset.id);
    } else if (!isEditing) {
      router.push(`/admin/tilesets/${data.tileset.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <NumberField control={form.control} name="order" label="Ordem" />

          <FormField
            control={form.control}
            name="icon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ícone (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 sm:mt-6">
                <FormControl>
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                </FormControl>
                <FormLabel className="!mt-0">
                  Ativo (aparece na exportação do tilesets.xml)
                </FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rawIdsInBrush"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 sm:col-span-2">
                <FormControl>
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                </FormControl>
                <FormLabel className="!mt-0">
                  Ids do raw aparecem no brush (misturados na mesma tag, ex.:{" "}
                  <code>terrain_and_raw</code>). Se desmarcado, saem numa tag{" "}
                  <code>&lt;raw&gt;</code> separada ao exportar.
                </FormLabel>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (opcional)</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar tileset"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
