import {
  Anchor,
  Badge,
  Button,
  Chip,
  Group,
  MultiSelect,
  Paper,
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
import { strongestLevels } from '../../lib/cautions'
import type { CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage } from '../../lib/i18n'
import { useOnlyObtainable } from '../../lib/only-obtainable'
import { localize } from '../../lib/localized'
import { PREMEDICATION_ADVISED } from '../../lib/premedication'
import { PATIENT_CONDITIONS, type PatientCondition } from '../../schemas/common'
import { CautionBadges } from './CautionBadges'
import { CautionOverview } from './CautionOverview'
import { RegimenReference } from './RegimenReference'
import classes from './TreatmentTree.module.css'
import {
  countRegimens,
  drugsInTree,
  filterTree,
  lineAnchor,
  regimenIdsIn,
  splitSituations,
  type FilteredNode,
} from './treatment-filter'

/** Disease → treatment → line/stage → regimen, each regimen leading into the calculator. */
export function TreatmentTree({
  catalog,
  diseaseId,
  closed,
  onToggle,
}: {
  catalog: CatalogIndex
  diseaseId: string
  /** Lines folded away, by node id; left out, each line keeps its own state. */
  closed?: ReadonlySet<string>
  onToggle?: (nodeId: string) => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [drugIds, setDrugIds] = useState<string[]>([])
  const [onlyObtainable, setOnlyObtainable] = useOnlyObtainable()
  const [conditions, setConditions] = useState<PatientCondition[]>([])
  // Off at first: the filter does not know how severe the condition is, the physician does.
  const [hideContraindicated, setHideContraindicated] = useState(false)

  const drugs = useMemo(
    () => drugsInTree(catalog, diseaseId, (drug) => localize(drug.name, language)),
    [catalog, diseaseId, language],
  )
  // A regimen with a drug the label forbids for the patient's condition is taken out when the
  // physician asks for it; the rest stay with their marks.
  // What the other filters leave, before any regimen is taken out for the patient's condition:
  // the counts and the list of hidden regimens are read from it.
  const beforeConditions = useMemo(
    () => filterTree(catalog, diseaseId, drugIds, onlyObtainable),
    [catalog, diseaseId, drugIds, onlyObtainable],
  )
  const levels = useMemo(
    () => strongestLevels(catalog, regimenIdsIn(beforeConditions), conditions),
    [catalog, beforeConditions, conditions],
  )
  const excluded = useMemo(
    () =>
      hideContraindicated
        ? new Set([...levels].filter(([, level]) => level === 'contraindicated').map(([id]) => id))
        : new Set<string>(),
    [levels, hideContraindicated],
  )
  const nodes = useMemo(
    () => filterTree(catalog, diseaseId, drugIds, onlyObtainable, excluded),
    [catalog, diseaseId, drugIds, onlyObtainable, excluded],
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
      {/* The filters side by side on a wide screen: the regimens start one screen sooner. */}
      <Paper withBorder p="sm" radius="sm" bg="var(--mantine-color-default-hover)">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" verticalSpacing="sm">
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
          </Stack>
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              {t('diseaseDetail.conditions')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('diseaseDetail.conditionsHint')}
            </Text>
            <Chip.Group
              multiple
              value={conditions}
              onChange={(value) => setConditions(value as PatientCondition[])}
            >
              <Group gap={6}>
                {PATIENT_CONDITIONS.map((condition) => (
                  <Chip key={condition} value={condition} size="xs" variant="outline" color="red">
                    {t(`condition.${condition}`)}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
            {conditions.length > 0 && (
              <CautionOverview
                catalog={catalog}
                filtered={beforeConditions}
                levels={levels}
                conditions={conditions}
                hidden={excluded.size}
              />
            )}
            {conditions.length > 0 && (
              <Switch
                size="xs"
                label={t('diseaseDetail.hideContraindicated')}
                description={
                  hideContraindicated && excluded.size > 0
                    ? t('diseaseDetail.hiddenCount', { count: excluded.size })
                    : undefined
                }
                checked={hideContraindicated}
                onChange={(event) => setHideContraindicated(event.currentTarget.checked)}
              />
            )}
          </Stack>
        </SimpleGrid>
      </Paper>
      {nodes.map((filtered) => (
        <TreatmentNodeView
          key={filtered.node.id}
          catalog={catalog}
          filtered={filtered}
          depth={0}
          conditions={conditions}
          closed={closed}
          onToggle={onToggle}
        />
      ))}
    </Stack>
  )
}

function TreatmentNodeView({
  catalog,
  filtered,
  depth,
  conditions,
  closed,
  onToggle,
}: {
  catalog: CatalogIndex
  filtered: FilteredNode
  depth: number
  conditions: readonly PatientCondition[]
  closed?: ReadonlySet<string>
  onToggle?: (nodeId: string) => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const { node } = filtered
  // A top-level line folds away: on a disease with forty regimens the physician closes the lines
  // that are not the patient's and reads the rest. Everything starts open, so nothing is missed.
  const [ownOpened, setOwnOpened] = useState(true)
  const opened = closed ? !closed.has(node.id) : ownOpened
  const toggle = () => (onToggle ? onToggle(node.id) : setOwnOpened((current) => !current))
  const [chosen, setChosen] = useState<string[]>([])
  const count = countRegimens([filtered])
  const { situations, sections, links } = splitSituations(filtered, chosen)
  const narrowed = situations.some((situation) => chosen.includes(situation.node.id))

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
    <Stack
      gap={6}
      pl={depth === 0 ? 0 : 'md'}
      className={depth === 0 ? classes.line : undefined}
      id={depth === 0 ? lineAnchor(node.id) : undefined}
    >
      {depth === 0 ? (
        <UnstyledButton onClick={toggle} aria-expanded={opened} className={classes.toggle}>
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
          {situations.length > 0 && (
            <Stack gap={4}>
              <Chip.Group multiple value={chosen} onChange={setChosen}>
                <Group gap={6} aria-label={t('diseaseDetail.situations')}>
                  {situations.map((situation) => (
                    <Chip
                      key={situation.node.id}
                      value={situation.node.id}
                      size="xs"
                      variant="outline"
                      title={
                        situation.node.description !== null
                          ? localize(situation.node.description, language)
                          : undefined
                      }
                    >
                      {localize(situation.node.title, language)} · {situation.links.length}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
              {narrowed && (
                <Group gap="xs">
                  <Text size="xs" c={links.length === 0 ? 'red' : 'dimmed'}>
                    {links.length === 0
                      ? t('diseaseDetail.situationNone')
                      : t('diseaseDetail.situationCount', {
                          shown: links.length,
                          total: filtered.links.length,
                        })}
                  </Text>
                  <Anchor component="button" size="xs" onClick={() => setChosen([])}>
                    {t('diseaseDetail.situationReset')}
                  </Anchor>
                </Group>
              )}
            </Stack>
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
                      <CautionBadges
                        catalog={catalog}
                        regimenId={regimen!.id}
                        conditions={conditions}
                      />
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
          {sections.map((child) => (
            <TreatmentNodeView
              key={child.node.id}
              catalog={catalog}
              filtered={child}
              depth={depth + 1}
              conditions={conditions}
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
