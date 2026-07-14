import { z } from "zod";

/**
 * Padrão único de paginação para as rotas admin: `page` (1-based), `pageSize`
 * (10/25/50/100) e `search` (busca livre). Toda rota paginada deve usar
 * `parsePaginationParams` para ler a query string e `buildPaginatedResult`
 * para montar a resposta — mantém o contrato idêntico em todas as listas.
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(10),
  search: z.string().default(""),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export function parsePaginationParams(url: URL): PaginationQuery {
  return paginationQuerySchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  });
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  return { data, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
