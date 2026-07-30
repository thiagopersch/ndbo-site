"use client";

import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
import { EntityThumb } from "@/components/shared/entity-thumb";

/** Resolve o id do item pelo nome exato (para tabelas que só guardam o nome, ex.: `lottery.item`)
 * pra poder mostrar a imagem (`EntityThumb`) vinculada no cadastro de items. Mesmo padrão de
 * `MonsterThumbByName`. */
export function ItemThumbByName({ name, size = "sm" }: { name: string; size?: "sm" | "32" | "md" | "lg" }) {
  const { data } = useSWR<PaginatedResult<{ id: number; name: string }>>(
    name ? `/api/admin/items?search=${encodeURIComponent(name)}&pageSize=5` : null,
    fetcher,
  );

  const item = data?.data.find((row) => row.name.toLowerCase() === name.toLowerCase());
  if (!item) return null;

  return <EntityThumb entityType="item" id={item.id} name={item.name} size={size} />;
}
