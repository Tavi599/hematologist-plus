import { dehydrate, QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { emptyCatalog } from '../schemas/catalog'
import { demoCatalog } from './catalog.fixture'
import { keepOnlyReadableCatalog, shouldPersistQuery } from './query-persistence'
import { CATALOG_QUERY_ROOT } from './use-catalog'

const persistedKeys = (client: QueryClient) =>
  dehydrate(client, { shouldDehydrateQuery: shouldPersistQuery }).queries.map((q) => q.queryKey)

describe('shouldPersistQuery', () => {
  it('keeps the catalog after a failed offline refresh', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const key = [CATALOG_QUERY_ROOT, '1']

    await client.fetchQuery({ queryKey: key, queryFn: async () => ({ drugs: [] }) })
    expect(persistedKeys(client)).toEqual([key])

    await client
      .fetchQuery({
        queryKey: key,
        queryFn: async () => {
          throw new Error('offline')
        },
        staleTime: 0,
      })
      .catch(() => undefined)
    expect(client.getQueryState(key)?.status).toBe('error')
    expect(persistedKeys(client)).toEqual([key])
  })

  it('never persists other queries or catalog queries without data', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    await client.fetchQuery({ queryKey: ['patient-derived'], queryFn: async () => 42 })
    await client
      .fetchQuery({
        queryKey: [CATALOG_QUERY_ROOT, 'failed'],
        queryFn: async () => {
          throw new Error('offline')
        },
      })
      .catch(() => undefined)
    expect(persistedKeys(client)).toEqual([])
  })
})

describe('keepOnlyReadableCatalog', () => {
  it('keeps a copy this version can read', () => {
    const catalog = demoCatalog()
    expect(keepOnlyReadableCatalog(catalog)).toBe(catalog)
    expect(keepOnlyReadableCatalog(emptyCatalog())).toEqual(emptyCatalog())
  })

  it('drops a copy written before a column was added', () => {
    const catalog = demoCatalog() as unknown as Record<string, unknown[] | undefined>
    // A copy from a version that did not know about dose_options yet.
    catalog.regimen_items = (catalog.regimen_items ?? []).map((row) => {
      const { dose_options: _dropped, ...rest } = row as { dose_options: unknown }
      return rest
    })
    expect(keepOnlyReadableCatalog(catalog)).toBeUndefined()
  })

  it('drops anything that is not a catalog', () => {
    expect(keepOnlyReadableCatalog(null)).toBeUndefined()
    expect(keepOnlyReadableCatalog('nope')).toBeUndefined()
    expect(keepOnlyReadableCatalog({ drugs: 'not an array' })).toBeUndefined()
  })
})
