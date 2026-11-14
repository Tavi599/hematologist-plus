import { Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { AntibacterialsReference } from '../../features/antibacterials/AntibacterialsReference'
import { CatalogGate } from '../../features/catalog/CatalogGate'

/**
 * Antibacterial drugs by class: facts cut out of the MSD Manual Professional, tied to the drug
 * cards of the catalog. A link from a disease page (`?class=…`) opens its class straight away.
 */
export function AntibacterialsPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()

  return (
    <Stack gap="sm">
      <Title order={1}>{t('antibacterials.title')}</Title>
      <Text size="sm" c="dimmed">
        {t('antibacterials.lead')}
      </Text>
      <CatalogGate>
        {(catalog) => (
          <AntibacterialsReference
            catalog={catalog}
            linked={searchParams.get('class') ?? undefined}
          />
        )}
      </CatalogGate>
    </Stack>
  )
}
