"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BATTLE_PASS_MISSION_TYPES,
  BATTLE_PASS_TRACKS,
  BATTLE_PASS_RARITIES,
} from "@/lib/validations/admin/battle-pass";

type Mission = {
  id: number;
  type: string;
  target: { monster?: string; amount?: number; questId?: number; spell?: string };
  description: string;
  xpReward: number;
  published: boolean;
};

type Reward = {
  id: number;
  level: number;
  track: string;
  rarity: string;
  itemId: number;
  count: number;
};

type Season = {
  id: number;
  month: number;
  year: number;
  maxLevel: number;
  xpPerLevel: number;
  goldPassItemId: number;
  goldPassCost: number;
  missions: Mission[];
  rewards: Reward[];
};

export default function AdminBattlePassPage() {
  const { data, mutate, isLoading } = useSWR<{ season: Season }>(
    "/api/admin/battle-pass/season",
    fetcher,
  );
  const season = data?.season;

  const [missionForm, setMissionForm] = useState({
    type: "kill",
    monster: "",
    amount: 10,
    description: "",
    xpReward: 100,
  });
  const [rewardForm, setRewardForm] = useState({
    level: 1,
    track: "bronze",
    rarity: "comum",
    itemId: 0,
    count: 1,
  });

  async function addMission() {
    const target =
      missionForm.type === "kill" || missionForm.type === "spell_kill"
        ? { monster: missionForm.monster, amount: missionForm.amount }
        : {};

    const response = await fetch("/api/admin/battle-pass/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: missionForm.type,
        target,
        description: missionForm.description,
        xpReward: missionForm.xpReward,
        published: true,
      }),
    });

    if (!response.ok) {
      toast.error("Não foi possível criar a missão.");
      return;
    }
    toast.success("Missão criada.");
    setMissionForm({ ...missionForm, description: "", monster: "" });
    mutate();
  }

  async function deleteMission(id: number) {
    await fetch(`/api/admin/battle-pass/missions/${id}`, { method: "DELETE" });
    mutate();
  }

  async function addReward() {
    const response = await fetch("/api/admin/battle-pass/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rewardForm),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Não foi possível criar a recompensa.");
      return;
    }
    toast.success("Recompensa criada.");
    mutate();
  }

  async function deleteReward(id: number) {
    await fetch(`/api/admin/battle-pass/rewards/${id}`, { method: "DELETE" });
    mutate();
  }

  if (isLoading || !season) {
    return <p className="text-muted-foreground">Carregando temporada atual...</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Battle Pass — {season.month}/{season.year}
        </h1>
        <p className="text-muted-foreground">
          Temporada atual. Vira automaticamente à meia-noite do último dia do mês (missões e
          recompensas são clonadas para a próxima; jogadores mantêm as recompensas já resgatadas).
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-md border p-4">
        <h2 className="font-medium">Missões</h2>
        <div className="grid grid-cols-6 gap-2 items-end">
          <label className="flex flex-col gap-1 text-sm">
            Tipo
            <select
              className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
              value={missionForm.type}
              onChange={(e) => setMissionForm({ ...missionForm, type: e.target.value })}
            >
              {BATTLE_PASS_MISSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Monstro
            <Input
              value={missionForm.monster}
              onChange={(e) => setMissionForm({ ...missionForm, monster: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Quantidade
            <Input
              type="number"
              value={missionForm.amount}
              onChange={(e) =>
                setMissionForm({ ...missionForm, amount: Number(e.target.value) })
              }
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-sm">
            Descrição
            <Input
              value={missionForm.description}
              onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            XP
            <Input
              type="number"
              value={missionForm.xpReward}
              onChange={(e) =>
                setMissionForm({ ...missionForm, xpReward: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <Button className="w-fit" onClick={addMission}>
          Adicionar missão
        </Button>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th>Tipo</th>
              <th>Alvo</th>
              <th>Descrição</th>
              <th>XP</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {season.missions.map((m) => (
              <tr key={m.id} className="border-t">
                <td>{m.type}</td>
                <td>
                  {m.target.monster ? `${m.target.monster} x${m.target.amount}` : m.target.questId}
                </td>
                <td>{m.description}</td>
                <td>{m.xpReward}</td>
                <td>
                  <Button variant="destructive" size="icon-sm" onClick={() => deleteMission(m.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-3 rounded-md border p-4">
        <h2 className="font-medium">Recompensas por level</h2>
        <div className="grid grid-cols-6 gap-2 items-end">
          <label className="flex flex-col gap-1 text-sm">
            Level
            <Input
              type="number"
              value={rewardForm.level}
              onChange={(e) => setRewardForm({ ...rewardForm, level: Number(e.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Trilha
            <select
              className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
              value={rewardForm.track}
              onChange={(e) => setRewardForm({ ...rewardForm, track: e.target.value })}
            >
              {BATTLE_PASS_TRACKS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Raridade
            <select
              className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
              value={rewardForm.rarity}
              onChange={(e) => setRewardForm({ ...rewardForm, rarity: e.target.value })}
            >
              {BATTLE_PASS_RARITIES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Item ID
            <Input
              type="number"
              value={rewardForm.itemId}
              onChange={(e) => setRewardForm({ ...rewardForm, itemId: Number(e.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Quantidade
            <Input
              type="number"
              value={rewardForm.count}
              onChange={(e) => setRewardForm({ ...rewardForm, count: Number(e.target.value) })}
            />
          </label>
        </div>
        <Button className="w-fit" onClick={addReward}>
          Adicionar recompensa
        </Button>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th>Level</th>
              <th>Trilha</th>
              <th>Raridade</th>
              <th>Item</th>
              <th>Qtd</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {season.rewards.map((r) => (
              <tr key={r.id} className="border-t">
                <td>{r.level}</td>
                <td>{r.track}</td>
                <td>{r.rarity}</td>
                <td>#{r.itemId}</td>
                <td>{r.count}</td>
                <td>
                  <Button variant="destructive" size="icon-sm" onClick={() => deleteReward(r.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
