import { Anchor, Badge, Button, Group, MultiSelect, Stack, Switch, Text } from '@mantine/core'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { routes } from '../../app/routes'
import { regimenAvailability } from '../../lib/availability'
import type { CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage } from '../../lib/i18n'
import { useOnlyObtainable } from '../../lib/only-obtainable'
import { localize } from '../../lib/localized'
import { RegimenReference } from './RegimenReference'
import { countRegimens, drugsInTree, filterTree, type FilteredNode } from './treatment-filter'

/** Disease → treatment → line/stage → regimen, each regimen leading into the calculator. */
export function TreatmentTree({
  catalog,
  diseaseId,
}: {
  catalog: CatalogIndex
  diseaseId: string
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [drugIds, setDrugIds] = useState<string[]>([])
  const [onlyObtainable, setOnlyObtainable] = useOnlyObtainable()

  const drugs = useMemo(
    () => drugsInTree(catalog, diseaseId, (drug) => localize(drug.name, language)),
    [catalog, diseaseId, language],
  )
  const nodes = useMemo(
    () => filterTree(catalog, diseaseId, drugIds, onlyObtainable),
    [catalog, diseaseId, drugIds, onlyObtainable],
  )
  const hidden = useMemo(
    () =>
      onlyObtainable
        ? countRegimens(filterTree(catalog, diseaseId, drugIds)) -
          countRegimens(filterTree(catalog, diseaseId, drugIds, true))
        : 0,
    [catalog, diseaseId, drugIds, onlyObtainable],
  )

  const roots = catalog.rootNodesByDisease.get(diseaseId) ?? []
  if (roots.length === 0) return <Text c="dimmed">{t('diseaseDetail.noTreatment')}</Text>

  const shown = countRegimens(nodes)

  return (
    <Stack gap="sm">
      <Switch
        label={t('diseaseDetail.hideUnavailable')}
        description={
          onlyObtainable && hidden > 0
            ? t('diseaseDetail.hiddenCount', { count: hidden })
            : undefined
        }
        checked={onlyObtainable}
        onChange={(event) => setOnlyObtainable(event.currentTarget.checked)}
      />
      {/* Worth the room only where there is a list to cut down; two regimens are read faster than
          a filter is filled in. */}
      {drugs.length > 1 && (
        <Stack gap={4}>
          <MultiSelect
            label={t('diseaseDetail.filter')}
            description={t('diseaseDetail.filterHint')}
            data={drugs.map(({ drug, label }) => ({ value: drug.id, label }))}
            value={drugIds}
            onChange={setDrugIds}
            searchable
            clearable
            maxDropdownHeight={280}
          />
          {drugIds.length > 0 && (
            <Text size="xs" c={shown === 0 ? 'red' : 'dimmed'}>
              {shown === 0
                ? t('diseaseDetail.filterNone')
                : t('diseaseDetail.filterCount', { shown })}
            </Text>
          )}
        </Stack>
      )}
      {nodes.map((filtered) => (
        <TreatmentNodeView key={filtered.node.id} catalog={catalog} filtered={filtered} depth={0} />
      ))}
    </Stack>
  )
}

function TreatmentNodeView({
  catalog,
  filtered,
  depth,
}: {
  catalog: CatalogIndex
  filtered: FilteredNode
  depth: number
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const { node, links, children } = filtered

  return (
    <Stack gap={6} pl={depth === 0 ? 0 : 'md'}>
      <Group gap="xs">
        <Text fw={depth === 0 ? 600 : 500}>{localize(node.title, language)}</Text>
        {/* A trial section is not another line of treatment; the badge has to say so at a glance. */}
        <Badge
          size="xs"
          variant="light"
          color={node.kind === 'trial' ? 'yellow' : node.kind === 'reference' ? 'cyan' : 'gray'}
          tt="none"
        >
          {t(`treatmentKind.${node.kind}`)}
        </Badge>
      </Group>
      {node.description !== null && (
        <Text size="sm" c="dimmed">
          {localize(node.description, language)}
        </Text>
      )}
      {links.map((link) => {
        const regimen = catalog.regimens.get(link.regimen_id)
        if (!regimen) return null
        // A described course has no calculator to lead into: it stands as a card.
        if (regimen.reference !== null && regimen.reference !== undefined) {
          return <RegimenReference key={link.id} regimen={regimen} />
        }
        const availability = regimenAvailability(catalog, regimen.id)
        return (
          <Group key={link.id} gap="sm" wrap="wrap" pl="md">
            <Anchor component={Link} to={`${routes.calculator}?regimen=${regimen.id}`}>
              {regimen.short_name}
            </Anchor>
            {availability === 'unavailable' && (
              <Badge size="xs" variant="light" color="red" tt="none">
                {t('availability.unavailable')}
              </Badge>
            )}
            <Button
              size="compact-xs"
              variant="light"
              component={Link}
              to={`${routes.calculator}?regimen=${regimen.id}`}
            >
              {t('diseaseDetail.calculate')}
            </Button>
          </Group>
        )
      })}
      {children.map((child) => (
        <TreatmentNodeView
          key={child.node.id}
          catalog={catalog}
          filtered={child}
          depth={depth + 1}
        />
      ))}
    </Stack>
  )
}
