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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  guild: { id: number; name: string; rank: string } | null;
};

export function CharacterSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialName = searchParams.get("name") ?? "";
  const [query, setQuery] = useState(initialName);

  const { data, isLoading } = useSWR<{ player?: CharacterDetail; error?: string }>(
    initialName ? `/api/public/characters/${encodeURIComponent(initialName)}` : null,
    fetcher
  );

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim()) {
      router.push(`/community/characters?name=${encodeURIComponent(query.trim())}`);
    }
  }

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

      {!isLoading && initialName && !data?.player && (
        <p className="text-muted-foreground">Nenhum personagem encontrado com esse nome.</p>
      )}

      {data?.player && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {data.player.name}
              <Badge variant={data.player.online ? "default" : "secondary"}>
                {data.player.online ? "Online" : "Offline"}
              </Badge>
            </CardTitle>
            <CardDescription>
              {data.player.guild ? `${data.player.guild.name} (${data.player.guild.rank})` : "Sem guild"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <span className="text-muted-foreground">Level</span>
            <span>{data.player.level}</span>
            <span className="text-muted-foreground">Vocação</span>
            <span>{data.player.vocationName}</span>
            <span className="text-muted-foreground">Experiência</span>
            <span>{data.player.experience}</span>
            <span className="text-muted-foreground">Resets</span>
            <span>{data.player.resets}</span>
            <span className="text-muted-foreground">Último login</span>
            <span>
              {data.player.lastlogin
                ? dayjs.unix(data.player.lastlogin).format("DD/MM/YYYY HH:mm")
                : "—"}
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
