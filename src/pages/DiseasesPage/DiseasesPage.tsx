import { Anchor, Badge, Group, Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { routes } from '../../app/routes'
import { CatalogGate } from '../../features/catalog/CatalogGate'
import { ICD10_SYSTEM_ID, primaryCode, type CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'

export function DiseasesPage() {
  const { t } = useTranslation()

  return (
    <Stack>
      <Title order={1}>{t('diseases.title')}</Title>
      <CatalogGate>{(catalog) => <DiseaseList catalog={catalog} />}</CatalogGate>
    </Stack>
  )
}

function DiseaseList({ catalog }: { catalog: CatalogIndex }) {
  const { t } = useTranslation()
  const language = currentLanguage()

  const diseases = [...catalog.diseases.values()]
    .map((disease) => ({ disease, name: localize(disease.name, language) }))
    .sort((a, b) => a.disease.sort_order - b.disease.sort_order || a.name.localeCompare(b.name))

  if (diseases.length === 0) return <Text c="dimmed">{t('diseases.empty')}</Text>

  return (
    <Stack gap="xs" component="ul" p={0} m={0} style={{ listStyle: 'none' }}>
      {diseases.map(({ disease, name }) => {
        const code = primaryCode(catalog, disease.id, ICD10_SYSTEM_ID)
        return (
          <Group key={disease.id} component="li" gap="sm" wrap="nowrap">
            {code && (
              <Badge variant="light" miw={64}>
                {code.code}
              </Badge>
            )}
            <Anchor component={Link} to={routes.disease(disease.id)}>
              {name}
            </Anchor>
          </Group>
        )
      })}
    </Stack>
  )
}
