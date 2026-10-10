import {
  Anchor,
  Badge,
  Button,
  Group,
  MultiSelect,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  UnstyledButton,
} from '@mantine/core'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { routes } from '../../app/routes'
import { regimenAvailability } from '../../lib/availability'
import type { CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage } from '../../lib/i18n'
import { useOnlyObtainable } from '../../lib/only-obtainable'
import { localize } from '../../lib/localized'
import { PREMEDICATION_ADVISED } from '../../lib/premedication'
import { RegimenReference } from './RegimenReference'
import classes from './TreatmentTree.module.css'
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
  // A top-level line folds away: on a disease with forty regimens the physician closes the lines
  // that are not the patient's and reads the rest. Everything starts open, so nothing is missed.
  const [opened, setOpened] = useState(true)
  const count = countRegimens([filtered])

  const regimens = links
    .map((link) => ({ link, regimen: catalog.regimens.get(link.regimen_id) }))
    .filter((entry) => entry.regimen !== undefined)
  // A described course has no calculator to lead into: it stands as a card, full width.
  const calculable = regimens.filter(({ regimen }) => !regimen!.reference)
  const described = regimens.filter(({ regimen }) => !!regimen!.reference)

  const heading = (
    <Group gap="xs" wrap="nowrap">
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
      {depth === 0 && !opened && count > 0 && (
        <Text size="xs" c="dimmed">
          {t('diseaseDetail.regimenCount', { count })}
        </Text>
      )}
    </Group>
  )

  return (
    <Stack gap={6} pl={depth === 0 ? 0 : 'md'} className={depth === 0 ? classes.line : undefined}>
      {depth === 0 ? (
        <UnstyledButton
          onClick={() => setOpened((current) => !current)}
          aria-expanded={opened}
          className={classes.toggle}
        >
          <Group justify="space-between" wrap="nowrap">
            {heading}
            <Text size="xs" c="dimmed" aria-hidden>
              {opened ? '▲' : '▼'}
            </Text>
          </Group>
        </UnstyledButton>
      ) : (
        heading
      )}
      <div hidden={!opened}>
        <Stack gap={6}>
          {node.description !== null && (
            <Text size="sm" c="dimmed">
              {localize(node.description, language)}
            </Text>
          )}
          {calculable.length > 0 && (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xs" verticalSpacing={4}>
              {calculable.map(({ link, regimen }) => {
                const availability = regimenAvailability(catalog, regimen!.id)
                const to = `${routes.calculator}?regimen=${regimen!.id}`
                const name = localize(regimen!.name, language)
                return (
                  <Group key={link.id} gap={6} wrap="nowrap" className={classes.regimen}>
                    <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                      <Group gap={6} wrap="nowrap">
                        <Anchor component={Link} to={to} size="sm" fw={500}>
                          {regimen!.short_name}
                        </Anchor>
                        {availability === 'unavailable' && (
                          <Badge size="xs" variant="light" color="red" tt="none">
                            {t('availability.unavailable')}
                          </Badge>
                        )}
                        {regimen!.evidence?.verdict === 'caution' && (
                          <Badge size="xs" variant="light" color="orange" tt="none">
                            {t('trial.verdictBadge.caution')}
                          </Badge>
                        )}
                      </Group>
                      {name !== regimen!.short_name && (
                        <Text size="xs" c="dimmed" lineClamp={1} title={name}>
                          {name}
                        </Text>
                      )}
                      {needsPremedication(catalog, regimen!.id) && (
                        <Text size="xs" c="orange.8">
                          {t('diseaseDetail.premedication')}
                        </Text>
                      )}
                      {link.notes !== null && <LinkNote text={localize(link.notes, language)} />}
                    </Stack>
                    <Button
                      size="compact-xs"
                      variant="light"
                      component={Link}
                      to={to}
                      aria-label={t('diseaseDetail.calculate')}
                      title={t('diseaseDetail.calculate')}
                    >
                      →
                    </Button>
                  </Group>
                )
              })}
            </SimpleGrid>
          )}
          {described.map(({ link, regimen }) => (
            <RegimenReference key={link.id} regimen={regimen!} />
          ))}
          {children.map((child) => (
            <TreatmentNodeView
              key={child.node.id}
              catalog={catalog}
              filtered={child}
              depth={depth + 1}
            />
          ))}
        </Stack>
      </div>
    </Stack>
  )
}

/** Does the regimen give a drug whose label asks for premedication? */
function needsPremedication(catalog: CatalogIndex, regimenId: string): boolean {
  return (catalog.itemsByRegimen.get(regimenId) ?? []).some(
    (item) => item.role === 'main' && PREMEDICATION_ADVISED.has(item.drug_id),
  )
}

const NCCN_NOTE = /^NCCN\s+([\d.]+):\s*(.*)$/s

/**
 * Why this regimen stands in this line: the population, the protocol, or how NCCN ranks it.
 * An NCCN note gets its version as a badge, so the comparison done against the guideline is
 * seen at a glance and its age with it.
 */
function LinkNote({ text }: { text: string }) {
  const nccn = NCCN_NOTE.exec(text)
  if (!nccn) {
    return (
      <Text size="xs" c="dimmed">
        {text}
      </Text>
    )
  }
  return (
    <Text size="xs" c="dimmed">
      <Badge size="xs" variant="light" color="indigo" tt="none" mr={4} component="span">
        NCCN {nccn[1]}
      </Badge>
      {nccn[2]}
    </Text>
  )
}
