"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import useSWR from "swr";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import type {
  VocationTypeClass,
  VocationTypeUniverse,
} from "@/lib/generated/prisma/client";
import type { PaginatedResult } from "@/lib/pagination";
import {
  defaultVocationValues,
  vocationSchema,
  type VocationInput,
} from "@/lib/validations/admin/vocation";
import { vocationToXml } from "@/lib/vocation-xml";
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
import { NumberField } from "@/components/shared/number-field";
import { EntityImageUpload } from "@/components/shared/entity-image-upload";
import { XmlCodeViewer } from "@/components/shared/xml-code-viewer";
import { VocationTypeSelect } from "@/components/admin/vocations/vocation-type-select";

type VocationFormProps = {
  vocationId?: number;
  initialValues?: VocationInput;
};

export function VocationForm({ vocationId, initialValues }: VocationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = vocationId != null;

  const { data: classesData } = useSWR<PaginatedResult<VocationTypeClass>>(
    "/api/admin/vocation-classes?pageSize=100",
    fetcher,
  );
  const { data: universesData } = useSWR<PaginatedResult<VocationTypeUniverse>>(
    "/api/admin/vocation-universes?pageSize=100",
    fetcher,
  );

  const form = useForm<VocationInput, unknown, VocationInput>({
    resolver: zodResolver(vocationSchema),
    defaultValues: initialValues ?? defaultVocationValues,
  });

  const watched = useWatch({ control: form.control });

  const typeClassName =
    classesData?.data.find((item) => item.id === watched.typeClassId)?.name ??
    "";
  const typeUniverseName =
    universesData?.data.find((item) => item.id === watched.typeUniverseId)
      ?.name ?? "";

  const previewXml = vocationToXml({
    ...defaultVocationValues,
    ...watched,
    formula: { ...defaultVocationValues.formula, ...watched.formula },
    skill: { ...defaultVocationValues.skill, ...watched.skill },
    typeClassName: typeClassName || "—",
    typeUniverseName: typeUniverseName || "—",
  });

  async function onSubmit(values: VocationInput) {
    setIsSubmitting(true);

    const url = isEditing
      ? `/api/admin/vocations/${vocationId}`
      : "/api/admin/vocations";
    const method = isEditing ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível salvar a vocação.");
      return;
    }

    toast.success(isEditing ? "Vocação atualizada." : "Vocação criada.");
    router.push("/admin/vocations");
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
            <TabsList>
              <TabsTrigger value="basic">Dados básicos</TabsTrigger>
              <TabsTrigger value="formula">Fórmula de habilidades</TabsTrigger>
              <TabsTrigger value="skill">Skills/Habilidades</TabsTrigger>
              <TabsTrigger value="image">Imagem</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle>Dados básicos</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    control={form.control}
                    name="id"
                    label="ID"
                    disabled={isEditing}
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

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <VocationTypeSelect
                    control={form.control}
                    name="typeClassId"
                    label="Classe (type_class)"
                    placeholder="Selecione a classe"
                    options={classesData?.data ?? []}
                  />

                  <VocationTypeSelect
                    control={form.control}
                    name="typeUniverseId"
                    label="Universo (type_universe)"
                    placeholder="Selecione o universo"
                    options={universesData?.data ?? []}
                  />

                  <FormField
                    control={form.control}
                    name="needpremium"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 sm:col-span-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="size-4"
                            checked={field.value}
                            onChange={(event) =>
                              field.onChange(event.target.checked)
                            }
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">
                          Requer premium (needpremium)
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="published"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 sm:col-span-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="size-4"
                            checked={field.value}
                            onChange={(event) =>
                              field.onChange(event.target.checked)
                            }
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">
                          Publicada (disponível para escolha na criação de
                          personagem no site)
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <NumberField
                    control={form.control}
                    name="gaincap"
                    label="Ganho de capacidade (gaincap)"
                  />
                  <NumberField
                    control={form.control}
                    name="gainhp"
                    label="Ganho de vida (gainhp)"
                  />
                  <NumberField
                    control={form.control}
                    name="gainmana"
                    label="Ganho de mana (gainmana)"
                  />
                  <NumberField
                    control={form.control}
                    name="gainhpticks"
                    label="Intervalo de vida (gainhpticks)"
                  />
                  <NumberField
                    control={form.control}
                    name="gainhpamount"
                    label="Quantidade de vida (gainhpamount)"
                  />
                  <NumberField
                    control={form.control}
                    name="gainmanaticks"
                    label="Intervalo de mana (gainmanaticks)"
                  />
                  <NumberField
                    control={form.control}
                    name="gainmanaamount"
                    label="Quantidade de mana (gainmanaamount)"
                  />
                  <NumberField
                    control={form.control}
                    name="manamultiplier"
                    label="Multiplicador de mana (manamultiplier)"
                    step="0.1"
                  />
                  <NumberField
                    control={form.control}
                    name="attackspeed"
                    label="Velocidade de ataque (attackspeed)"
                  />
                  <NumberField
                    control={form.control}
                    name="soulmax"
                    label="Alma máxima (soulmax)"
                  />
                  <NumberField
                    control={form.control}
                    name="gainsoulticks"
                    label="Intervalo de alma (gainsoulticks)"
                  />
                  <NumberField
                    control={form.control}
                    name="fromvoc"
                    label="Vocação de origem (fromvoc)"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="formula">
              <Card>
                <CardHeader>
                  <CardTitle>Fórmula de habilidades</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    control={form.control}
                    name="formula.meleeDamage"
                    label="Dano corpo a corpo (formula_melee_damage)"
                    step="0.1"
                  />
                  <NumberField
                    control={form.control}
                    name="formula.distDamage"
                    label="Dano à distância (formula_dist_damage)"
                    step="0.1"
                  />
                  <NumberField
                    control={form.control}
                    name="formula.wandDamage"
                    label="Dano de varinha (formula_wand_damage)"
                    step="0.1"
                  />
                  <NumberField
                    control={form.control}
                    name="formula.magDamage"
                    label="Dano mágico (formula_mag_damage)"
                    step="0.1"
                  />
                  <NumberField
                    control={form.control}
                    name="formula.magHealingDamage"
                    label="Cura mágica (formula_mag_healing_damage)"
                    step="0.1"
                  />
                  <NumberField
                    control={form.control}
                    name="formula.defense"
                    label="Defesa (formula_defense)"
                    step="0.1"
                  />
                  <NumberField
                    control={form.control}
                    name="formula.magDefense"
                    label="Defesa mágica (formula_mag_defense)"
                    step="0.1"
                  />
                  <NumberField
                    control={form.control}
                    name="formula.armor"
                    label="Armadura (formula_armor)"
                    step="0.1"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="skill">
              <Card>
                <CardHeader>
                  <CardTitle>Skills/Habilidades</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    control={form.control}
                    name="skill.fist"
                    label="Punho (fist)"
                    step="0.1"
                  />
                  <NumberField
                    control={form.control}
                    name="skill.club"
                    label="Maça (club)"
                    step="0.1"
                  />
                  <NumberField
                    control={form.control}
                    name="skill.sword"
                    label="Espada (sword)"
                    step="0.1"
                  />
                  <NumberField
                    control={form.control}
                    name="skill.axe"
                    label="Machado (axe)"
                    step="0.1"
                  />
                  <NumberField
                    control={form.control}
                    name="skill.distance"
                    label="Distância (distance)"
                    step="0.1"
                  />
                  <NumberField
                    control={form.control}
                    name="skill.shielding"
                    label="Escudo (shielding)"
                    step="0.1"
                  />
                  <NumberField
                    control={form.control}
                    name="skill.fishing"
                    label="Pesca (fishing)"
                    step="0.1"
                  />
                  <NumberField
                    control={form.control}
                    name="skill.experience"
                    label="Experiência (experience)"
                    step="0.1"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="image">
              <Card>
                <CardHeader>
                  <CardTitle>Imagem</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <EntityImageUpload
                      entityType="vocation"
                      id={vocationId}
                      name={watched.name}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Salve a vocação primeiro para poder enviar uma imagem.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<Link href="/admin/vocations" />}
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
                  : "Criar vocação"}
            </Button>
          </div>
        </form>
      </Form>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle>Pré-visualização do XML</CardTitle>
        </CardHeader>
        <CardContent>
          <XmlCodeViewer value={previewXml} />
        </CardContent>
      </Card>
    </div>
  );
}
