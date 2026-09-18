import { Card, Stack, Table, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { CourseResult } from '../../domain'
import type { CatalogIndex } from '../../lib/catalog-index'
import { formatNumber } from '../../lib/format'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'

/** Vials and tablets needed for the whole course. */
export function SupplyTable({ catalog, course }: { catalog: CatalogIndex; course: CourseResult }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const presentations = new Map(
    catalog.rows.drug_presentations.map((presentation) => [presentation.id, presentation]),
  )

  return (
    <Card withBorder component="section">
      <Stack gap="sm">
        <Title order={2} size="h4">
          {t('calculator.supply.title')}
        </Title>
        {course.presentationTotals.length === 0 ? (
          <Text c="dimmed">{t('calculator.supply.empty')}</Text>
        ) : (
          <Table aria-label={t('calculator.supply.title')}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('calculator.supply.presentation')}</Table.Th>
                <Table.Th w={120}>{t('calculator.supply.count')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {course.presentationTotals.map((entry) => {
                const row = presentations.get(entry.presentation.id)
                const drug = row ? catalog.drugs.get(row.drug_id) : undefined
                return (
                  <Table.Tr key={entry.presentation.id}>
                    <Table.Td>
                      {drug ? localize(drug.name, language) : entry.presentation.id}{' '}
                      {formatNumber(entry.presentation.strengthMg, language, 2)} {t('units.mg')}
                    </Table.Td>
                    <Table.Td>{entry.count}</Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Card>
  )
}
