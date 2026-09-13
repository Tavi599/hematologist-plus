import { Alert, Center, Loader, Stack } from '@mantine/core'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { CatalogIndex } from '../../lib/catalog-index'
import { isCatalogConfigured, useCatalog } from '../../lib/use-catalog'

/**
 * Renders its children once reference data is available (from the network or the offline copy)
 * and explains loading, offline and error states otherwise.
 */
export function CatalogGate({ children }: { children: (catalog: CatalogIndex) => ReactNode }) {
  const { t } = useTranslation()
  const query = useCatalog()

  if (!isCatalogConfigured) {
    return <Alert color="gray">{t('catalog.notConfigured')}</Alert>
  }

  if (query.data) {
    return (
      <Stack>
        {query.isError && <Alert color="yellow">{t('catalog.staleData')}</Alert>}
        {children(query.data)}
      </Stack>
    )
  }

  if (query.isError) {
    return (
      <Alert color="red" title={t('catalog.loadError')}>
        {query.error.message}
      </Alert>
    )
  }

  if (query.fetchStatus === 'paused') {
    return <Alert color="yellow">{t('catalog.offlineNoData')}</Alert>
  }

  return (
    <Center py="xl">
      <Loader aria-label={t('catalog.loading')} />
    </Center>
  )
}
