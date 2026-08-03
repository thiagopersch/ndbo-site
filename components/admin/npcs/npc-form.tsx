"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import useSWR from "swr";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
import { buildNpcXml } from "@/lib/npc-xml";
import { npcSchema, NPC_TYPES, type NpcInput, type NpcShopItemInput } from "@/lib/validations/admin/npc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { LooktypeAnimatedImage } from "@/components/shared/looktype-animated-image";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { FieldTooltip } from "@/components/shared/field-tooltip";
import { NpcCustomMessageListField } from "@/components/admin/npcs/npc-custom-message-list-field";
import { NpcDefaultMessageFields } from "@/components/admin/npcs/npc-default-message-fields";
import { NpcShopItemListField } from "@/components/admin/npcs/npc-shop-item-list-field";
import { XmlPreviewCard } from "@/components/shared/xml-preview-card";
import { formatLooktypeOption } from "@/lib/validations/admin/looktype";

type LooktypeRow = {
  id: number;
  name: string;
  looktypeNumber: number | null;
  frameCount: number;
  frameDurationsMs: number[];
  updatedAt: string;
};

type TownRow = { id: number; name: string };
type LuaScriptRow = { id: number; name: string };

const NPC_TYPE_LABELS: Record<(typeof NPC_TYPES)[number], string> = {
  shop: "Loja (vende/compra itens, sem script customizado)",
  quest: "Quest (usa script Lua customizado)",
  misc: "Outro (usa script Lua customizado)",
};

const defaultValues: NpcInput = {
  name: "",
  lookTypeId: 0,
  type: "shop",
  town: "",
  posX: 0,
  posY: 0,
  posZ: 7,
  direction: 2,
  shopItems: [],
  scriptId: null,
  customMessages: [],
  /** Modelo comum pré-preenchido pra novos NPCs — admin edita/apaga à vontade; NPCs já
   * existentes sempre carregam o que está salvo (ver `normalizeDefaultMessages`). */
  defaultMessages: {
    message_greet: "Hello, |PLAYERNAME|! How can I help you?",
    message_farewell: "Good bye, |PLAYERNAME|!",
    message_decline: "Ok then.",
    message_walkaway: "Come back when you are ready.",
    message_idletimeout: "Sorry, I don't have all day. Bye then.",
    message_alreadyfocused: "I am already talking to someone else, please wait.",
    message_placedinqueue: "You have been placed in the talking queue. I will be with you shortly.",
  },
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

  const watched = useWatch({ control: form.control });
  const type = watched.type;
  const lookTypeId = watched.lookTypeId;

  const previewXml = buildNpcXml({ ...defaultValues, ...watched } as NpcInput);

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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">
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

          <Tabs defaultValue="identification">
            <TabsList>
              <TabsTrigger value="identification">Identificador</TabsTrigger>
              <TabsTrigger value="messages">Mensagens</TabsTrigger>
              {type === "shop" && <TabsTrigger value="items">Items</TabsTrigger>}
            </TabsList>

            <TabsContent value="identification" className="flex flex-col gap-4">
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

              <div className="grid gap-4 sm:grid-cols-2">
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

                <NumberField
                  control={form.control}
                  name="direction"
                  label="Direção (0-3)"
                  tooltip="Direção que o NPC olha ao spawnar: 0 = Norte, 1 = Leste, 2 = Sul, 3 = Oeste."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Tipo
                        <FieldTooltip text="Shop: interface de loja nativa, sem script customizado. Quest/Outro: usa o Script Lua abaixo." />
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

                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    Cidade
                    <FieldTooltip text="Cidade (town) associada ao spawn do NPC — usado para agrupar NPCs por região no cliente/servidor, não afeta a posição real." />
                  </FormLabel>
                  <EntitySearchCombobox<TownRow>
                    endpoint="/api/admin/towns"
                    value={null}
                    placeholder={watched.town || "Buscar cidade..."}
                    formatOption={(town) => town.name}
                    onSelect={(town) => form.setValue("town", town?.name ?? "")}
                  />
                </FormItem>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Posições</p>
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
              </div>
            </TabsContent>

            <TabsContent value="messages" className="flex flex-col gap-4">
              <div className="rounded-md border p-4">
                <NpcDefaultMessageFields
                  control={form.control}
                  name="defaultMessages"
                  onChange={(key, value) =>
                    form.setValue("defaultMessages", { ...form.getValues("defaultMessages"), [key]: value })
                  }
                />
              </div>

              {type !== "shop" && (
                <FormItem>
                  <FormLabel>Script Lua</FormLabel>
                  <ScriptLuaField value={watched.scriptId ?? null} onChange={(id) => form.setValue("scriptId", id)} />
                </FormItem>
              )}

              {type !== "shop" && !watched.scriptId && (
                <div className="flex flex-col gap-2 rounded-md border p-4">
                  <div>
                    <h3 className="font-medium">Falas ambiente</h3>
                    <p className="text-sm text-muted-foreground">
                      Mensagens que o NPC diz espontaneamente (independente de conversa), igual aos
                      NPCs do Tibia Global — cada uma com seu próprio intervalo e chance.
                    </p>
                  </div>
                  <NpcCustomMessageListField control={form.control} name="customMessages" />
                </div>
              )}

              {type === "shop" && (
                <p className="text-sm text-muted-foreground">
                  NPCs do tipo Loja usam a interface de loja nativa (sem script customizado) — falas
                  ambiente e script Lua não se aplicam a esse tipo.
                </p>
              )}
            </TabsContent>

            {type === "shop" && (
              <TabsContent value="items">
                <NpcShopItemListField control={form.control} name="shopItems" />
              </TabsContent>
            )}
          </Tabs>

          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" nativeButton={false} render={<Link href="/admin/npcs" />}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Form>

      <div className="flex flex-col gap-6 lg:sticky lg:top-6">
        <XmlPreviewCard value={previewXml} />

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Sprite vinculada</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {selectedLooktype ? (
              <LooktypeAnimatedImage
                key={selectedLooktype.id}
                looktypeId={selectedLooktype.id}
                frameCount={selectedLooktype.frameCount}
                frameDurationsMs={selectedLooktype.frameDurationsMs}
                updatedAt={selectedLooktype.updatedAt}
                size="lg"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma sprite vinculada.</p>
            )}
          </CardContent>
        </Card>

        {type === "shop" && (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Items/recompensas</CardTitle>
            </CardHeader>
            <CardContent>
              {(watched.shopItems ?? []).filter((item) => item?.itemId && item.itemId > 0).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item de compra/venda ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(watched.shopItems ?? [])
                    .filter((item): item is NpcShopItemInput => Boolean(item?.itemId && item.itemId > 0))
                    .map((item, index) => (
                      <EntityThumb
                        key={`${item.itemId}-${index}`}
                        entityType="item"
                        id={item.itemId as number}
                        name={item.name}
                        size="32"
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ScriptLuaField({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const { data } = useSWR<PaginatedResult<LuaScriptRow>>(
    value ? `/api/admin/lua-scripts?search=${value}&pageSize=5` : null,
    fetcher,
  );
  const resolved = data?.data.find((row) => row.id === value) ?? null;

  return (
    <EntitySearchCombobox<LuaScriptRow>
      endpoint="/api/admin/lua-scripts?category=npc"
      value={value}
      placeholder={resolved?.name ?? "Buscar script Lua..."}
      formatOption={(script) => script.name}
      onSelect={(script) => onChange(script?.id ?? null)}
    />
  );
}
