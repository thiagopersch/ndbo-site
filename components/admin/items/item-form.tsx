"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { ImageOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  FIELD_TYPES,
  FLOOR_CHANGES,
  ITEM_ABSORB_KEYS,
  ITEM_ELEMENT_KEYS,
  ITEM_FIELD_ABSORB_KEYS,
  ITEM_SKILL_KEYS,
  ITEM_SUPPRESS_KEYS,
  ITEM_TYPES,
  SLOT_TYPES,
  WEAPON_TYPES,
  defaultItemValues,
  emptyFieldDamage,
  itemSchema,
  type ItemInput,
} from "@/lib/validations/admin/item";
import type { SpellFormInput } from "@/lib/validations/admin/spell";
import { itemToXml } from "@/lib/item-xml";
import type { Looktype } from "@/lib/generated/prisma/client";
import {
  LOOKTYPE_CATEGORY_LABELS,
  formatLooktypeOption,
  type LooktypeCategory,
} from "@/lib/validations/admin/looktype";
import { LooktypeAnimatedImage } from "@/components/shared/looktype-animated-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { NumberField } from "@/components/shared/number-field";
import { RecordGridField } from "@/components/shared/record-grid-field";
import { BooleanGridField } from "@/components/shared/boolean-grid-field";
import { EntitySearchCombobox } from "@/components/shared/entity-search-combobox";
import { ItemIdField } from "@/components/shared/item-id-field";
import { EntityImageUpload } from "@/components/shared/entity-image-upload";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { XmlPreviewCard } from "@/components/shared/xml-preview-card";
import { ScrollableTabsList } from "@/components/shared/scrollable-tabs-list";
import { CollapsibleSectionCard } from "@/components/shared/collapsible-section-card";
import { ItemLinkedMovementsPanel } from "@/components/admin/items/item-linked-movements-panel";

type ItemFormProps = {
  itemId?: number;
  initialValues?: ItemInput;
  /** "page" (padrão): usado pelas rotas /admin/items/new e /admin/items/[id] — form completo,
   * com botões de ação e navegação após salvar. "embedded": usado pelo dialog de edição em
   * massa — sem botões de ação, sem navegação, sem modo range (cada painel é sempre um item
   * concreto); quem salva é o `submit()` exposto via `ref`. */
  mode?: "page" | "embedded";
};

export type ItemSubmitResult =
  | { ok: true; item: ItemInput }
  /** `conflict` true = criação recusada por já existir um item com esse id (409) — sinal pro
   * dialog de edição em massa oferecer sobrescrever em vez de só mostrar o erro. */
  | { ok: false; conflict: boolean; error: string };

export type ItemFormHandle = {
  getValues: () => ItemInput;
  isDirty: () => boolean;
  submit: (options?: { forceOverwrite?: boolean }) => Promise<ItemSubmitResult>;
};

/** Mesmo teto de `POST /api/admin/items/range` — evita gerar uma lista gigante de linhas na aba
 * "Outras sprites" antes mesmo de a API rejeitar o range. */
const MAX_RANGE = 500;

type RangeSpriteRow = {
  itemId: number;
  clientId: number | null;
  lookTypeId: number | null;
  pendingLooktype: Looktype | null;
};

function EnumSelect({
  value,
  onChange,
  options,
  placeholder = "—",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <Select
      value={value || "__empty"}
      onValueChange={(next) =>
        onChange(next === "__empty" || next == null ? "" : next)
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option || "__empty"} value={option || "__empty"}>
            {option || "(nenhum)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const ItemForm = forwardRef<ItemFormHandle, ItemFormProps>(function ItemForm(
  { itemId, initialValues, mode = "page" },
  ref,
) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = itemId != null;

  const [idMode, setIdMode] = useState<"single" | "range">("single");
  const rangeMode = idMode === "range";
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  // Dados de client id/sprite por id do range, mantidos à parte do fromId/toId atuais — assim o
  // que já foi digitado/vinculado sobrevive a ajustes no intervalo (ex.: estreitar e alargar de
  // volta o range não perde o que já estava preenchido pros ids que continuam nele).
  const [rangeSpriteData, setRangeSpriteData] = useState<
    Map<number, { clientId: number | null; lookTypeId: number | null; pendingLooktype: Looktype | null }>
  >(new Map());
  const [rangeSpritePickerFor, setRangeSpritePickerFor] = useState<number | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [pendingLooktype, setPendingLooktype] = useState<Looktype | null>(null);
  const [showLooktypePicker, setShowLooktypePicker] = useState(false);
  // Resultado do auto-lookup por client id em modo edição — repassado pro `EntityImageUpload`
  // como candidato de auto-vínculo (ele decide se ainda não há nada vinculado antes de aplicar).
  const [autoLookupLooktype, setAutoLookupLooktype] = useState<Looktype | null>(null);
  // Guarda o último client id já pesquisado em cada contexto (single/edição/cada linha do range)
  // pra não repetir a busca quando o campo perde foco sem o valor ter mudado, mas ainda assim
  // refazer a busca sempre que o client id for alterado de fato (mesmo depois de já ter algo
  // vinculado — o vínculo antigo deixou de fazer sentido pro novo client id).
  const lastAutoSearchedClientIdRef = useRef<number | null>(null);
  const lastAutoSearchedClientIdEditRef = useRef<number | null>(null);
  const lastAutoSearchedRangeClientIdsRef = useRef<Map<number, number>>(new Map());

  const rangeSpriteRows: RangeSpriteRow[] = (() => {
    if (!rangeMode) return [];
    const from = Number(fromId);
    const to = Number(toId);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) return [];

    const count = Math.min(to - from + 1, MAX_RANGE);
    return Array.from({ length: count }, (_, i) => {
      const id = from + i;
      const data = rangeSpriteData.get(id);
      return {
        itemId: id,
        clientId: data?.clientId ?? null,
        lookTypeId: data?.lookTypeId ?? null,
        pendingLooktype: data?.pendingLooktype ?? null,
      };
    });
  })();

  function updateRangeSpriteRow(itemId: number, patch: Partial<Omit<RangeSpriteRow, "itemId">>) {
    setRangeSpriteData((current) => {
      const next = new Map(current);
      const existing = next.get(itemId) ?? { clientId: null, lookTypeId: null, pendingLooktype: null };
      next.set(itemId, { ...existing, ...patch });
      return next;
    });
  }

  const form = useForm<ItemInput, unknown, ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: initialValues ?? defaultItemValues,
  });

  const extraAttributes = useFieldArray({
    control: form.control,
    name: "extraAttributes",
  });
  const fieldDamages = useFieldArray({
    control: form.control,
    name: "field.damages",
  });

  const watched = useWatch({ control: form.control });
  const previewXml =
    !isEditing && rangeMode
      ? itemToXml({
          ...defaultItemValues,
          ...watched,
          id: Number(fromId) || 0,
        } as ItemInput).replace(
          /^<item id="\d+"/,
          `<item fromid="${fromId || 0}" toid="${toId || 0}"`,
        )
      : itemToXml({
          ...defaultItemValues,
          ...watched,
        } as ItemInput);

  /** Busca a looktype de item cujo nome referencia o `clientId` informado (convenção
   * `item_{clientId}`) e devolve o registro completo (já com os campos de preview), pronto pra
   * exibir com `LooktypeAnimatedImage`. Retorna `null` sem lançar erro quando nada é encontrado —
   * é uma tentativa best-effort disparada no blur do campo, o admin ainda pode vincular
   * manualmente pelo combobox se a convenção de nome não bater. */
  async function lookupLooktypeByClientId(clientId: number): Promise<Looktype | null> {
    const found = await fetch(`/api/admin/looktypes/by-client-id?clientId=${clientId}`)
      .then((res) => res.json())
      .catch(() => null);
    if (!found?.found) return null;

    const detail = await fetch(`/api/admin/looktypes?id=${found.looktype.id}`)
      .then((res) => res.json())
      .catch(() => null);
    return detail?.data?.[0] ?? null;
  }

  function handlePendingImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPendingImagePreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
    setPendingImageFile(file);
    clearPendingLooktype();
  }

  function handlePendingLooktypeSelect(looktype: Looktype | null) {
    if (!looktype) return;
    clearPendingImage();
    setPendingLooktype(looktype);
    setShowLooktypePicker(false);
    form.setValue("lookTypeId", looktype.id);
  }

  function clearPendingLooktype() {
    setPendingLooktype(null);
    setShowLooktypePicker(false);
    form.setValue("lookTypeId", null);
  }

  function clearPendingImage() {
    setPendingImagePreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setPendingImageFile(null);
  }

  async function uploadPendingImage(id: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/admin/images/item/${id}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      toast.error("Item criado, mas não foi possível enviar a imagem.");
    }
  }

  async function linkPendingLooktype(id: number, looktypeId: number) {
    const response = await fetch(`/api/admin/images/item/${id}/link-looktype`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ looktypeId }),
    });

    if (!response.ok) {
      toast.error("Item criado, mas não foi possível vincular a sprite.");
    }
  }

  /** Cria ou atualiza o item via API — reaproveitado tanto pelo submit nativo do form (modo
   * "page") quanto pelo `submit()` imperativo exposto via `ref` (modo "embedded", usado pelo
   * dialog de edição em massa). `forceOverwrite` faz PATCH em `values.id` mesmo quando o form
   * nasceu como criação — usado depois que o admin confirma sobrescrever um id que já existe. */
  async function doSave(values: ItemInput, forceOverwrite = false): Promise<ItemSubmitResult> {
    const editingThisSave = isEditing || forceOverwrite;
    const targetId = isEditing ? itemId : values.id;
    const url = editingThisSave ? `/api/admin/items/${targetId}` : "/api/admin/items";
    const method = editingThisSave ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      return {
        ok: false,
        conflict: !editingThisSave && response.status === 409,
        error: data?.error ?? "Não foi possível salvar o item.",
      };
    }

    const data = await response.json();

    if (pendingImageFile && data?.item?.id) {
      await uploadPendingImage(data.item.id, pendingImageFile);
    } else if (pendingLooktype && data?.item?.id) {
      await linkPendingLooktype(data.item.id, pendingLooktype.id);
    }

    return { ok: true, item: data.item as ItemInput };
  }

  useImperativeHandle(ref, () => ({
    getValues: () => form.getValues(),
    isDirty: () => form.formState.isDirty,
    submit: async (options) => {
      const valid = await form.trigger();
      if (!valid) {
        return {
          ok: false,
          conflict: false,
          error: "Há campos inválidos — confira as abas com erro.",
        };
      }
      return doSave(form.getValues(), options?.forceOverwrite ?? false);
    },
  }));

  async function onSubmit(values: ItemInput) {
    setIsSubmitting(true);

    if (!isEditing && rangeMode) {
      const from = Number(fromId);
      const to = Number(toId);

      if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
        setIsSubmitting(false);
        toast.error("Informe um range de ids válido (de/até).");
        return;
      }

      const overrides = rangeSpriteRows
        .filter((row) => row.clientId != null || row.lookTypeId != null)
        .map((row) => ({ id: row.itemId, clientId: row.clientId, lookTypeId: row.lookTypeId }));

      const response = await fetch("/api/admin/items/range", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId: from, toId: to, item: values, overrides }),
      });

      setIsSubmitting(false);

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível criar os items.");
        return;
      }

      toast.success(`${to - from + 1} items criados (#${from}–#${to}).`);
      router.push("/admin/items");
      router.refresh();
      return;
    }

    const result = await doSave(values);
    setIsSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEditing ? "Item atualizado." : "Item criado.");
    router.push("/admin/items");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <Form {...form}>
        <form
          onSubmit={mode === "page" ? form.handleSubmit(onSubmit) : (event) => event.preventDefault()}
          className="flex flex-col gap-6"
        >
          <Tabs defaultValue="basic">
            <ScrollableTabsList>
              <TabsTrigger value="basic">Básico</TabsTrigger>
              {!isEditing && rangeMode && (
                <TabsTrigger value="other-sprites">Outras sprites</TabsTrigger>
              )}
              <TabsTrigger value="combat">Combate</TabsTrigger>
              <TabsTrigger value="resist">Resistências</TabsTrigger>
              <TabsTrigger value="suppress">Suprimir condições</TabsTrigger>
              <TabsTrigger value="decay">Decay/Transformação</TabsTrigger>
              <TabsTrigger value="container">Container/Texto</TabsTrigger>
              <TabsTrigger value="regen">Luz &amp; Regen</TabsTrigger>
              <TabsTrigger value="field">Campo mágico</TabsTrigger>
              <TabsTrigger value="flags">Flags</TabsTrigger>
              <TabsTrigger value="extra">Atributos extras</TabsTrigger>
              <TabsTrigger value="movements">Movements vinculados</TabsTrigger>
            </ScrollableTabsList>

            <TabsContent value="basic">
              <CollapsibleSectionCard
                title="Identificação"
                contentClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                  {!isEditing && mode === "page" && (
                    <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
                      <Label className="font-normal">Forma de informar o ID do item</Label>
                      <RadioGroup
                        orientation="horizontal"
                        value={idMode}
                        onValueChange={(value) => setIdMode(value as "single" | "range")}
                      >
                        <label className="flex items-center gap-1.5 text-sm">
                          <RadioGroupItem value="range" />
                          Range de items
                        </label>
                        <label className="flex items-center gap-1.5 text-sm">
                          <RadioGroupItem value="single" />
                          Apenas id
                        </label>
                      </RadioGroup>
                      {rangeMode && (
                        <p className="text-xs text-muted-foreground">
                          Mesmo nome/atributos, vários ids — equivalente a{" "}
                          <code>fromid</code>/<code>toid</code> no <code>items.xml</code>.
                          Sprite/client id individuais por id podem ser definidos na aba
                          &quot;Outras sprites&quot;.
                        </p>
                      )}
                    </div>
                  )}
                  {!isEditing && rangeMode ? (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="range-from-id">ID inicial (from id)</Label>
                        <Input
                          id="range-from-id"
                          type="number"
                          value={fromId}
                          onChange={(event) => {
                            setFromId(event.target.value);
                            // O campo `id` (obrigatório >= 1 no schema) some da tela em modo
                            // range, mas continua fazendo parte do form — sem sincronizar, ele
                            // fica travado no valor padrão (0) e reprova a validação em silêncio
                            // no submit, sem nenhum feedback visível (o FormField dele não está
                            // renderizado pra mostrar o erro).
                            const from = Number(event.target.value);
                            form.setValue("id", Number.isInteger(from) && from > 0 ? from : 0, {
                              shouldValidate: true,
                            });
                          }}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="range-to-id">ID final (to id)</Label>
                        <Input
                          id="range-to-id"
                          type="number"
                          value={toId}
                          onChange={(event) => setToId(event.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <NumberField control={form.control} name="id" label="ID (server id)" />
                  )}
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
                    name="article"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Artigo (article)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="a, an..." />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="plural"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plural</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="editorSuffix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sufixo do editor (RME, cosmético)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo (type)</FormLabel>
                        <EnumSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={ITEM_TYPES}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID (sprite no .otb/items.xml)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            name={field.name}
                            ref={field.ref}
                            value={(field.value as number | string) ?? ""}
                            onChange={(event) => {
                              field.onChange(
                                event.target.value === "" ? null : Number(event.target.value)
                              );
                            }}
                            onBlur={(event) => {
                              field.onBlur();
                              const clientId = Number(event.target.value);
                              if (!Number.isInteger(clientId) || clientId < 1) return;

                              if (isEditing) {
                                if (lastAutoSearchedClientIdEditRef.current === clientId) return;
                                lastAutoSearchedClientIdEditRef.current = clientId;
                                lookupLooktypeByClientId(clientId).then((looktype) => {
                                  if (looktype) setAutoLookupLooktype(looktype);
                                });
                              } else if (!rangeMode) {
                                if (lastAutoSearchedClientIdRef.current === clientId) return;
                                lastAutoSearchedClientIdRef.current = clientId;
                                lookupLooktypeByClientId(clientId).then((looktype) => {
                                  if (looktype) handlePendingLooktypeSelect(looktype);
                                });
                              }
                            }}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Id do sprite no cliente (diferente do server id).
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2 lg:col-span-3">
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="published"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 sm:col-span-2 lg:col-span-3">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer"
                            checked={field.value}
                            onChange={(event) =>
                              field.onChange(event.target.checked)
                            }
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">
                          Publicado (disponível nas páginas públicas de
                          gameplay)
                        </FormLabel>
                      </FormItem>
                    )}
                  />
              </CollapsibleSectionCard>

              <CollapsibleSectionCard
                title="Imagem"
                className="mt-4"
              >
                  {isEditing ? (
                    <EntityImageUpload
                      entityType="item"
                      id={itemId}
                      name={watched.name}
                      autoLinkCandidate={autoLookupLooktype}
                      onLooktypeLinked={(looktypeId) => form.setValue("lookTypeId", looktypeId)}
                    />
                  ) : rangeMode ? (
                    <p className="text-sm text-muted-foreground">
                      Upload de imagem não está disponível ao cadastrar um range de
                      ids — envie a imagem depois, individualmente, pela listagem.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-4">
                        {pendingLooktype ? (
                          <LooktypeAnimatedImage
                            key={pendingLooktype.id}
                            looktypeId={pendingLooktype.id}
                            frameCount={pendingLooktype.frameCount}
                            frameDurationsMs={pendingLooktype.frameDurationsMs as number[]}
                            updatedAt={pendingLooktype.updatedAt}
                            size="md"
                          />
                        ) : pendingImagePreview ? (
                          // eslint-disable-next-line @next/next/no-img-element -- preview local do arquivo selecionado, ainda não enviado
                          <img
                            src={pendingImagePreview}
                            alt="Preview"
                            className="size-10 shrink-0 rounded-sm border border-border object-contain bg-muted/40"
                          />
                        ) : (
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-sm border border-dashed border-border text-muted-foreground">
                            <ImageOff className="size-4 cursor-pointer" />
                          </span>
                        )}
                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => imageInputRef.current?.click()}
                          >
                            {pendingImageFile ? "Trocar imagem" : "Selecionar imagem"}
                          </Button>
                          {pendingImageFile && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={clearPendingImage}
                            >
                              Remover seleção
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowLooktypePicker((v) => !v)}
                          >
                            Vincular sprite do cadastro
                          </Button>
                          {pendingLooktype && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={clearPendingLooktype}
                            >
                              Remover vínculo
                            </Button>
                          )}
                        </div>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/png,image/gif"
                          className="hidden"
                          onChange={handlePendingImageChange}
                        />
                      </div>
                      {showLooktypePicker && (
                        <EntitySearchCombobox<Looktype>
                          endpoint="/api/admin/looktypes"
                          value={null}
                          placeholder="Buscar sprite/looktype por id ou número..."
                          formatOption={(lt) =>
                            `${formatLooktypeOption(lt)} — ${LOOKTYPE_CATEGORY_LABELS[lt.category as LooktypeCategory] ?? lt.category}`
                          }
                          renderOption={(lt) => (
                            <span className="flex items-center gap-2">
                              <LooktypeAnimatedImage
                                key={lt.id}
                                looktypeId={lt.id}
                                frameCount={lt.frameCount}
                                frameDurationsMs={lt.frameDurationsMs as number[]}
                                updatedAt={lt.updatedAt}
                                size="sm"
                              />
                              {formatLooktypeOption(lt)} — {LOOKTYPE_CATEGORY_LABELS[lt.category as LooktypeCategory] ?? lt.category}
                            </span>
                          )}
                          onSelect={handlePendingLooktypeSelect}
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        PNG ou GIF, até 2MB. A imagem (ou a sprite vinculada) é aplicada
                        automaticamente assim que o item for criado.
                      </p>
                    </div>
                  )}
              </CollapsibleSectionCard>
            </TabsContent>

            {!isEditing && rangeMode && (
              <TabsContent value="other-sprites">
                <CollapsibleSectionCard
                  title="Outras sprites"
                  contentClassName="flex flex-col gap-2"
                >
                  <p className="text-sm text-muted-foreground">
                    Uma linha por id do range ({fromId || "?"}–{toId || "?"}). Client id e
                    sprite vinculada ficam individuais por item; os demais atributos vêm das
                    outras abas e são compartilhados por todos os ids criados.
                  </p>
                  {rangeSpriteRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Informe um range de ids válido na aba Básico para listar os itens aqui.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-2 text-xs font-medium text-muted-foreground">
                        <span>Item ID</span>
                        <span>Client ID</span>
                        <span>Sprite</span>
                      </div>
                      {rangeSpriteRows.map((row) => (
                        <div
                          key={row.itemId}
                          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] items-center gap-2"
                        >
                          <Input value={row.itemId} readOnly disabled />
                          <Input
                            type="number"
                            value={row.clientId ?? ""}
                            onChange={(event) =>
                              updateRangeSpriteRow(row.itemId, {
                                clientId: event.target.value === "" ? null : Number(event.target.value),
                              })
                            }
                            onBlur={(event) => {
                              const clientId = Number(event.target.value);
                              if (!Number.isInteger(clientId) || clientId < 1) return;
                              if (lastAutoSearchedRangeClientIdsRef.current.get(row.itemId) === clientId) return;
                              lastAutoSearchedRangeClientIdsRef.current.set(row.itemId, clientId);
                              lookupLooktypeByClientId(clientId).then((looktype) => {
                                if (!looktype) return;
                                updateRangeSpriteRow(row.itemId, { lookTypeId: looktype.id, pendingLooktype: looktype });
                              });
                            }}
                          />
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              {row.pendingLooktype ? (
                                <LooktypeAnimatedImage
                                  key={row.pendingLooktype.id}
                                  looktypeId={row.pendingLooktype.id}
                                  frameCount={row.pendingLooktype.frameCount}
                                  frameDurationsMs={row.pendingLooktype.frameDurationsMs as number[]}
                                  updatedAt={row.pendingLooktype.updatedAt}
                                  size="sm"
                                />
                              ) : (
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-dashed border-border text-muted-foreground">
                                  <ImageOff className="size-4" />
                                </span>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setRangeSpritePickerFor((current) =>
                                    current === row.itemId ? null : row.itemId,
                                  )
                                }
                              >
                                Vincular sprite
                              </Button>
                              {row.pendingLooktype && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    updateRangeSpriteRow(row.itemId, { lookTypeId: null, pendingLooktype: null })
                                  }
                                >
                                  Remover vínculo
                                </Button>
                              )}
                            </div>
                            {rangeSpritePickerFor === row.itemId && (
                              <EntitySearchCombobox<Looktype>
                                endpoint="/api/admin/looktypes"
                                value={null}
                                placeholder="Buscar sprite/looktype por id ou número..."
                                formatOption={(lt) =>
                                  `${formatLooktypeOption(lt)} — ${LOOKTYPE_CATEGORY_LABELS[lt.category as LooktypeCategory] ?? lt.category}`
                                }
                                renderOption={(lt) => (
                                  <span className="flex items-center gap-2">
                                    <LooktypeAnimatedImage
                                      key={lt.id}
                                      looktypeId={lt.id}
                                      frameCount={lt.frameCount}
                                      frameDurationsMs={lt.frameDurationsMs as number[]}
                                      updatedAt={lt.updatedAt}
                                      size="sm"
                                    />
                                    {formatLooktypeOption(lt)} — {LOOKTYPE_CATEGORY_LABELS[lt.category as LooktypeCategory] ?? lt.category}
                                  </span>
                                )}
                                onSelect={(lt) => {
                                  if (!lt) return;
                                  updateRangeSpriteRow(row.itemId, { lookTypeId: lt.id, pendingLooktype: lt });
                                  setRangeSpritePickerFor(null);
                                }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleSectionCard>
              </TabsContent>
            )}

            <TabsContent value="combat">
              <CollapsibleSectionCard
                title="Classificação de combate"
                contentClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                  <FormField
                    control={form.control}
                    name="weaponType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de arma (Weapon type)</FormLabel>
                        <EnumSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={WEAPON_TYPES}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slotType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de slot (Slot type)</FormLabel>
                        <EnumSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={SLOT_TYPES}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ammoType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de munição (Ammo type)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ammoAction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ação de munição (Ammo action)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="removecount..." />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shootType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de projétil (Shoot type)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="effect"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Efeito de área (Effect)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="corpseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de corpo (Corpse type)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="venom, blood, undead..."
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
              </CollapsibleSectionCard>

              <CollapsibleSectionCard
                title="Stats"
                className="mt-4"
                contentClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                  <NumberField
                    control={form.control}
                    name="weight"
                    label="Peso (Weight)"
                  />
                  <NumberField
                    control={form.control}
                    name="worth"
                    label="Valor (Worth)"
                  />
                  <NumberField
                    control={form.control}
                    name="armor"
                    label="Armadura (Armor)"
                  />
                  <NumberField
                    control={form.control}
                    name="defense"
                    label="Defesa (Defense)"
                  />
                  <NumberField
                    control={form.control}
                    name="extraDefense"
                    label="Defesa extra (Extra defense)"
                  />
                  <NumberField
                    control={form.control}
                    name="attack"
                    label="Ataque (Attack)"
                  />
                  <NumberField
                    control={form.control}
                    name="extraAttack"
                    label="Ataque extra (Extra attack)"
                  />
                  <NumberField
                    control={form.control}
                    name="attackSpeed"
                    label="Velocidade de ataque (Attack speed)"
                  />
                  <NumberField
                    control={form.control}
                    name="range"
                    label="Alcance (Range)"
                  />
                  <NumberField
                    control={form.control}
                    name="hitChance"
                    label="Chance de acerto (Hit chance)"
                  />
                  <NumberField
                    control={form.control}
                    name="maxHitChance"
                    label="Chance máxima de acerto (Max hit chance)"
                  />
                  <NumberField
                    control={form.control}
                    name="breakChance"
                    label="Chance de quebra (Break chance)"
                  />
                  <ItemIdField
                    control={form.control}
                    name="rotateTo"
                    label="Rotacionar para (Rotate to)"
                    nullable
                  />
              </CollapsibleSectionCard>

              <CollapsibleSectionCard
                title="Skills concedidas"
                className="mt-4"
              >
                  <RecordGridField
                    control={form.control}
                    basePath="skills"
                    keys={ITEM_SKILL_KEYS}
                  />
              </CollapsibleSectionCard>

              <CollapsibleSectionCard
                title="Dano elemental (arma)"
                className="mt-4"
              >
                  <RecordGridField
                    control={form.control}
                    basePath="elements"
                    keys={ITEM_ELEMENT_KEYS}
                  />
              </CollapsibleSectionCard>

              <CollapsibleSectionCard
                title="Rune (spell vinculada)"
                className="mt-4"
                contentClassName="flex flex-col gap-3"
              >
                  <p className="text-sm text-muted-foreground">
                    Selecione uma spell existente para preencher o nome
                    automaticamente, ou digite livremente — o XML sempre usa o
                    texto de <code>runeSpellName</code>.
                  </p>
                  <EntitySearchCombobox<SpellFormInput & { id: number }>
                    endpoint="/api/admin/spells"
                    value={null}
                    placeholder="Vincular spell..."
                    formatOption={(spell) =>
                      `#${spell.id} — ${spell.name} (${spell.kind})`
                    }
                    onSelect={(spell) => {
                      if (spell) form.setValue("runeSpellName", spell.name);
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="runeSpellName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Nome da spell da rune (Rune spell name)
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
              </CollapsibleSectionCard>
            </TabsContent>

            <TabsContent value="resist">
              <CollapsibleSectionCard
                title="Absorb %"
              >
                  <RecordGridField
                    control={form.control}
                    basePath="absorbPercent"
                    keys={ITEM_ABSORB_KEYS}
                  />
              </CollapsibleSectionCard>
              <CollapsibleSectionCard
                title="Field absorb % (parado no próprio campo)"
                className="mt-4"
              >
                  <RecordGridField
                    control={form.control}
                    basePath="fieldAbsorbPercent"
                    keys={ITEM_FIELD_ABSORB_KEYS}
                  />
              </CollapsibleSectionCard>
              <CollapsibleSectionCard
                title="Reflect %"
                className="mt-4"
              >
                  <RecordGridField
                    control={form.control}
                    basePath="reflectPercent"
                    keys={ITEM_ABSORB_KEYS}
                  />
              </CollapsibleSectionCard>
              <CollapsibleSectionCard
                title="Reflect chance"
                className="mt-4"
              >
                  <RecordGridField
                    control={form.control}
                    basePath="reflectChance"
                    keys={ITEM_ABSORB_KEYS}
                  />
              </CollapsibleSectionCard>
            </TabsContent>

            <TabsContent value="suppress">
              <CollapsibleSectionCard
                title="Imunidade a condições"
              >
                  <BooleanGridField
                    control={form.control}
                    basePath="suppress"
                    keys={ITEM_SUPPRESS_KEYS}
                  />
              </CollapsibleSectionCard>
            </TabsContent>

            <TabsContent value="decay">
              <CollapsibleSectionCard
                title="Decay"
                contentClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                  <ItemIdField
                    control={form.control}
                    name="decayTo"
                    label="Decair para (Decay to)"
                    nullable
                  />
                  <NumberField
                    control={form.control}
                    name="duration"
                    label="Duração (Duration)"
                  />
                  <FormField
                    control={form.control}
                    name="stopDuration"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer"
                            checked={Boolean(field.value)}
                            onChange={(event) =>
                              field.onChange(event.target.checked)
                            }
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 font-normal">
                          Parar duração (Stop duration)
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="showDuration"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer"
                            checked={Boolean(field.value)}
                            onChange={(event) =>
                              field.onChange(event.target.checked)
                            }
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 font-normal">
                          Mostrar duração (Show duration)
                        </FormLabel>
                      </FormItem>
                    )}
                  />
              </CollapsibleSectionCard>

              <CollapsibleSectionCard
                title="Transformação"
                className="mt-4"
                contentClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                  <ItemIdField
                    control={form.control}
                    name="transformEquipTo"
                    label="Transformar ao equipar (Transform equip to)"
                    nullable
                  />
                  <ItemIdField
                    control={form.control}
                    name="transformDeEquipTo"
                    label="Transformar ao desequipar (Transform de-equip to)"
                    nullable
                  />
                  <ItemIdField
                    control={form.control}
                    name="transformTo"
                    label="Transformar em (Transform to)"
                    nullable
                  />
                  <ItemIdField
                    control={form.control}
                    name="maleTransformTo"
                    label="Transformar em (masculino, cama) (Male transform to)"
                    nullable
                  />
                  <ItemIdField
                    control={form.control}
                    name="femaleTransformTo"
                    label="Transformar em (feminino, cama) (Female transform to)"
                    nullable
                  />
                  <FormField
                    control={form.control}
                    name="floorChange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mudança de andar (Floor change)</FormLabel>
                        <EnumSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={FLOOR_CHANGES}
                        />
                      </FormItem>
                    )}
                  />
              </CollapsibleSectionCard>

              <CollapsibleSectionCard
                title="Charges"
                className="mt-4"
                contentClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                  <NumberField
                    control={form.control}
                    name="charges"
                    label="Cargas (Charges)"
                  />
                  <FormField
                    control={form.control}
                    name="showCharges"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer"
                            checked={Boolean(field.value)}
                            onChange={(event) =>
                              field.onChange(event.target.checked)
                            }
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 font-normal">
                          Mostrar cargas (Show charges)
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="showAttributes"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer"
                            checked={Boolean(field.value)}
                            onChange={(event) =>
                              field.onChange(event.target.checked)
                            }
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 font-normal">
                          Mostrar atributos (Show attributes)
                        </FormLabel>
                      </FormItem>
                    )}
                  />
              </CollapsibleSectionCard>
            </TabsContent>

            <TabsContent value="container">
              <CollapsibleSectionCard
                title="Container"
                contentClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                  <NumberField
                    control={form.control}
                    name="containerSize"
                    label="Tamanho do container (Container size)"
                  />
              </CollapsibleSectionCard>
              <CollapsibleSectionCard
                title="Texto"
                className="mt-4"
                contentClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                  <FormField
                    control={form.control}
                    name="readable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer"
                            checked={Boolean(field.value)}
                            onChange={(event) =>
                              field.onChange(event.target.checked)
                            }
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 font-normal">
                          Legível (Readable)
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="writeable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer"
                            checked={Boolean(field.value)}
                            onChange={(event) =>
                              field.onChange(event.target.checked)
                            }
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 font-normal">
                          Escrevível (Writeable)
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <NumberField
                    control={form.control}
                    name="maxTextLen"
                    label="Tamanho máximo do texto (Max text length)"
                  />
                  <ItemIdField
                    control={form.control}
                    name="writeOnceItemId"
                    label="Item id (uso único ao escrever) (Write once item id)"
                    nullable
                  />
              </CollapsibleSectionCard>
            </TabsContent>

            <TabsContent value="regen">
              <CollapsibleSectionCard
                title="Luz"
                contentClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                  <NumberField
                    control={form.control}
                    name="lightLevel"
                    label="Nível de luz (Light level)"
                  />
                  <NumberField
                    control={form.control}
                    name="lightColor"
                    label="Cor da luz (Light color)"
                  />
              </CollapsibleSectionCard>
              <CollapsibleSectionCard
                title="Regeneração / stats concedidos"
                className="mt-4"
                contentClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                  <NumberField
                    control={form.control}
                    name="speed"
                    label="Velocidade (Speed)"
                  />
                  <NumberField
                    control={form.control}
                    name="healthGain"
                    label="Ganho de vida (Health gain)"
                  />
                  <NumberField
                    control={form.control}
                    name="healthTicks"
                    label="Intervalo de vida (Health ticks)"
                  />
                  <NumberField
                    control={form.control}
                    name="manaGain"
                    label="Ganho de mana (Mana gain)"
                  />
                  <NumberField
                    control={form.control}
                    name="manaTicks"
                    label="Intervalo de mana (Mana ticks)"
                  />
                  <FormField
                    control={form.control}
                    name="manaShield"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer"
                            checked={Boolean(field.value)}
                            onChange={(event) =>
                              field.onChange(event.target.checked)
                            }
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 font-normal">
                          Escudo de mana (Mana shield)
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <NumberField
                    control={form.control}
                    name="soulPoints"
                    label="Pontos de alma (Soul points)"
                  />
                  <NumberField
                    control={form.control}
                    name="soulPointsPercent"
                    label="Pontos de alma % (Soul points %)"
                  />
                  <NumberField
                    control={form.control}
                    name="maxHitPoints"
                    label="Vida máxima (Max HP)"
                  />
                  <NumberField
                    control={form.control}
                    name="maxHitPointsPercent"
                    label="Vida máxima % (Max HP %)"
                  />
                  <NumberField
                    control={form.control}
                    name="maxManaPoints"
                    label="Mana máxima (Max mana)"
                  />
                  <NumberField
                    control={form.control}
                    name="maxManaPointsPercent"
                    label="Mana máxima % (Max mana %)"
                  />
                  <NumberField
                    control={form.control}
                    name="magicLevelPoints"
                    label="Nível mágico (Magic level)"
                  />
                  <NumberField
                    control={form.control}
                    name="magicLevelPointsPercent"
                    label="Nível mágico % (Magic level %)"
                  />
                  <NumberField
                    control={form.control}
                    name="increaseMagicValue"
                    label="Aumento de magia - valor (Increase magic)"
                  />
                  <NumberField
                    control={form.control}
                    name="increaseMagicPercent"
                    label="Aumento de magia % (Increase magic %)"
                  />
                  <NumberField
                    control={form.control}
                    name="increaseHealingValue"
                    label="Aumento de cura - valor (Increase healing)"
                  />
                  <NumberField
                    control={form.control}
                    name="increaseHealingPercent"
                    label="Aumento de cura % (Increase healing %)"
                  />
              </CollapsibleSectionCard>
            </TabsContent>

            <TabsContent value="field">
              <CollapsibleSectionCard
                title="Bloco de magic field (só relevante quando type=magicfield)"
                contentClassName="flex flex-col gap-4"
              >
                  <FormField
                    control={form.control}
                    name="field.enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer"
                            checked={Boolean(field.value)}
                            onChange={(event) =>
                              field.onChange(event.target.checked)
                            }
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 font-normal">
                          Este item tem bloco de field
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField
                      control={form.control}
                      name="field.value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de dano</FormLabel>
                          <EnumSelect
                            value={field.value}
                            onChange={field.onChange}
                            options={FIELD_TYPES}
                          />
                        </FormItem>
                      )}
                    />
                    <NumberField
                      control={form.control}
                      name="field.ticks"
                      label="Intervalos (Ticks)"
                    />
                    <NumberField
                      control={form.control}
                      name="field.count"
                      label="Quantidade (Count)"
                    />
                    <NumberField
                      control={form.control}
                      name="field.start"
                      label="Início (Start)"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Damage over time (lista de dano)
                    </p>
                    <div className="flex flex-col gap-2">
                      {fieldDamages.fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid grid-cols-[1fr_auto] items-center gap-2"
                        >
                          <NumberField
                            control={form.control}
                            name={`field.damages.${index}.damage`}
                            label="Dano (Damage)"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="self-end"
                            onClick={() => fieldDamages.remove(index)}
                          >
                            <Trash2 className="size-4 cursor-pointer" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="self-start"
                        onClick={() => fieldDamages.append(emptyFieldDamage)}
                      >
                        <Plus className="size-4 cursor-pointer" />
                        Adicionar dano
                      </Button>
                    </div>
                  </div>
              </CollapsibleSectionCard>
            </TabsContent>

            <TabsContent value="flags">
              <CollapsibleSectionCard
                title="Flags"
              >
                  <BooleanGridField
                    control={form.control}
                    basePath="flags"
                    keys={[
                      "blocking",
                      "blockProjectile",
                      "blockPathfind",
                      "movable",
                      "pickupable",
                      "allowPickupable",
                      "showCount",
                      "dualWield",
                      "preventLoss",
                      "preventDrop",
                      "invisible",
                      "forceSerialize",
                      "replacable",
                      "walkStack",
                      "rotable",
                      "canReadText",
                      "allowDistRead",
                    ]}
                  />
              </CollapsibleSectionCard>
            </TabsContent>

            <TabsContent value="extra">
              <CollapsibleSectionCard
                title="Atributos extras"
                contentClassName="flex flex-col gap-2"
              >
                  <p className="text-sm text-muted-foreground">
                    Atributos <code>{"<attribute key>"}</code> não modelados nas
                    abas acima — usado principalmente para preservar dados
                    importados de um <code>items.xml</code>
                    real sem perda.
                  </p>
                  {extraAttributes.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[1fr_1fr_auto] items-center gap-2"
                    >
                      <FormField
                        control={form.control}
                        name={`extraAttributes.${index}.key`}
                        render={({ field }) => (
                          <Input {...field} placeholder="key" />
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`extraAttributes.${index}.value`}
                        render={({ field }) => (
                          <Input {...field} placeholder="value" />
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => extraAttributes.remove(index)}
                      >
                        <Trash2 className="size-4 cursor-pointer" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() =>
                      extraAttributes.append({ key: "", value: "" })
                    }
                  >
                    <Plus className="size-4 cursor-pointer" />
                    Adicionar atributo
                  </Button>
              </CollapsibleSectionCard>
            </TabsContent>

            <TabsContent value="movements">
              <CollapsibleSectionCard
                title="Movements vinculados"
              >
                  {isEditing ? (
                    <ItemLinkedMovementsPanel itemId={itemId} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Salve o item primeiro para ver/criar movements vinculados
                      a ele.
                    </p>
                  )}
              </CollapsibleSectionCard>
            </TabsContent>
          </Tabs>

          {mode === "page" && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                nativeButton={false}
                render={<Link href="/admin/items" />}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting
                  ? "Salvando..."
                  : isEditing
                    ? "Salvar alterações"
                    : "Criar item"}
              </Button>
            </div>
          )}
        </form>
      </Form>

      <div className="flex flex-col gap-6 lg:sticky lg:top-6">
        <XmlPreviewCard value={previewXml} />

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Pré-visualização das sprites</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <EntityThumb entityType="item" id={itemId} name={watched.name} size="lg" />
            ) : (
              <p className="text-sm text-muted-foreground">
                Salve o item primeiro para poder enviar/ver a imagem.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
