"use client";

import { useRef, useState } from "react";
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
import { NumberField } from "@/components/shared/number-field";
import { RecordGridField } from "@/components/shared/record-grid-field";
import { BooleanGridField } from "@/components/shared/boolean-grid-field";
import { EntitySearchCombobox } from "@/components/shared/entity-search-combobox";
import { ItemIdField } from "@/components/shared/item-id-field";
import { EntityImageUpload } from "@/components/shared/entity-image-upload";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { XmlCodeViewer } from "@/components/shared/xml-code-viewer";
import { ScrollableTabsList } from "@/components/shared/scrollable-tabs-list";
import { CollapsibleSectionCard } from "@/components/shared/collapsible-section-card";
import { ItemLinkedMovementsPanel } from "@/components/admin/items/item-linked-movements-panel";

type ItemFormProps = {
  itemId?: number;
  initialValues?: ItemInput;
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

export function ItemForm({ itemId, initialValues }: ItemFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = itemId != null;

  const [rangeMode, setRangeMode] = useState(false);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");

  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);

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

  function handlePendingImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPendingImagePreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
    setPendingImageFile(file);
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

      const response = await fetch("/api/admin/items/range", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromId: from, toId: to, item: values }),
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

    const url = isEditing ? `/api/admin/items/${itemId}` : "/api/admin/items";
    const method = isEditing ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      setIsSubmitting(false);
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível salvar o item.");
      return;
    }

    const data = await response.json();

    if (!isEditing && pendingImageFile && data?.item?.id) {
      await uploadPendingImage(data.item.id, pendingImageFile);
    }

    setIsSubmitting(false);
    toast.success(isEditing ? "Item atualizado." : "Item criado.");
    router.push("/admin/items");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <Tabs defaultValue="basic">
            <ScrollableTabsList>
              <TabsTrigger value="basic">Básico</TabsTrigger>
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
                  {!isEditing && (
                    <div className="flex flex-row items-center gap-2 sm:col-span-2 lg:col-span-3">
                      <input
                        type="checkbox"
                        className="size-4 cursor-pointer"
                        id="range-mode"
                        checked={rangeMode}
                        onChange={(event) => setRangeMode(event.target.checked)}
                      />
                      <Label htmlFor="range-mode" className="font-normal">
                        Cadastrar como range de ids (mesmo nome/atributos, vários ids
                        — equivalente a <code>fromid</code>/<code>toid</code> no{" "}
                        <code>items.xml</code>)
                      </Label>
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
                          onChange={(event) => setFromId(event.target.value)}
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
                    <NumberField
                      control={form.control}
                      name="id"
                      label="ID (server id)"
                      disabled={isEditing}
                    />
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
                    />
                  ) : rangeMode ? (
                    <p className="text-sm text-muted-foreground">
                      Upload de imagem não está disponível ao cadastrar um range de
                      ids — envie a imagem depois, individualmente, pela listagem.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-4">
                        {pendingImagePreview ? (
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
                        </div>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/png,image/gif"
                          className="hidden"
                          onChange={handlePendingImageChange}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        PNG ou GIF, até 2MB. A imagem é enviada automaticamente
                        assim que o item for criado.
                      </p>
                    </div>
                  )}
              </CollapsibleSectionCard>
            </TabsContent>

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
        </form>
      </Form>

      <div className="flex flex-col gap-6 lg:sticky lg:top-6">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Pré-visualização do XML</CardTitle>
          </CardHeader>
          <CardContent>
            <XmlCodeViewer value={previewXml} />
          </CardContent>
        </Card>

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
}
