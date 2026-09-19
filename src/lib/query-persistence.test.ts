import { dehydrate, QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { emptyCatalog } from '../schemas/catalog'
import { demoCatalog } from './catalog.fixture'
import {
  keepOnlyReadableCatalog,
  shouldPersistQuery,
  STORAGE_TIMEOUT_MS,
  withStorageTimeout,
} from './query-persistence'
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

describe('withStorageTimeout', () => {
  it('passes the value through when the store answers', async () => {
    await expect(withStorageTimeout(Promise.resolve('copy'), null)).resolves.toBe('copy')
  })

  it('gives up on a store that never answers', async () => {
    vi.useFakeTimers()
    try {
      // A pending IndexedDB delete left behind by a closed tab blocks every open on that
      // database; without the timeout the catalog query would stay paused for ever.
      const pending = withStorageTimeout(new Promise<string | null>(() => {}), null)
      await vi.advanceTimersByTimeAsync(STORAGE_TIMEOUT_MS)
      await expect(pending).resolves.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('treats a failing store as an empty one', async () => {
    await expect(
      withStorageTimeout(Promise.reject(new Error('no quota')), null),
    ).resolves.toBeNull()
  })
})
