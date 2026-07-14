"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  ELEMENT_KEYS,
  IMMUNITY_KEYS,
  MONSTER_RACES,
  defaultMonsterValues,
  monsterFormSchema,
  type MonsterFormInput,
} from "@/lib/validations/admin/monster";
import { monsterToXml } from "@/lib/monster-xml";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { NumberField } from "@/components/shared/number-field";
import { MonsterFlagsFields } from "@/components/admin/monsters/monster-flags-fields";
import { MonsterRecordGridField } from "@/components/admin/monsters/monster-record-grid-field";
import { MonsterSpellListField } from "@/components/admin/monsters/monster-spell-list-field";
import { MonsterVoiceListField } from "@/components/admin/monsters/monster-voice-list-field";
import { MonsterSummonListField } from "@/components/admin/monsters/monster-summon-list-field";
import { MonsterScriptListField } from "@/components/admin/monsters/monster-script-list-field";
import { MonsterLootListField } from "@/components/admin/monsters/monster-loot-list-field";

type MonsterFormProps = {
  monsterId?: number;
  initialValues?: MonsterFormInput;
};

export function MonsterForm({ monsterId, initialValues }: MonsterFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = monsterId != null;

  const form = useForm<MonsterFormInput, unknown, MonsterFormInput>({
    resolver: zodResolver(monsterFormSchema),
    defaultValues: initialValues ?? defaultMonsterValues,
  });

  const watched = useWatch({ control: form.control });
  const previewXml = monsterToXml({ ...defaultMonsterValues, ...watched } as MonsterFormInput);

  async function onSubmit(values: MonsterFormInput) {
    setIsSubmitting(true);

    const url = isEditing ? `/api/admin/monsters/${monsterId}` : "/api/admin/monsters";
    const method = isEditing ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error ?? "Não foi possível salvar o monstro.");
      return;
    }

    toast.success(isEditing ? "Monstro atualizado." : "Monstro criado.");
    router.push("/admin/monsters");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <Tabs defaultValue="basic">
            <TabsList className="flex-wrap">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="flags">Flags</TabsTrigger>
              <TabsTrigger value="attacks">Ataques</TabsTrigger>
              <TabsTrigger value="defenses">Defesas</TabsTrigger>
              <TabsTrigger value="resist">Imunidades / elementos</TabsTrigger>
              <TabsTrigger value="voices">Vozes</TabsTrigger>
              <TabsTrigger value="loot">Loot</TabsTrigger>
              <TabsTrigger value="summons">Summons / script</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle>Identificação</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    name="nameDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição (nameDescription)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="a monster" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bestiary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bestiary</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monster">monster</SelectItem>
                            <SelectItem value="boss">boss</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="race"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Race</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MONSTER_RACES.map((race) => (
                              <SelectItem key={race} value={race}>
                                {race}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <NumberField control={form.control} name="experience" label="Experience" />
                  <NumberField control={form.control} name="speed" label="Speed" />
                  <NumberField control={form.control} name="manacost" label="Manacost" />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Universo pertence</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder='ex.: "dragon ball"' />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subcategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subcategoria (subpasta)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder='ex.: "1-50" ou "bosses"' />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Dados de vida</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <NumberField control={form.control} name="healthNow" label="Health (now)" />
                  <NumberField control={form.control} name="healthMax" label="Health (max)" />
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Outfit</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <NumberField control={form.control} name="lookType" label="Look type (outfit)" />
                  <NumberField control={form.control} name="lookTypeEx" label="Look typeex (item)" />
                  <NumberField control={form.control} name="lookHead" label="Head" />
                  <NumberField control={form.control} name="lookBody" label="Body" />
                  <NumberField control={form.control} name="lookLegs" label="Legs" />
                  <NumberField control={form.control} name="lookFeet" label="Feet" />
                  <NumberField control={form.control} name="lookAddons" label="Addons" />
                  <NumberField control={form.control} name="corpse" label="Corpse (item id)" />
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Target change</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <NumberField control={form.control} name="targetChangeInterval" label="Interval" />
                  <NumberField control={form.control} name="targetChangeChance" label="Chance" />
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Strategy</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <NumberField control={form.control} name="strategyAttack" label="Attack (boss)" />
                  <NumberField control={form.control} name="strategyDefense" label="Defense (boss)" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="flags">
              <Card>
                <CardHeader>
                  <CardTitle>Flags</CardTitle>
                </CardHeader>
                <CardContent>
                  <MonsterFlagsFields control={form.control} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attacks">
              <Card>
                <CardHeader>
                  <CardTitle>Ataques</CardTitle>
                </CardHeader>
                <CardContent>
                  <MonsterSpellListField control={form.control} name="attacks" addLabel="Adicionar ataque" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="defenses">
              <Card>
                <CardHeader>
                  <CardTitle>Defesas</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <NumberField control={form.control} name="defenseArmor" label="Armor" />
                    <NumberField control={form.control} name="defenseValue" label="Defense" />
                  </div>
                  <MonsterSpellListField control={form.control} name="defenses" addLabel="Adicionar defesa" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resist">
              <Card>
                <CardHeader>
                  <CardTitle>Imunidades</CardTitle>
                </CardHeader>
                <CardContent>
                  <MonsterRecordGridField control={form.control} basePath="immunities" keys={IMMUNITY_KEYS} />
                </CardContent>
              </Card>
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Elementos</CardTitle>
                </CardHeader>
                <CardContent>
                  <MonsterRecordGridField control={form.control} basePath="elements" keys={ELEMENT_KEYS} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="voices">
              <Card>
                <CardHeader>
                  <CardTitle>Vozes</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <NumberField control={form.control} name="voiceInterval" label="Interval" />
                    <NumberField control={form.control} name="voiceChance" label="Chance" />
                  </div>
                  <MonsterVoiceListField control={form.control} name="voices" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="loot">
              <Card>
                <CardHeader>
                  <CardTitle>Loot</CardTitle>
                </CardHeader>
                <CardContent>
                  <MonsterLootListField control={form.control} name="loot" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summons">
              <Card>
                <CardHeader>
                  <CardTitle>Summons</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <NumberField control={form.control} name="maxSummons" label="Max summons" />
                  <MonsterSummonListField control={form.control} name="summons" />
                </CardContent>
              </Card>
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Script (eventos Lua)</CardTitle>
                </CardHeader>
                <CardContent>
                  <MonsterScriptListField control={form.control} name="script" />
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
              render={<Link href="/admin/monsters" />}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar monstro"}
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
