"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { questSchema, type QuestInput } from "@/lib/validations/admin/quest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NumberField } from "@/components/shared/number-field";
import { EntitySearchCombobox } from "@/components/shared/entity-search-combobox";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { CategorySelect } from "@/components/admin/categories/category-select";
import { QuestImageUpload } from "@/components/admin/quests/quest-image-upload";

type QuestFormProps = {
  questId?: number;
  imageUrl?: string | null;
  defaultValues: QuestInput;
  onSubmit: (values: QuestInput) => Promise<boolean>;
  successMessage: string;
};

export function QuestForm({ questId, imageUrl, defaultValues, onSubmit, successMessage }: QuestFormProps) {
  const router = useRouter();
  const isEditing = questId != null;

  const form = useForm<QuestInput, unknown, QuestInput>({
    resolver: zodResolver(questSchema),
    defaultValues,
  });

  const rewardItems = useFieldArray({ control: form.control, name: "rewardItems" });

  async function handleSubmit(values: QuestInput) {
    const ok = await onSubmit(values);

    if (!ok) {
      toast.error("Não foi possível salvar.");
      return;
    }

    toast.success(successMessage);
    router.push("/admin/quests");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <Tabs defaultValue="identification">
          <TabsList>
            <TabsTrigger value="identification">Identificação</TabsTrigger>
            <TabsTrigger value="rewards">Recompensas</TabsTrigger>
            <TabsTrigger value="image">Imagem</TabsTrigger>
          </TabsList>

          <TabsContent value="identification" className="flex flex-col gap-4">
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
                  <FormLabel className="!mt-0">Publicada (visível para os jogadores)</FormLabel>
                </FormItem>
              )}
            />

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
              <CategorySelect control={form.control} name="categoryId" />
              <NumberField control={form.control} name="levelRequired" label="Level mínimo" />
              <NumberField control={form.control} name="rewardExp" label="Recompensa: Experiência" />
              <NumberField control={form.control} name="rewardMoney" label="Recompensa: Dinheiro" />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="rewards">
            <div className="flex flex-col gap-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Itens de recompensa</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => rewardItems.append({ itemId: 0, count: 1 })}
                >
                  <Plus className="size-4" />
                  Adicionar
                </Button>
              </div>
              {rewardItems.fields.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum item de recompensa.</p>
              )}
              {rewardItems.fields.map((rowField, index) => {
                const itemId = form.watch(`rewardItems.${index}.itemId`);
                return (
                  <div key={rowField.id} className="flex items-end gap-2">
                    {itemId > 0 && <EntityThumb entityType="item" id={itemId} size="32" />}
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name={`rewardItems.${index}.itemId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item</FormLabel>
                            <EntitySearchCombobox<{ id: number; name: string }>
                              endpoint="/api/admin/items"
                              value={field.value || null}
                              placeholder="Buscar item..."
                              formatOption={(item) => `${item.name} (#${item.id})`}
                              renderOption={(item) => (
                                <span className="flex items-center gap-2">
                                  <EntityThumb entityType="item" id={item.id} name={item.name} size="32" />
                                  {item.name} (#{item.id})
                                </span>
                              )}
                              onSelect={(item) => field.onChange(item?.id ?? 0)}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="w-28">
                      <NumberField control={form.control} name={`rewardItems.${index}.count`} label="Quantidade" />
                    </div>
                    <Button type="button" variant="destructive" size="icon-sm" onClick={() => rewardItems.remove(index)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="image">
            {isEditing ? (
              <QuestImageUpload questId={questId} imageUrl={imageUrl ?? null} onChange={() => router.refresh()} />
            ) : (
              <p className="text-sm text-muted-foreground">Salve a quest primeiro para poder enviar uma imagem.</p>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/quests")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
