import { Badge, Card, Group, List, Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { CatalogIndex } from '../../lib/catalog-index'
import type { CourseItem } from '../../lib/course-input'
import { formatNumber } from '../../lib/format'
import { currentLanguage, type DynamicTranslate, type Language } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import type { Drug, DrugInfusionParams } from '../../schemas/catalog'
import type { Source } from '../../schemas/common'
import { preparedDrugs } from './preparation'
import { SourceNotes } from './SourceNotes'

/**
 * How the labels say to prepare every drug of the course: reconstitution, dilution, keeping,
 * light and filters for the routes the course gives it by, then the infusion parameters the
 * calculation used. Nothing here is invented: a drug the catalog has no label text for says so.
 */
export function PreparationTable({
  catalog,
  items,
  disabledIds,
}: {
  catalog: CatalogIndex
  items: CourseItem[]
  /** Rows the physician switched off: they are not given, so not prepared either. */
  disabledIds: readonly string[]
}) {
  const { t } = useTranslation()
  const tu = t as unknown as DynamicTranslate
  const language = currentLanguage()
  const drugs = preparedDrugs(items, new Set(disabledIds))

  return (
    <Card withBorder component="section">
      <Stack gap="sm">
        <Title order={2} size="h4">
          {t('calculator.preparation.title')}
        </Title>
        <Text size="sm" c="dimmed">
          {t('calculator.preparation.intro')}
        </Text>
        {drugs.length === 0 && <Text c="dimmed">{t('calculator.preparation.none')}</Text>}
        {drugs.map(({ drug, routes }) => {
          const preparation = (drug.preparation ?? []).filter((entry) =>
            entry.routes.some((route) => routes.includes(route)),
          )
          const infusion = routes.includes('iv_infusion')
            ? catalog.rows.drug_infusion_params.filter((params) => params.drug_id === drug.id)
            : []
          const sources: Source[] = [
            ...preparation.map((entry) => entry.source),
            ...infusion.flatMap((params) => params.sources),
          ]
          return (
            <Stack
              key={drug.id}
              gap={6}
              component="article"
              aria-label={localize(drug.name, language)}
            >
              <Group gap="xs">
                <Title order={3} size="h5">
                  {localize(drug.name, language)}
                </Title>
                {routes.map((route) => (
                  <Badge key={route} size="sm" variant="light" tt="none">
                    {tu(`route.${route}`)}
                  </Badge>
                ))}
              </Group>
              {preparation.length === 0 && infusion.length === 0 ? (
                <Text size="sm" c="dimmed">
                  {t('calculator.preparation.missing')}
                </Text>
              ) : (
                <List size="sm" spacing={4}>
                  {preparation.map((entry, index) => (
                    <List.Item key={`p${index}`}>
                      {preparation.length > 1 || routes.length > 1 ? (
                        <Text span size="sm" fw={500}>
                          {entry.routes.map((route) => tu(`route.${route}`)).join(', ')}:{' '}
                        </Text>
                      ) : null}
                      {localize(entry.notes, language)}
                    </List.Item>
                  ))}
                  {infusion.map((params) => (
                    <List.Item key={params.id}>
                      {infusionLine(params, drug, tu, language)}
                    </List.Item>
                  ))}
                </List>
              )}
              <SourceNotes sources={sources} />
            </Stack>
          )
        })}
      </Stack>
    </Card>
  )
}

/** One line of infusion parameters as the catalog holds them; a missing number is left out. */
function infusionLine(
  params: DrugInfusionParams,
  drug: Drug,
  tu: DynamicTranslate,
  language: Language,
): string {
  const parts: string[] = [tu(`solvent.${params.solvent}`)]
  if (params.bag_volumes_ml.length > 0) {
    parts.push(
      tu('calculator.preparation.bags', {
        volumes: params.bag_volumes_ml
          .map((volume) => formatNumber(volume, language, 0))
          .join(' / '),
      }),
    )
  }
  if (params.stock_concentration_mg_ml !== null) {
    parts.push(
      tu('calculator.preparation.stock', {
        value: formatNumber(params.stock_concentration_mg_ml, language, 3),
        unit: tu(`units.${drug.amount_unit}`),
      }),
    )
  }
  const min = params.concentration_min_mg_ml
  const max = params.concentration_max_mg_ml
  if (min !== null || max !== null) {
    parts.push(
      tu('calculator.preparation.range', {
        min: min === null ? '…' : formatNumber(min, language, 3),
        max: max === null ? '…' : formatNumber(max, language, 3),
        unit: tu(`units.${drug.amount_unit}`),
      }),
    )
  }
  if (params.duration_min !== null) {
    parts.push(tu('calculator.preparation.duration', { minutes: params.duration_min }))
  }
  const line = parts.join(' · ')
  return params.notes === null ? line : `${line}. ${localize(params.notes, language)}`
}
