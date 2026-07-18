"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import dayjs from "dayjs";
import { Search } from "lucide-react";

import { fetcher } from "@/lib/fetcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TibiaEquipmentPanel,
  type Equipment,
} from "@/components/shared/tibia-equipment-panel";

type CharacterDetail = {
  id: number;
  name: string;
  level: number;
  vocationName: string;
  experience: string;
  sex: number;
  online: number;
  lastlogin: number;
  resets: number;
  balance: number;
  cap: number;
  soul: number;
  guild: { id: number; name: string; rank: string } | null;
  equipment: Equipment;
};

export function CharacterSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialName = searchParams.get("name") ?? "";
  const [query, setQuery] = useState(initialName);

  const { data, isLoading } = useSWR<{
    player?: CharacterDetail;
    error?: string;
  }>(
    initialName
      ? `/api/public/characters/${encodeURIComponent(initialName)}`
      : null,
    fetcher,
  );

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim()) {
      router.push(
        `/community/characters?name=${encodeURIComponent(query.trim())}`,
      );
    }
  }

  const player = data?.player;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Nome do personagem"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit">
          <Search className="size-4" />
          Buscar
        </Button>
      </form>

      {isLoading && <p className="text-muted-foreground">Buscando...</p>}

      {!isLoading && initialName && !player && (
        <p className="text-muted-foreground">
          Nenhum personagem encontrado com esse nome.
        </p>
      )}

      {player && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {player.name}
              <Badge variant={player.online ? "default" : "secondary"}>
                {player.online ? "Online" : "Offline"}
              </Badge>
            </CardTitle>
            <CardDescription>
              {player.guild
                ? `${player.guild.name} (${player.guild.rank})`
                : "Sem guild"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <span className="text-muted-foreground">Level</span>
              <span>{player.level}</span>
              <span className="text-muted-foreground">Vocação</span>
              <span>{player.vocationName}</span>
              <span className="text-muted-foreground">Experiência</span>
              <span>{player.experience}</span>
              <span className="text-muted-foreground">Resets</span>
              <span>{player.resets}</span>
              <span className="text-muted-foreground">Último login</span>
              <span>
                {player.lastlogin
                  ? dayjs.unix(player.lastlogin).format("DD/MM/YYYY HH:mm")
                  : "—"}
              </span>
            </div>

            <TibiaEquipmentPanel
              equipment={player.equipment}
              cap={player.cap}
              soul={player.soul}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
