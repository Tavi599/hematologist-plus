import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import type { Query } from '@tanstack/react-query'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'
import { createStore, del, get, set } from 'idb-keyval'

import { CATALOG_SCHEMA_VERSION } from '../schemas/catalog'
import { CATALOG_QUERY_ROOT } from './use-catalog'

/** Offline copy of the catalog survives this long without a successful refresh. */
export const PERSIST_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

/**
 * Persists successful catalog queries to IndexedDB.
 * Everything else (in particular anything derived from patient input) is excluded.
 */
export function createPersistOptions(): Omit<PersistQueryClientOptions, 'queryClient'> {
  const store = createStore('hematologist-plus', 'query-cache')
  return {
    persister: createAsyncStoragePersister({
      storage: {
        getItem: (key) => get<string>(key, store).then((value) => value ?? null),
        setItem: (key, value) => set(key, value, store),
        removeItem: (key) => del(key, store),
      },
      key: 'hp.query-cache',
    }),
    maxAge: PERSIST_MAX_AGE_MS,
    buster: CATALOG_SCHEMA_VERSION,
    dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
  }
}

/**
 * Persist catalog queries that hold data. A failed refresh (offline) turns the status into
 * 'error' but keeps the previous data; that copy must stay persisted, or the next offline
 * start would have nothing to show.
 */
export function shouldPersistQuery(query: Pick<Query, 'queryKey' | 'state'>): boolean {
  return query.queryKey[0] === CATALOG_QUERY_ROOT && query.state.data !== undefined
}
