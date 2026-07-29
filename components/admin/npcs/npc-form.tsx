"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { npcSchema, NPC_TYPES, type NpcInput } from "@/lib/validations/admin/npc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const defaultValues: NpcInput = {
  name: "",
  lookTypeId: 0,
  type: "misc",
  town: "",
  posX: 0,
  posY: 0,
  posZ: 7,
  direction: 2,
  shopItems: [],
  scriptContent: "",
  published: true,
};

type NpcFormProps = {
  npcId?: number;
  initialValues?: NpcInput;
};

export function NpcForm({ npcId, initialValues }: NpcFormProps) {
  const router = useRouter();

  const form = useForm<NpcInput, unknown, NpcInput>({
    resolver: zodResolver(npcSchema),
    defaultValues: initialValues ?? defaultValues,
  });

  const shopItems = useFieldArray({ control: form.control, name: "shopItems" });
  const type = form.watch("type");
  const lookTypeId = form.watch("lookTypeId");

  async function handleSubmit(values: NpcInput) {
    const response = await fetch(npcId ? `/api/admin/npcs/${npcId}` : "/api/admin/npcs", {
      method: npcId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      toast.error("Não foi possível salvar o NPC.");
      return;
    }

    const data = await response.json();
    if (data.warning) toast.warning(data.warning);
    else toast.success("NPC salvo com sucesso.");

    router.push("/admin/npcs");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6 max-w-3xl">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} disabled={Boolean(npcId)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Looktype</FormLabel>
          <EntitySearchCombobox<{ id: number; looktypeNumber: number }>
            endpoint="/api/admin/looktypes"
            value={lookTypeId || null}
            placeholder="Buscar looktype..."
            formatOption={(lt) => `#${lt.id} — número ${lt.looktypeNumber}`}
            onSelect={(lt) => form.setValue("lookTypeId", lt?.id ?? 0)}
          />
        </FormItem>

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <FormControl>
                <select
                  className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
                  {...field}
                >
                  {NPC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="town"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <NumberField control={form.control} name="direction" label="Direção (0-3)" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <NumberField control={form.control} name="posX" label="Posição X" />
          <NumberField control={form.control} name="posY" label="Posição Y" />
          <NumberField control={form.control} name="posZ" label="Posição Z" />
        </div>

        {type === "shop" && (
          <div className="flex flex-col gap-3 rounded-md border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Itens à venda (preço em crystal coin)</h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  shopItems.append({ itemId: 0, name: "", buyPriceCrystal: 0, sellPriceCrystal: 0 })
                }
              >
                <Plus className="size-4" />
                Adicionar item
              </Button>
            </div>
            {shopItems.fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
                <FormItem>
                  <FormLabel>Item</FormLabel>
                  <EntitySearchCombobox<{ id: number; name: string }>
                    endpoint="/api/admin/items"
                    value={form.watch(`shopItems.${index}.itemId`) || null}
                    placeholder="Buscar item..."
                    formatOption={(item) => `${item.name} (#${item.id})`}
                    onSelect={(item) => {
                      form.setValue(`shopItems.${index}.itemId`, item?.id ?? 0);
                      form.setValue(`shopItems.${index}.name`, item?.name ?? "");
                    }}
                  />
                </FormItem>
                <NumberField
                  control={form.control}
                  name={`shopItems.${index}.buyPriceCrystal`}
                  label="Compra (crystal)"
                />
                <NumberField
                  control={form.control}
                  name={`shopItems.${index}.sellPriceCrystal`}
                  label="Venda (crystal)"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  onClick={() => shopItems.remove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {type !== "shop" && (
          <FormField
            control={form.control}
            name="scriptContent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Script Lua (gerado em data/npc/scripts/{"{nome}"}.lua)</FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    rows={14}
                    className="border-input w-full rounded-md border bg-transparent p-3 font-mono text-xs"
                    placeholder="Deixe em branco para usar o template padrão de saudação."
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

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
              <FormLabel className="font-normal">Publicado</FormLabel>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-fit">
          Salvar
        </Button>
      </form>
    </Form>
  );
}
