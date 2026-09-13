import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { useState, type ReactNode } from 'react'

import { createPersistOptions, isIndexedDbAvailable } from '../lib/query-persistence'
import { theme } from './theme'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Reference data changes rarely (only via admin sync), so keep it fresh for long.
          queries: { staleTime: 60 * 60 * 1000, retry: 1 },
        },
      }),
  )
  // The catalog is persisted to IndexedDB for offline use; environments without it (tests) skip that.
  const [persistOptions] = useState(() => (isIndexedDbAvailable() ? createPersistOptions() : null))

  return (
    <MantineProvider theme={theme}>
      {persistOptions ? (
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          {children}
        </PersistQueryClientProvider>
      ) : (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )}
    </MantineProvider>
  )
}
