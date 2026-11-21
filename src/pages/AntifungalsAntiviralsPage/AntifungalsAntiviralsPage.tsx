import { Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { AntifungalsAntiviralsReference } from '../../features/antifungals-antivirals/AntifungalsAntiviralsReference'
import { CatalogGate } from '../../features/catalog/CatalogGate'

/**
 * Antifungal and antiviral drugs by class: facts cut out of the MSD Manual Professional and the
 * NCCN supportive-care pages, tied to the drug cards of the catalog. `?class=…` opens a class.
 */
export function AntifungalsAntiviralsPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()

  return (
    <Stack gap="sm">
      <Title order={1}>{t('afav.title')}</Title>
      <Text size="sm" c="dimmed">
        {t('afav.lead')}
      </Text>
      <CatalogGate>
        {(catalog) => (
          <AntifungalsAntiviralsReference
            catalog={catalog}
            linked={searchParams.get('class') ?? undefined}
          />
        )}
      </CatalogGate>
    </Stack>
  )
}
