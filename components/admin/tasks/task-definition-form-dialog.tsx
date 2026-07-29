"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  taskDefinitionSchema,
  type TaskDefinitionInput,
} from "@/lib/validations/admin/task-definition";
import { TASK_DIFFICULTIES, TASK_DIFFICULTY_LABELS } from "@/lib/task-difficulty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberField } from "@/components/shared/number-field";
import { FormattedNumberField } from "@/components/shared/formatted-number-field";
import { EntitySearchCombobox } from "@/components/shared/entity-search-combobox";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { CategorySelect } from "@/components/admin/categories/category-select";
import { MonsterThumbByName } from "@/components/admin/tasks/monster-thumb-by-name";

type TaskDefinitionFormDialogProps = {
  trigger: React.ReactNode;
  title: string;
  defaultValues: TaskDefinitionInput;
  /** Id já existe (edição) — trava o campo de identificador. */
  isEditing?: boolean;
  onSubmit: (values: TaskDefinitionInput) => Promise<boolean | "conflict">;
  successMessage: string;
};

export function TaskDefinitionFormDialog({
  trigger,
  title,
  defaultValues,
  isEditing = false,
  onSubmit,
  successMessage,
}: TaskDefinitionFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TaskDefinitionInput, unknown, TaskDefinitionInput>({
    resolver: zodResolver(taskDefinitionSchema),
    defaultValues,
  });

  const monsters = useFieldArray({ control: form.control, name: "monsters" });
  const rewardItems = useFieldArray({ control: form.control, name: "rewardItems" });
  const deliveryEnabled = form.watch("deliveryEnabled");

  useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(values: TaskDefinitionInput) {
    setIsSubmitting(true);
    const result = await onSubmit(values);
    setIsSubmitting(false);

    if (result === "conflict") {
      form.setError("id", { type: "manual", message: "Já existe uma task com esse identificador." });
      toast.error("Já existe uma task com esse identificador.");
      return;
    }

    if (!result) {
      toast.error("Não foi possível salvar.");
      return;
    }

    toast.success(successMessage);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identificador (slug único)</FormLabel>
                    <FormControl>
                      <Input placeholder="task_wolf_hollow" disabled={isEditing} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dificuldade</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_DIFFICULTIES.map((difficulty) => (
                          <SelectItem key={difficulty} value={difficulty}>
                            {TASK_DIFFICULTY_LABELS[difficulty]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <NumberField control={form.control} name="lookType" label="Look type (outfit)" />
              <FormattedNumberField control={form.control} name="levelRequired" label="Level mínimo" />
              <FormattedNumberField control={form.control} name="rankRequired" label="Rank mínimo" />
              <FormattedNumberField control={form.control} name="killsRequired" label="Kills necessários" />
              <FormattedNumberField control={form.control} name="points" label="Pontos" />
              <FormattedNumberField control={form.control} name="experience" label="Recompensa: XP" />
              <FormattedNumberField control={form.control} name="money" label="Recompensa: dinheiro" />
            </div>

            <FormField
              control={form.control}
              name="postId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post vinculado (opcional — vira link no nome da task)</FormLabel>
                  <EntitySearchCombobox<{ id: number; title: string }>
                    endpoint="/api/admin/posts"
                    value={field.value}
                    placeholder="Buscar post..."
                    formatOption={(post) => post.title}
                    onSelect={(post) => field.onChange(post?.id ?? null)}
                  />
                  <FormMessage />
                </FormItem>
              )}
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
                  <FormLabel className="!mt-0">Publicada</FormLabel>
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Monstros da task</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => monsters.append({ name: "", kills: 100 })}
                >
                  <Plus className="size-4" />
                  Adicionar
                </Button>
              </div>
              {monsters.fields.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum monstro adicionado.</p>
              )}
              {monsters.fields.map((rowField, index) => {
                const monsterName = form.watch(`monsters.${index}.name`);
                return (
                  <div key={rowField.id} className="flex items-end gap-2">
                    {monsterName && <MonsterThumbByName name={monsterName} />}
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name={`monsters.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monstro</FormLabel>
                            <EntitySearchCombobox<{ id: number; name: string }>
                              endpoint="/api/admin/monsters"
                              value={null}
                              placeholder={field.value || "Buscar monstro..."}
                              formatOption={(monster) => monster.name}
                              renderOption={(monster) => (
                                <span className="flex items-center gap-2">
                                  <EntityThumb entityType="monster" id={monster.id} name={monster.name} size="32" />
                                  {monster.name}
                                </span>
                              )}
                              onSelect={(monster) => field.onChange(monster?.name ?? "")}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="w-28">
                      <FormattedNumberField control={form.control} name={`monsters.${index}.kills`} label="Kills" />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => monsters.remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

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
                      <NumberField
                        control={form.control}
                        name={`rewardItems.${index}.count`}
                        label="Quantidade"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => rewardItems.remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 rounded-md border border-border p-3">
              <FormField
                control={form.control}
                name="deliveryEnabled"
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
                    <FormLabel className="!mt-0">
                      Exige entrega de item para resgatar a recompensa
                    </FormLabel>
                  </FormItem>
                )}
              />
              {deliveryEnabled && (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="deliveryItemId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item exigido na entrega</FormLabel>
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
                    <NumberField control={form.control} name="deliveryCount" label="Quantidade" />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
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
