"use client";

import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import type { PaginatedResult } from "@/lib/pagination";
import { LooktypeAnimatedImage } from "@/components/shared/looktype-animated-image";

type LooktypeRow = {
  id: number;
  frameCount: number;
  frameDurationsMs: number[];
  updatedAt: string;
};

/** Resolve a looktype pelo id (não há rota GET por id, só a listagem paginada) pra mostrar o
 * preview animado onde só o `lookTypeId`/`lookType` numérico é guardado (ex.: `npcs.look_type_id`,
 * `task_definitions.look_type`). Mesmo padrão de `MonsterThumbByName`/`ItemThumbByName`. */
export function LooktypeThumbById({ looktypeId, size = "sm" }: { looktypeId: number; size?: "sm" | "md" | "lg" }) {
  const { data } = useSWR<PaginatedResult<LooktypeRow>>(
    looktypeId > 0 ? `/api/admin/looktypes?search=${looktypeId}&pageSize=5` : null,
    fetcher,
  );

  const looktype = data?.data.find((row) => row.id === looktypeId);
  if (!looktype) return null;

  return (
    <LooktypeAnimatedImage
      key={looktype.id}
      looktypeId={looktype.id}
      frameCount={looktype.frameCount}
      frameDurationsMs={looktype.frameDurationsMs}
      updatedAt={looktype.updatedAt}
      size={size}
    />
  );
}
