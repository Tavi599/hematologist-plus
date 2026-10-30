import { queryOptions, useQuery } from '@tanstack/react-query'

import { fetchHandbookChapter, fetchHandbookIndex } from './handbook'

/**
 * The handbook's own query root. It is deliberately not `catalog`: only catalog
 * queries are persisted to IndexedDB, and the handbook is static files that the
 * service worker caches on its own. Keeping a second copy of 1.6 million
 * characters in IndexedDB would buy nothing.
 */
export const HANDBOOK_QUERY_ROOT = 'handbook'

export function handbookIndexQueryOptions() {
  return queryOptions({
    queryKey: [HANDBOOK_QUERY_ROOT, 'index'],
    queryFn: fetchHandbookIndex,
    // A published book: it only changes when the import is re-run.
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function handbookChapterQueryOptions(number: number | null) {
  return queryOptions({
    queryKey: [HANDBOOK_QUERY_ROOT, 'chapter', number],
    queryFn: number === null ? undefined : () => fetchHandbookChapter(number),
    enabled: number !== null,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export const useHandbookIndex = () => useQuery(handbookIndexQueryOptions())
export const useHandbookChapter = (number: number | null) =>
  useQuery(handbookChapterQueryOptions(number))
