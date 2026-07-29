"use client";

import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
import { EntityThumb } from "@/components/shared/entity-thumb";

/** `TaskDefinition.monsters` guarda só o nome do monstro (JSON), sem id — resolve o id via
 * busca exata pra poder mostrar a imagem (`EntityThumb`, cadastro de monstros) no formulário. */
export function MonsterThumbByName({ name }: { name: string }) {
  const { data } = useSWR<PaginatedResult<{ id: number; name: string }>>(
    name ? `/api/admin/monsters?search=${encodeURIComponent(name)}&pageSize=5` : null,
    fetcher,
  );

  const monster = data?.data.find((row) => row.name.toLowerCase() === name.toLowerCase());
  if (!monster) return null;

  return <EntityThumb entityType="monster" id={monster.id} name={monster.name} size="32" />;
}
