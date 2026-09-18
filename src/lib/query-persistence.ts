import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import type { Query } from '@tanstack/react-query'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'
import { createStore, del, get, set } from 'idb-keyval'

import { CATALOG_SCHEMA_VERSION, CATALOG_TABLES, catalogRowSchemas } from '../schemas/catalog'
import { CATALOG_QUERY_ROOT } from './use-catalog'

/** Offline copy of the catalog survives this long without a successful refresh. */
export const PERSIST_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000

/** Drops the offline copy so the next start refetches everything. */
export async function clearPersistedCatalog(): Promise<void> {
  if (!isIndexedDbAvailable()) return
  await del(PERSIST_KEY, createStore(DB_NAME, STORE_NAME))
}

const DB_NAME = 'hematologist-plus'
const STORE_NAME = 'query-cache'
const PERSIST_KEY = 'hp.query-cache'

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

/**
 * Persists successful catalog queries to IndexedDB.
 * Everything else (in particular anything derived from patient input) is excluded.
 */
export function createPersistOptions(): Omit<PersistQueryClientOptions, 'queryClient'> {
  const store = createStore(DB_NAME, STORE_NAME)
  return {
    persister: createAsyncStoragePersister({
      storage: {
        getItem: (key) => get<string>(key, store).then((value) => value ?? null),
        setItem: (key, value) => set(key, value, store),
        removeItem: (key) => del(key, store),
      },
      key: PERSIST_KEY,
    }),
    maxAge: PERSIST_MAX_AGE_MS,
    buster: CATALOG_SCHEMA_VERSION,
    dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
    hydrateOptions: { defaultOptions: { deserializeData: keepOnlyReadableCatalog } },
  }
}

/**
 * The stored copy was written by whatever version of the app was installed then. A column added
 * since would be missing from every row, and the running code would break on data it trusts —
 * so a copy this version cannot read is dropped and refetched instead.
 */
export function keepOnlyReadableCatalog(data: unknown): unknown {
  if (data === null || typeof data !== 'object') return undefined
  const rows = data as Record<string, unknown>
  for (const table of CATALOG_TABLES) {
    const value = rows[table]
    if (!Array.isArray(value)) return undefined
    // One row is enough to tell the shape apart; validating thousands on every start is not.
    if (value.length > 0 && !catalogRowSchemas[table].safeParse(value[0]).success) return undefined
  }
  return data
}

/**
 * Persist catalog queries that hold data. A failed refresh (offline) turns the status into
 * 'error' but keeps the previous data; that copy must stay persisted, or the next offline
 * start would have nothing to show.
 */
export function shouldPersistQuery(query: Pick<Query, 'queryKey' | 'state'>): boolean {
  return query.queryKey[0] === CATALOG_QUERY_ROOT && query.state.data !== undefined
}
