"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import useSWR from "swr";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberField } from "@/components/shared/number-field";
import { EntitySearchCombobox } from "@/components/shared/entity-search-combobox";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { LooktypeAnimatedImage } from "@/components/shared/looktype-animated-image";
import { FieldTooltip } from "@/components/shared/field-tooltip";
import { LuaCodeEditor } from "@/components/shared/lua-code-editor";
import { formatLooktypeOption } from "@/lib/validations/admin/looktype";

type LooktypeRow = {
  id: number;
  name: string;
  looktypeNumber: number | null;
  frameCount: number;
  frameDurationsMs: number[];
  updatedAt: string;
};

const NPC_TYPE_LABELS: Record<(typeof NPC_TYPES)[number], string> = {
  shop: "Loja (vende/compra itens, sem script customizado)",
  quest: "Quest (usa script Lua customizado)",
  misc: "Outro (usa script Lua customizado)",
};

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

  const { data: selectedLooktypeData } = useSWR<PaginatedResult<LooktypeRow>>(
    lookTypeId ? `/api/admin/looktypes?search=${lookTypeId}&pageSize=5` : null,
    fetcher,
  );
  const selectedLooktype = selectedLooktypeData?.data.find((lt) => lt.id === lookTypeId) ?? null;

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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">
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
          <FormLabel>Looktype (sprite)</FormLabel>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <EntitySearchCombobox<LooktypeRow>
                endpoint="/api/admin/looktypes"
                value={lookTypeId || null}
                placeholder="Buscar looktype..."
                formatOption={(lt) => formatLooktypeOption(lt)}
                renderOption={(lt) => (
                  <span className="flex items-center gap-2">
                    <LooktypeAnimatedImage
                      key={lt.id}
                      looktypeId={lt.id}
                      frameCount={lt.frameCount}
                      frameDurationsMs={lt.frameDurationsMs}
                      updatedAt={lt.updatedAt}
                      size="sm"
                    />
                    {formatLooktypeOption(lt)}
                  </span>
                )}
                onSelect={(lt) => form.setValue("lookTypeId", lt?.id ?? 0)}
              />
            </div>
            <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted/20">
              {selectedLooktype ? (
                <LooktypeAnimatedImage
                  key={selectedLooktype.id}
                  looktypeId={selectedLooktype.id}
                  frameCount={selectedLooktype.frameCount}
                  frameDurationsMs={selectedLooktype.frameDurationsMs}
                  updatedAt={selectedLooktype.updatedAt}
                  size="sm"
                />
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </FormItem>

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                Tipo
                <FieldTooltip text="Shop: interface de loja nativa, sem script customizado. Quest/Outro: usa o Script Lua abaixo (deixe em branco para o template padrão de saudação)." />
              </FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {NPC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {NPC_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="town"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  Cidade
                  <FieldTooltip text="Nome da cidade (town) associada ao spawn do NPC — usado para agrupar NPCs por região no cliente/servidor, não afeta a posição real." />
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <NumberField
            control={form.control}
            name="direction"
            label="Direção (0-3)"
            tooltip="Direção que o NPC olha ao spawnar: 0 = Norte, 1 = Leste, 2 = Sul, 3 = Oeste."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            control={form.control}
            name="posX"
            label="Posição X"
            tooltip="Coordenada X do tile onde o NPC nasce no mapa (mesmo sistema de coordenadas do mapa OTBM)."
          />
          <NumberField
            control={form.control}
            name="posY"
            label="Posição Y"
            tooltip="Coordenada Y do tile onde o NPC nasce no mapa."
          />
          <NumberField
            control={form.control}
            name="posZ"
            label="Posição Z"
            tooltip="Andar/piso (floor) onde o NPC nasce — 7 é o nível do solo padrão; valores menores são andares superiores, maiores são subterrâneos."
          />
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
            {shopItems.fields.map((field, index) => {
              const shopItemId = form.watch(`shopItems.${index}.itemId`);
              return (
              <div key={field.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-end gap-2">
                {shopItemId > 0 && <EntityThumb entityType="item" id={shopItemId} size="32" />}
                <FormItem>
                  <FormLabel>Item</FormLabel>
                  <EntitySearchCombobox<{ id: number; name: string }>
                    endpoint="/api/admin/items"
                    value={shopItemId || null}
                    placeholder="Buscar item por nome ou id..."
                    formatOption={(item) => `${item.name} (#${item.id})`}
                    renderOption={(item) => (
                      <span className="flex items-center gap-2">
                        <EntityThumb entityType="item" id={item.id} name={item.name} size="32" />
                        {item.name} (#{item.id})
                      </span>
                    )}
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
              );
            })}
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
                  <LuaCodeEditor
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    minHeight="320px"
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

        <div className="flex items-center gap-4">
          <Button type="button" variant="outline" nativeButton={false} render={<Link href="/admin/npcs" />}>
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Form>
  );
}
