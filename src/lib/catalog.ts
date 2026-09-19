import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import {
  CATALOG_TABLES,
  catalogRowSchemas,
  type CatalogRows,
  type SyncTable,
} from '../schemas/catalog'

/** Returns every row of a table. Injected so tests and scripts can supply their own source. */
export type TableFetcher = (table: SyncTable) => Promise<unknown[]>

/** PostgREST caps responses (1000 rows by default), so tables are read page by page. */
export const PAGE_SIZE = 1000

export function createSupabaseTableFetcher(
  client: SupabaseClient,
  pageSize = PAGE_SIZE,
): TableFetcher {
  return async (table) => {
    const rows: unknown[] = []
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await client
        .from(table)
        .select('*')
        .order('id')
        .range(from, from + pageSize - 1)
      if (error) throw new CatalogLoadError(table, error.message)
      rows.push(...data)
      if (data.length < pageSize) return rows
    }
  }
}

export class CatalogLoadError extends Error {
  readonly table: SyncTable

  constructor(table: SyncTable, message: string) {
    super(`${table}: ${message}`)
    this.name = 'CatalogLoadError'
    this.table = table
  }
}

/**
 * Loads and validates the whole reference catalog.
 * Any invalid row fails the load: silently dropping, say, one regimen item would
 * produce an incomplete course. The previous (cached) catalog stays in use instead.
 */
export async function fetchCatalog(fetchTable: TableFetcher): Promise<CatalogRows> {
  const entries = await Promise.all(
    CATALOG_TABLES.map(async (table) => {
      const raw = await fetchTable(table)
      const result = z.array(catalogRowSchemas[table]).safeParse(raw)
      if (!result.success) {
        const first = result.error.issues[0]
        const path = first?.path.join('.') ?? ''
        throw new CatalogLoadError(table, `invalid data at ${path}: ${first?.message ?? 'unknown'}`)
      }
      return [table, result.data] as const
    }),
  )
  return Object.fromEntries(entries) as unknown as CatalogRows
}
