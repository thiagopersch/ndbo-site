"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import {
  battlePassSeasonSchema,
  BATTLE_PASS_MISSION_TYPES,
  BATTLE_PASS_MISSION_TYPE_LABELS,
  BATTLE_PASS_MISSION_AMOUNT_LABELS,
  BATTLE_PASS_TRACKS,
  BATTLE_PASS_TRACK_LABELS,
  BATTLE_PASS_RARITIES,
  BATTLE_PASS_RARITY_LABELS,
  type BattlePassSeasonInput,
  type BattlePassMissionType,
} from "@/lib/validations/admin/battle-pass";
import { VOCATION_RANKS, VOCATION_RANK_LABELS, VOCATION_RANK_COLORS } from "@/lib/vocation-rank";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberField } from "@/components/shared/number-field";
import { FormattedNumberField } from "@/components/shared/formatted-number-field";
import { EntitySearchCombobox } from "@/components/shared/entity-search-combobox";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { MonsterThumb } from "@/components/shared/monster-thumb";
import { MonthYearFields } from "@/components/shared/month-year-fields";

type NamedRow = { id: number; name: string };
type MonsterRow = { id: number; name: string; lookTypeId: number | null };

const VOCATION_RANKS_WITHOUT_NONE = VOCATION_RANKS.filter((rank) => rank > 0);

type BattlePassSeasonFormDialogProps = {
  trigger: React.ReactNode;
  title: string;
  defaultValues: BattlePassSeasonInput;
  /** Quando informado (edição), o dialog busca a temporada completa (com missões/recompensas —
   * a listagem só traz as contagens) ao abrir, em vez de usar `defaultValues` diretamente. */
  seasonId?: number;
  onSubmit: (values: BattlePassSeasonInput) => Promise<boolean>;
  successMessage: string;
};

export function BattlePassSeasonFormDialog({
  trigger,
  title,
  defaultValues,
  seasonId,
  onSubmit,
  successMessage,
}: BattlePassSeasonFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: fullSeason } = useSWR<{ season: BattlePassSeasonInput }>(
    open && seasonId ? `/api/admin/battle-pass/seasons/${seasonId}` : null,
    fetcher,
  );

  const form = useForm<BattlePassSeasonInput, unknown, BattlePassSeasonInput>({
    resolver: zodResolver(battlePassSeasonSchema),
    defaultValues,
  });

  const missions = useFieldArray({ control: form.control, name: "missions" });
  const rewards = useFieldArray({ control: form.control, name: "rewards" });

  useEffect(() => {
    if (open && !seasonId) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (fullSeason) form.reset(fullSeason.season);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullSeason]);

  async function handleSubmit(values: BattlePassSeasonInput) {
    setIsSubmitting(true);
    const ok = await onSubmit(values);
    setIsSubmitting(false);

    if (!ok) return;

    toast.success(successMessage);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <Tabs defaultValue="identification">
              <TabsList>
                <TabsTrigger value="identification">Identificação</TabsTrigger>
                <TabsTrigger value="rewards">Recompensas</TabsTrigger>
              </TabsList>

              <TabsContent value="identification" className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <MonthYearFields control={form.control} yearName="year" monthName="month" />
                  <FormattedNumberField control={form.control} name="maxLevel" label="Level máximo" />
                  <FormattedNumberField control={form.control} name="xpPerLevel" label="XP por level" />
                  <FormattedNumberField control={form.control} name="goldPassCost" label="Custo do passe Gold" />
                </div>

                <FormField
                  control={form.control}
                  name="goldPassItemId"
                  render={({ field }) => {
                    const itemId = field.value;
                    return (
                      <FormItem>
                        <FormLabel>Item do passe Gold (cobrado do jogador)</FormLabel>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <EntitySearchCombobox<NamedRow>
                              endpoint="/api/admin/items"
                              value={itemId || null}
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
                          </div>
                          {itemId > 0 && <EntityThumb entityType="item" id={itemId} size="32" />}
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Missões</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        missions.append({
                          type: "kill_monster",
                          target: {},
                          description: "",
                          xpReward: 0,
                          published: true,
                        })
                      }
                    >
                      <Plus className="size-4" />
                      Adicionar
                    </Button>
                  </div>
                  {missions.fields.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma missão adicionada.</p>
                  )}
                  {missions.fields.map((rowField, index) => {
                    const type = form.watch(`missions.${index}.type`) as BattlePassMissionType;
                    return (
                      <div key={rowField.id} className="flex flex-col gap-2 rounded-md border border-border/60 p-3">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <FormField
                            control={form.control}
                            name={`missions.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipo</FormLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    form.setValue(`missions.${index}.target`, {});
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {BATTLE_PASS_MISSION_TYPES.map((missionType) => (
                                      <SelectItem key={missionType} value={missionType}>
                                        {BATTLE_PASS_MISSION_TYPE_LABELS[missionType]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`missions.${index}.description`}
                            render={({ field }) => (
                              <FormItem className="sm:col-span-2">
                                <FormLabel>Descrição</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                          {type === "kill_monster" && (
                            <FormField
                              control={form.control}
                              name={`missions.${index}.target.monster`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Monstro</FormLabel>
                                  <EntitySearchCombobox<MonsterRow>
                                    endpoint="/api/admin/monsters"
                                    value={null}
                                    placeholder={field.value || "Buscar monstro..."}
                                    formatOption={(monster) => monster.name}
                                    renderOption={(monster) => (
                                      <span className="flex items-center gap-2">
                                        <MonsterThumb
                                          id={monster.id}
                                          name={monster.name}
                                          lookTypeId={monster.lookTypeId}
                                          size="32"
                                        />
                                        {monster.name}
                                      </span>
                                    )}
                                    onSelect={(monster) => field.onChange(monster?.name ?? "")}
                                  />
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {type === "dungeon_specific_vocation" && (
                            <FormField
                              control={form.control}
                              name={`missions.${index}.target.vocationId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Vocação</FormLabel>
                                  <EntitySearchCombobox<NamedRow>
                                    endpoint="/api/admin/vocations"
                                    value={field.value ?? null}
                                    placeholder="Buscar vocação..."
                                    formatOption={(vocation) => vocation.name}
                                    onSelect={(vocation) => field.onChange(vocation?.id ?? undefined)}
                                  />
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {type === "vocation_rank" ? (
                            <FormField
                              control={form.control}
                              name={`missions.${index}.target.rank`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Rank</FormLabel>
                                  <Select
                                    value={field.value ? String(field.value) : undefined}
                                    onValueChange={(value) => field.onChange(Number(value))}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecione o rank" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {VOCATION_RANKS_WITHOUT_NONE.map((rank) => (
                                        <SelectItem key={rank} value={String(rank)}>
                                          <span className="flex items-center gap-2">
                                            <span
                                              className="size-2.5 shrink-0 rounded-full"
                                              style={{ backgroundColor: VOCATION_RANK_COLORS[rank] }}
                                            />
                                            {VOCATION_RANK_LABELS[rank]}
                                          </span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <NumberField
                              control={form.control}
                              name={`missions.${index}.target.amount`}
                              label={BATTLE_PASS_MISSION_AMOUNT_LABELS[type] || "Quantidade"}
                            />
                          )}

                          <FormattedNumberField control={form.control} name={`missions.${index}.xpReward`} label="XP" />
                        </div>

                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="w-fit"
                          onClick={() => missions.remove(index)}
                        >
                          <Trash2 className="size-4" />
                          Remover missão
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="rewards">
                <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Recompensas por level</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        rewards.append({ level: 1, track: "bronze", rarity: "comum", itemId: 0, count: 1 })
                      }
                    >
                      <Plus className="size-4" />
                      Adicionar
                    </Button>
                  </div>
                  {rewards.fields.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma recompensa adicionada.</p>
                  )}
                  {rewards.fields.map((rowField, index) => {
                    const itemId = form.watch(`rewards.${index}.itemId`);
                    return (
                      <div key={rowField.id} className="flex items-end gap-2">
                        {itemId > 0 && <EntityThumb entityType="item" id={itemId} size="32" />}
                        <div className="w-24">
                          <NumberField control={form.control} name={`rewards.${index}.level`} label="Level" />
                        </div>
                        <div className="w-32">
                          <FormField
                            control={form.control}
                            name={`rewards.${index}.track`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Trilha</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Trilha" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {BATTLE_PASS_TRACKS.map((track) => (
                                      <SelectItem key={track} value={track}>
                                        {BATTLE_PASS_TRACK_LABELS[track]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="w-40">
                          <FormField
                            control={form.control}
                            name={`rewards.${index}.rarity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Raridade</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Raridade" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {BATTLE_PASS_RARITIES.map((rarity) => (
                                      <SelectItem key={rarity} value={rarity}>
                                        {BATTLE_PASS_RARITY_LABELS[rarity]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name={`rewards.${index}.itemId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Item</FormLabel>
                                <EntitySearchCombobox<NamedRow>
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
                          <NumberField control={form.control} name={`rewards.${index}.count`} label="Quantidade" />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          onClick={() => rewards.remove(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
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
