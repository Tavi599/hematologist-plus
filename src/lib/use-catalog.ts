import { queryOptions, skipToken, useQuery } from '@tanstack/react-query'

import { CATALOG_SCHEMA_VERSION } from '../schemas/catalog'
import { fetchCatalog, type TableFetcher } from './catalog'
import { indexCatalog } from './catalog-index'
import { catalogFetcher } from './catalog-source'

/** Only queries under this key are persisted to IndexedDB (reference data, never patient data). */
export const CATALOG_QUERY_ROOT = 'catalog'

export function catalogQueryOptions(fetcher: TableFetcher | null) {
  return queryOptions({
    queryKey: [CATALOG_QUERY_ROOT, CATALOG_SCHEMA_VERSION],
    queryFn: fetcher ? () => fetchCatalog(fetcher) : skipToken,
    select: indexCatalog,
    // Kept in memory for the whole session so the persisted copy is always available offline.
    gcTime: Infinity,
  })
}

export function useCatalog() {
  return useQuery(catalogQueryOptions(catalogFetcher))
}

export const isCatalogConfigured = catalogFetcher !== null
