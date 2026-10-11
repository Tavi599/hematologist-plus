import { Badge, Group, Stack, Text, Tooltip } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { LEVEL_COLOR, regimenCautions } from '../../lib/cautions'
import type { CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import type { PatientCondition } from '../../schemas/common'

/**
 * The regimen's drugs whose label speaks to the patient's conditions: the drug and how strongly,
 * with the label's own threshold and dose on hover or tap.
 */
export function CautionBadges({
  catalog,
  regimenId,
  conditions,
}: {
  catalog: CatalogIndex
  /** One regimen, or the phases of a course: a drug of any of them is named once. */
  regimenId: string | readonly string[]
  conditions: readonly PatientCondition[]
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const ids = typeof regimenId === 'string' ? [regimenId] : regimenId
  const byDrug = new Map(
    ids
      .flatMap((id) => regimenCautions(catalog, id, conditions))
      .map((entry) => [entry.drugId, entry] as const),
  )
  const found = [...byDrug.values()]
  if (found.length === 0) return null
  return (
    <Group gap={4} mt={2}>
      {found.map(({ drugId, level, cautions }) => {
        const drug = catalog.drugs.get(drugId)
        const name = drug ? localize(drug.name, language) : drugId
        return (
          <Tooltip
            key={drugId}
            multiline
            w={320}
            withArrow
            events={{ hover: true, focus: true, touch: true }}
            label={
              <Stack gap={4}>
                {cautions.map((caution, index) => (
                  <Text key={index} size="xs">
                    <b>{t(`condition.${caution.condition}`)}</b> ·{' '}
                    {t(`cautionLevel.${caution.level}`)}: {localize(caution.notes, language)} (
                    {caution.source.name})
                  </Text>
                ))}
              </Stack>
            }
          >
            <Badge
              size="xs"
              variant="light"
              color={LEVEL_COLOR[level]}
              tt="none"
              tabIndex={0}
              style={{ cursor: 'help' }}
            >
              {name}: {t(`cautionLevel.${level}`)}
            </Badge>
          </Tooltip>
        )
      })}
    </Group>
  )
}
