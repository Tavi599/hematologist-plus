import { Alert, Anchor, Button, Group, Modal, Stack, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { routes } from '../../app/routes'
import type { CatalogIndex } from '../../lib/catalog-index'
import { LEVEL_COLOR } from '../../lib/cautions'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import { CAUTION_LEVELS, type CautionLevel, type PatientCondition } from '../../schemas/common'
import { CautionBadges } from './CautionBadges'
import { regimenIdsIn, type FilteredNode } from './treatment-filter'

/**
 * How the patient's conditions fall on the regimens shown: how many have a drug the label forbids,
 * gives at a lower dose or warns about. Each count opens the list of those regimens by line, the
 * hidden contraindicated ones included, to be read rather than given.
 */
export function CautionOverview({
  catalog,
  filtered,
  levels,
  conditions,
  hidden,
  scope = 'shown',
}: {
  catalog: CatalogIndex
  /** The regimens counted, before contraindicated ones are taken out. */
  filtered: readonly FilteredNode[]
  /** The strongest level of each regimen; may cover more regimens than are counted. */
  levels: ReadonlyMap<string, CautionLevel | null>
  conditions: readonly PatientCondition[]
  /** How many of the contraindicated regimens counted the tree is hiding now. */
  hidden: number
  /** Whose regimens: all shown on the page, one line, or the situations chosen in it. */
  scope?: 'shown' | 'line' | 'situations'
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<CautionLevel | null>(null)

  const counts = Object.fromEntries(CAUTION_LEVELS.map((level) => [level, 0])) as Record<
    CautionLevel,
    number
  >
  const ids = regimenIdsIn(filtered)
  let clear = 0
  for (const id of ids) {
    const level = levels.get(id) ?? null
    if (level === null) clear += 1
    else counts[level] += 1
  }

  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        {t(`diseaseDetail.cautionSummary.${scope}`, { total: ids.length })}
      </Text>
      <Group gap={6}>
        {CAUTION_LEVELS.map((level) => (
          <Button
            key={level}
            size="compact-xs"
            variant="light"
            color={LEVEL_COLOR[level]}
            disabled={counts[level] === 0}
            onClick={() => setOpen(level)}
            title={t('diseaseDetail.cautionOpen')}
          >
            {t(`cautionLevel.${level}`)}: {counts[level]}
          </Button>
        ))}
        <Text size="xs" c="dimmed">
          {t('diseaseDetail.cautionClear', { count: clear })}
        </Text>
      </Group>
      {hidden > 0 && (
        <Anchor
          component="button"
          type="button"
          size="xs"
          ta="left"
          onClick={() => setOpen('contraindicated')}
        >
          {t('diseaseDetail.showHidden', { count: hidden })}
        </Anchor>
      )}
      <CautionList
        catalog={catalog}
        filtered={filtered}
        levels={levels}
        conditions={conditions}
        level={open}
        onClose={() => setOpen(null)}
      />
    </Stack>
  )
}

function CautionList({
  catalog,
  filtered,
  levels,
  conditions,
  level,
  onClose,
}: {
  catalog: CatalogIndex
  filtered: readonly FilteredNode[]
  levels: ReadonlyMap<string, CautionLevel | null>
  conditions: readonly PatientCondition[]
  level: CautionLevel | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const narrow = useMediaQuery('(max-width: 47.99em)')

  // By line, as the page shows them; a regimen in two lines is listed under each.
  const lines = filtered
    .map((line) => ({
      line: line.node,
      ids: regimenIdsIn([line]).filter((id) => level !== null && levels.get(id) === level),
    }))
    .filter((entry) => entry.ids.length > 0)

  return (
    <Modal
      opened={level !== null}
      onClose={onClose}
      size="xl"
      fullScreen={narrow}
      title={level !== null ? t(`diseaseDetail.cautionList.${level}`) : ''}
    >
      <Stack gap="md">
        <Alert color={level !== null ? LEVEL_COLOR[level] : 'gray'} variant="light">
          {t('diseaseDetail.cautionListHint', {
            conditions: conditions.map((condition) => t(`condition.${condition}`)).join(', '),
          })}
        </Alert>
        {lines.map(({ line, ids }) => (
          <Stack key={line.id} gap={6}>
            <Text fw={600}>
              {localize(line.title, language)} · {ids.length}
            </Text>
            {ids.map((id) => {
              const regimen = catalog.regimens.get(id)
              if (!regimen) return null
              const name = localize(regimen.name, language)
              return (
                <Stack key={id} gap={2} pl="sm">
                  {regimen.reference ? (
                    <Text size="sm" fw={500}>
                      {regimen.short_name}
                    </Text>
                  ) : (
                    <Anchor
                      component={Link}
                      to={`${routes.calculator}?regimen=${id}`}
                      size="sm"
                      fw={500}
                    >
                      {regimen.short_name}
                    </Anchor>
                  )}
                  {name !== regimen.short_name && (
                    <Text size="xs" c="dimmed">
                      {name}
                    </Text>
                  )}
                  <CautionBadges catalog={catalog} regimenId={id} conditions={conditions} />
                </Stack>
              )
            })}
          </Stack>
        ))}
      </Stack>
    </Modal>
  )
}
