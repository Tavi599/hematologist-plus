import {
  Anchor,
  Badge,
  Button,
  Chip,
  Group,
  MultiSelect,
  TextInput,
  CloseButton,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
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
import { PATIENT_CONDITIONS, type CautionLevel, type PatientCondition } from '../../schemas/common'
import { CautionBadges } from './CautionBadges'
import { CautionOverview } from './CautionOverview'
import type { TreatmentNode } from '../../schemas/catalog'
import { InfectionRiskMark } from '../immunodeficiency/TherapyRiskMarks'
import { IRRADIATION_DRUGS } from '../irradiated/indications'
import { RegimenReference } from './RegimenReference'
import { useTreeFilters } from './use-tree-filters'
import classes from './TreatmentTree.module.css'
import {
  countRegimens,
  drugsInTree,
  filterTree,
  lineAnchor,
  courseTiles,
  regimenIdsIn,
  type LinkedRegimen,
  type RegimenTile,
  regimensInTree,
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
  const [onlyObtainable, setOnlyObtainable] = useOnlyObtainable()
  // Kept for the tab, so a trip to the calculator does not cost the physician the patient's
  // filters. The contraindicated regimens stay shown at first: the filter does not know how
  // severe the condition is, the physician does.
  const [filters, setFilters] = useTreeFilters(diseaseId)
  const { drugIds, conditions, hideContraindicated, query } = filters
  const setDrugIds = (next: string[]) => setFilters({ drugIds: next })
  const setConditions = (next: PatientCondition[]) => setFilters({ conditions: next })
  const setHideContraindicated = (next: boolean) => setFilters({ hideContraindicated: next })

  // A regimen sought by name: everything whose short or full name does not hold the words is
  // left out, wherever it stands in the tree.
  const notNamed = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return new Set<string>()
    return new Set(
      [...regimensInTree(catalog, diseaseId)].filter((id) => {
        const regimen = catalog.regimens.get(id)
        if (!regimen) return true
        const text = [regimen.short_name, regimen.name.uk ?? '', regimen.name.en ?? '']
          .join(' ')
          .toLowerCase()
        return !words.every((word) => text.includes(word))
      }),
    )
  }, [catalog, diseaseId, query])

  const drugs = useMemo(
    () => drugsInTree(catalog, diseaseId, (drug) => localize(drug.name, language)),
    [catalog, diseaseId, language],
  )
  // A regimen with a drug the label forbids for the patient's condition is taken out when the
  // physician asks for it; the rest stay with their marks.
  // What the other filters leave, before any regimen is taken out for the patient's condition:
  // the counts and the list of hidden regimens are read from it.
  const beforeConditions = useMemo(
    () => filterTree(catalog, diseaseId, drugIds, onlyObtainable, notNamed),
    [catalog, diseaseId, drugIds, onlyObtainable, notNamed],
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
    () =>
      filterTree(catalog, diseaseId, drugIds, onlyObtainable, new Set([...notNamed, ...excluded])),
    [catalog, diseaseId, drugIds, onlyObtainable, notNamed, excluded],
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
            <Stack gap={4}>
              <TextInput
                label={t('diseaseDetail.search')}
                placeholder={t('diseaseDetail.searchPlaceholder')}
                value={query}
                onChange={(event) => setFilters({ query: event.currentTarget.value })}
                rightSection={
                  query !== '' ? (
                    <CloseButton
                      size="sm"
                      aria-label={t('diseaseDetail.searchClear')}
                      onClick={() => setFilters({ query: '' })}
                    />
                  ) : undefined
                }
              />
              {query.trim() !== '' && (
                <Text size="xs" c={shown === 0 ? 'red' : 'dimmed'}>
                  {shown === 0
                    ? t('diseaseDetail.searchNone')
                    : t('diseaseDetail.filterCount', { shown })}
                </Text>
              )}
            </Stack>
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
          unfiltered={beforeConditions.find((line) => line.node.id === filtered.node.id)}
          levels={levels}
          excluded={excluded}
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
  unfiltered,
  levels,
  excluded,
}: {
  catalog: CatalogIndex
  filtered: FilteredNode
  depth: number
  conditions: readonly PatientCondition[]
  closed?: ReadonlySet<string>
  onToggle?: (nodeId: string) => void
  /** A line as it is before contraindicated regimens are hidden, for its own caution counts. */
  unfiltered?: FilteredNode
  levels?: ReadonlyMap<string, CautionLevel | null>
  excluded?: ReadonlySet<string>
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
  const { situations, sections, links } = splitSituations(filtered, chosen)
  const narrowed = situations.some((situation) => chosen.includes(situation.node.id))
  // The line's own counts for the patient's conditions, over the situations chosen in it; the
  // regimens hidden as contraindicated are counted, so the list can still show them.
  const counted =
    unfiltered && levels && conditions.length > 0
      ? { ...unfiltered, links: splitSituations(unfiltered, chosen).links, children: [] }
      : null

  const regimens = links
    .map((link) => ({ link, regimen: catalog.regimens.get(link.regimen_id) }))
    .filter((entry) => entry.regimen !== undefined)
  // A described course has no calculator to lead into: it stands as a card, full width.
  const calculable = regimens.filter(({ regimen }) => !regimen!.reference)
  const described = regimens.filter(({ regimen }) => !!regimen!.reference)

  const heading = (
    <Group gap="xs" wrap="wrap">
      {depth === 0 ? (
        <Title order={3} size="h4" fw={700}>
          {localize(node.title, language)}
        </Title>
      ) : (
        <Text fw={700} size="md">
          {localize(node.title, language)}
        </Text>
      )}
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
  )

  return (
    <Stack
      gap={6}
      pl={depth === 0 ? 0 : 'md'}
      className={depth === 0 ? classes.line : undefined}
      id={depth === 0 ? lineAnchor(node.id) : undefined}
    >
      {depth === 0 ? (
        <UnstyledButton
          onClick={toggle}
          aria-expanded={opened}
          className={classes.toggle}
          style={{ '--accent': `var(--mantine-color-${KIND_ACCENT[node.kind] ?? 'gray'}-filled)` }}
        >
          <Group justify="space-between" wrap="nowrap">
            {heading}
            <Text size="xl" c="dimmed" aria-hidden>
              {opened ? '▾' : '▸'}
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
          {counted && counted.links.length > 0 && (
            <CautionOverview
              catalog={catalog}
              filtered={[counted]}
              levels={levels!}
              conditions={conditions}
              hidden={counted.links.filter((link) => excluded?.has(link.regimen_id)).length}
              scope={narrowed ? 'situations' : 'line'}
            />
          )}
          {calculable.length > 0 && (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xs" verticalSpacing={4}>
              {courseTiles(calculable as LinkedRegimen[]).map((tile) =>
                tile.kind === 'single' ? (
                  <RegimenTileView
                    key={tile.entry.link.id}
                    catalog={catalog}
                    entry={tile.entry}
                    conditions={conditions}
                  />
                ) : (
                  <CourseTileView
                    key={`${filtered.node.id}:${tile.course.id}`}
                    catalog={catalog}
                    tile={tile}
                    conditions={conditions}
                  />
                ),
              )}
            </SimpleGrid>
          )}
          {described.map(({ link, regimen }) => (
            <Stack key={link.id} gap={2}>
              <RegimenReference regimen={regimen!} />
              <InfectionRiskMark catalog={catalog} regimenIds={[regimen!.id]} />
            </Stack>
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

/** One regimen in the grid: its name, its marks, and the arrow into the calculator. */
function RegimenTileView({
  catalog,
  entry: { link, regimen },
  conditions,
}: {
  catalog: CatalogIndex
  entry: LinkedRegimen
  conditions: readonly PatientCondition[]
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const availability = regimenAvailability(catalog, regimen.id)
  const to = `${routes.calculator}?regimen=${regimen.id}`
  const name = localize(regimen.name, language)
  return (
    <Group gap={6} wrap="nowrap" className={classes.regimen}>
      <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
        <Group gap={6} wrap="nowrap">
          <Anchor component={Link} to={to} size="sm" fw={500}>
            {regimen.short_name}
          </Anchor>
          {availability === 'unavailable' && (
            <Badge size="xs" variant="light" color="red" tt="none">
              {t('availability.unavailable')}
            </Badge>
          )}
          {regimen.evidence?.verdict === 'caution' && (
            <Badge size="xs" variant="light" color="orange" tt="none">
              {t('trial.verdictBadge.caution')}
            </Badge>
          )}
        </Group>
        {name !== regimen.short_name && (
          <Text size="xs" c="dimmed" lineClamp={1} title={name}>
            {name}
          </Text>
        )}
        <CautionBadges catalog={catalog} regimenId={regimen.id} conditions={conditions} />
        <IrradiationMark catalog={catalog} regimenIds={[regimen.id]} />
        <InfectionRiskMark catalog={catalog} regimenIds={[regimen.id]} />
        {needsPremedication(catalog, [regimen.id]) && (
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
}

/**
 * A course in several phases as one tile: its title, then a button for each phase into the
 * calculator, in the order they are given. The marks are those of every phase together.
 */
function CourseTileView({
  catalog,
  tile: { course, phases },
  conditions,
}: {
  catalog: CatalogIndex
  tile: Extract<RegimenTile, { kind: 'course' }>
  conditions: readonly PatientCondition[]
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const ids = phases.map(({ regimen }) => regimen.id)
  const unavailable = ids.some((id) => regimenAvailability(catalog, id) === 'unavailable')
  const caution = phases.some(({ regimen }) => regimen.evidence?.verdict === 'caution')
  const notes = [
    ...new Set(
      phases.flatMap(({ link }) => (link.notes !== null ? [localize(link.notes, language)] : [])),
    ),
  ]
  return (
    <Stack gap={2} className={classes.regimen}>
      <Group gap={6} wrap="nowrap">
        <Text size="sm" fw={600}>
          {localize(course.title, language)}
        </Text>
        <Badge size="xs" variant="outline" color="gray" tt="none">
          {t('diseaseDetail.coursePhases', { count: phases.length })}
        </Badge>
        {unavailable && (
          <Badge size="xs" variant="light" color="red" tt="none">
            {t('availability.unavailable')}
          </Badge>
        )}
        {caution && (
          <Badge size="xs" variant="light" color="orange" tt="none">
            {t('trial.verdictBadge.caution')}
          </Badge>
        )}
      </Group>
      <Group gap={4}>
        {phases.map(({ regimen }) => (
          <Button
            key={regimen.id}
            size="compact-xs"
            variant="light"
            component={Link}
            to={`${routes.calculator}?regimen=${regimen.id}`}
            title={`${localize(regimen.name, language)} — ${t('diseaseDetail.calculate')}`}
          >
            {localize(regimen.course!.phase, language)}
          </Button>
        ))}
      </Group>
      <CautionBadges catalog={catalog} regimenId={ids} conditions={conditions} />
      <IrradiationMark catalog={catalog} regimenIds={ids} />
      <InfectionRiskMark catalog={catalog} regimenIds={ids} />
      {needsPremedication(catalog, ids) && (
        <Text size="xs" c="orange.8">
          {t('diseaseDetail.premedication')}
        </Text>
      )}
      {notes.map((note) => (
        <LinkNote key={note} text={note} />
      ))}
    </Stack>
  )
}

/** The stripe beside a line's heading: lines in the theme colour, trials and reading apart. */
const KIND_ACCENT: Partial<Record<TreatmentNode['kind'], string>> = {
  line: 'red',
  stage: 'red',
  trial: 'yellow',
  reference: 'cyan',
}

/**
 * A regimen with a purine analogue, alemtuzumab or ATG: the patient will need irradiated
 * blood components (BSH 2020), for life after a purine analogue.
 */
function IrradiationMark({
  catalog,
  regimenIds,
}: {
  catalog: CatalogIndex
  regimenIds: readonly string[]
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const reasons = [
    ...new Set(
      regimenIds
        .flatMap((id) => catalog.itemsByRegimen.get(id) ?? [])
        .filter((item) => item.role === 'main' && IRRADIATION_DRUGS[item.drug_id])
        .map((item) => item.drug_id),
    ),
  ]
  if (reasons.length === 0) return null
  const why = reasons
    .map((drugId) => {
      const drug = catalog.drugs.get(drugId)
      return `${drug ? localize(drug.name, language) : drugId}: ${IRRADIATION_DRUGS[drugId]![language]}`
    })
    .join('; ')
  return (
    <Text size="xs" c="grape.7" title={`BSH 2020 — ${why}`}>
      {t('irradiated.badge')} · {why}
    </Text>
  )
}

/** Does the regimen give a drug whose label asks for premedication? */
function needsPremedication(catalog: CatalogIndex, regimenIds: readonly string[]): boolean {
  return regimenIds.some((id) =>
    (catalog.itemsByRegimen.get(id) ?? []).some(
      (item) => item.role === 'main' && PREMEDICATION_ADVISED.has(item.drug_id),
    ),
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
