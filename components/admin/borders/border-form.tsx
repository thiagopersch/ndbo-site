"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { defaultBorderValues, borderFormSchema, type BorderFormInput } from "@/lib/validations/admin/border";
import { borderToXml } from "@/lib/border-xml";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { NumberField } from "@/components/shared/number-field";
import { BorderEdgeGridField } from "@/components/admin/borders/border-edge-grid-field";

type BorderFormProps = {
  isEditing?: boolean;
  initialValues?: BorderFormInput;
};

export function BorderForm({ isEditing = false, initialValues }: BorderFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BorderFormInput, unknown, BorderFormInput>({
    resolver: zodResolver(borderFormSchema),
    defaultValues: initialValues ?? defaultBorderValues,
  });

  const watched = useWatch({ control: form.control });
  const previewXml = borderToXml({ ...defaultBorderValues, ...watched } as BorderFormInput);

  async function onSubmit(values: BorderFormInput) {
    setIsSubmitting(true);

    const url = isEditing ? `/api/admin/borders/${values.id}` : "/api/admin/borders";
    const method = isEditing ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível salvar o border.");
      return;
    }

    toast.success(isEditing ? "Border atualizado." : "Border criado.");
    router.push("/admin/borders");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados básicos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <NumberField control={form.control} name="id" label="ID" disabled={isEditing} />

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

              <FormField
                control={form.control}
                name="group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(event.target.value === "" ? null : Number(event.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="optional"
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
                    <FormLabel className="!mt-0">Opcional (type=&quot;optional&quot;)</FormLabel>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <Collapsible defaultOpen>
              <CardHeader>
                <CollapsibleTrigger className="w-full justify-between">
                  <CardTitle>Direções (borderitem)</CardTitle>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 data-panel-open:rotate-180" />
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsiblePanel>
                <CardContent>
                  <BorderEdgeGridField control={form.control} />
                </CardContent>
              </CollapsiblePanel>
            </Collapsible>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<Link href="/admin/borders" />}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar border"}
            </Button>
          </div>
        </form>
      </Form>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle>Pré-visualização do XML</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[70vh] overflow-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
            <code>{previewXml}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
