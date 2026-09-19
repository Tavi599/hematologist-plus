import { describe, expect, it, vi } from 'vitest'

import { CATALOG_TABLES, emptyCatalog, type SyncTable } from '../schemas/catalog'
import { CatalogLoadError, createSupabaseTableFetcher, fetchCatalog } from './catalog'
import { ICD10_SYSTEM_ID, indexCatalog, primaryCode } from './catalog-index'
import { demoCatalog } from './catalog.fixture'

describe('fetchCatalog', () => {
  it('loads and validates every table', async () => {
    const catalog = demoCatalog()
    const fetchTable = vi.fn(async (table: SyncTable) => catalog[table as keyof typeof catalog])
    // Article text needs a session and is never part of the catalog the site loads.
    const { disease_articles: _private, ...publicTables } = catalog as Record<string, unknown>
    await expect(fetchCatalog(fetchTable)).resolves.toEqual(publicTables)
    expect(fetchTable.mock.calls.map(([table]) => table).sort()).toEqual([...CATALOG_TABLES].sort())
  })

  it('fails the whole load on one invalid row instead of dropping it', async () => {
    const catalog = demoCatalog()
    const broken = { ...catalog.regimen_items[0]!, dose_unit: 'mg_per_day' }
    const fetchTable = async (table: SyncTable) =>
      table === 'regimen_items' ? [broken] : catalog[table as keyof typeof catalog]
    await expect(fetchCatalog(fetchTable)).rejects.toThrow(
      /^regimen_items: invalid data at 0\.dose_unit/,
    )
  })
})

describe('createSupabaseTableFetcher', () => {
  function fakeClient(total: number, failOn?: number) {
    const ranges: [number, number][] = []
    const client = {
      from: () => ({
        select: () => ({
          order: () => ({
            range: async (from: number, to: number) => {
              ranges.push([from, to])
              if (from === failOn) return { data: null, error: { message: 'boom' } }
              const count = Math.max(0, Math.min(to, total - 1) - from + 1)
              return {
                data: Array.from({ length: count }, (_, i) => ({ n: from + i })),
                error: null,
              }
            },
          }),
        }),
      }),
    }
    return { client: client as never, ranges }
  }

  it('reads page by page until a short page', async () => {
    const { client, ranges } = fakeClient(5)
    const rows = await createSupabaseTableFetcher(client, 2)('drugs')
    expect(rows).toHaveLength(5)
    expect(ranges).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ])
  })

  it('requests one more page when the last page is exactly full', async () => {
    const { client, ranges } = fakeClient(4)
    await expect(createSupabaseTableFetcher(client, 2)('drugs')).resolves.toHaveLength(4)
    expect(ranges).toHaveLength(3)
  })

  it('wraps API errors', async () => {
    const { client } = fakeClient(10, 2)
    const error = await createSupabaseTableFetcher(client, 2)('diseases').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(CatalogLoadError)
    expect(error).toMatchObject({ table: 'diseases', message: 'diseases: boom' })
  })
})

describe('indexCatalog', () => {
  it('builds sorted lookups', () => {
    const catalog = demoCatalog()
    catalog.regimen_items.reverse()
    const index = indexCatalog(catalog)

    expect(index.defaultHospital?.id).toBe('demo-hospital')
    expect(index.itemsByRegimen.get('r-chop-21')?.map((item) => item.drug_id)).toEqual([
      'rituximab',
      'cyclophosphamide',
      'doxorubicin',
      'vincristine',
      'prednisolone',
    ])
    expect(index.presentationsByDrug.get('cyclophosphamide')?.map((p) => p.strength_mg)).toEqual([
      200, 500, 1000,
    ])
    expect(index.rootNodesByDisease.get('dlbcl')?.map((node) => node.id)).toEqual([
      'dlbcl.first-line',
    ])
    expect(index.regimenLinksByNode.get('dlbcl.first-line')?.[0]?.regimen_id).toBe('r-chop-21')
    expect(primaryCode(index, 'dlbcl', ICD10_SYSTEM_ID)?.code).toBe('C83.3')
  })

  it('handles an empty catalog and codes without a primary flag', () => {
    const empty = indexCatalog(emptyCatalog())
    expect(empty.defaultHospital).toBeNull()
    expect(primaryCode(empty, 'dlbcl', ICD10_SYSTEM_ID)).toBeNull()

    const catalog = demoCatalog()
    catalog.hospitals[0]!.is_default = false
    catalog.disease_codes = [
      { ...catalog.disease_codes[0]!, id: 'b', code: 'C83.9', is_primary: false, sort_order: 1 },
      { ...catalog.disease_codes[0]!, id: 'a', code: 'C83.3', is_primary: false, sort_order: 0 },
    ]
    const index = indexCatalog(catalog)
    expect(index.defaultHospital?.id).toBe('demo-hospital')
    expect(primaryCode(index, 'dlbcl', ICD10_SYSTEM_ID)?.code).toBe('C83.3')
  })
})
