import { Anchor, Badge, Button, Group, Spoiler, Stack, Text, Title } from '@mantine/core'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router'

import { routes } from '../../app/routes'
import { CatalogGate } from '../../features/catalog/CatalogGate'
import { courseTiles, type LinkedRegimen } from '../../features/catalog/treatment-filter'
import {
  pageOf,
  pathwayPages,
  rankedTreatment,
  rowAnchor,
  stepsIn,
  type PathwayPage as Page,
  type PathwayRow,
} from '../../features/pathways/pathway'
import { regimenAvailability } from '../../lib/availability'
import type { CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import type { Disease, TreatmentNode, TreatmentNodeRegimen } from '../../schemas/catalog'
import type { EvidenceCategory, PathwayStep, RecommendationPreference } from '../../schemas/common'
import classes from './PathwayPage.module.css'

const PAGE_HEADING = 'pathway-page'

const PREFERENCE_COLOR: Record<RecommendationPreference, string> = {
  preferred: 'green',
  other: 'blue',
  circumstances: 'gray',
}

/** A guideline algorithm on a page of its own: risk group → treatment → next, page by page. */
export function PathwayPage() {
  const { t } = useTranslation()
  const { slug = '' } = useParams()
  return (
    <Stack>
      <Anchor component={Link} to={routes.disease(slug)} size="sm">
        ← {t('pathway.back')}
      </Anchor>
      <CatalogGate>
        {(catalog) => {
          const disease = catalog.diseases.get(slug)
          if (!disease) return <Text c="dimmed">{t('diseaseDetail.placeholder', { slug })}</Text>
          return <PathwayView key={disease.id} catalog={catalog} disease={disease} />
        }}
      </CatalogGate>
    </Stack>
  )
}

function PathwayView({ catalog, disease }: { catalog: CatalogIndex; disease: Disease }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [params, setParams] = useSearchParams()
  const root = (catalog.pathwaysByDisease.get(disease.id) ?? [])[0]
  const pages = root ? pathwayPages(catalog, root) : []
  const page = pages.find((entry) => entry.node.id === params.get('page')) ?? pages[0]
  const focus = params.get('focus')
  const chosen = params.has('page')

  // An arrow lands on its row: scroll it into view once the page has rendered it.
  useEffect(() => {
    // A page chosen without a row to land on opens at its heading, not where the last one was left.
    if (focus === null) {
      if (chosen) document.getElementById(PAGE_HEADING)?.scrollIntoView?.({ block: 'start' })
      return
    }
    document.getElementById(rowAnchor(focus))?.scrollIntoView?.({ block: 'start' })
  }, [focus, chosen, page?.node.id])

  if (!root || !page) return <Text c="dimmed">{t('pathway.none')}</Text>

  const go = (targetId: string) => {
    const pageId = pageOf(catalog, root.id, targetId)
    if (pageId === null) return
    setParams(pageId === targetId ? { page: pageId } : { page: pageId, focus: targetId })
  }

  return (
    <Stack>
      <Title order={1}>
        {t('pathway.title')} — {localize(disease.name, language)}
      </Title>
      {root.description !== null && <Text size="sm">{localize(root.description, language)}</Text>}
      <Text size="xs" c="dimmed">
        {t('pathway.sourceNote')}
      </Text>

      <Group gap={6} component="nav" aria-label={t('pathway.pages')}>
        {pages.map((entry) => (
          <Button
            key={entry.node.id}
            size="compact-sm"
            // A long page title wraps on a phone instead of running off the screen.
            h="auto"
            py={4}
            styles={{ label: { whiteSpace: 'normal', textAlign: 'left' } }}
            variant={entry.node.id === page.node.id ? 'filled' : 'light'}
            onClick={() => setParams({ page: entry.node.id })}
            aria-current={entry.node.id === page.node.id ? 'page' : undefined}
          >
            {localize(entry.node.title, language)}
          </Button>
        ))}
      </Group>

      <PageView catalog={catalog} page={page} focus={focus} onGo={go} />
    </Stack>
  )
}

function PageView({
  catalog,
  page,
  focus,
  onGo,
}: {
  catalog: CatalogIndex
  page: Page
  focus: string | null
  onGo: (targetId: string) => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  return (
    <Stack gap="sm">
      <Title order={2} size="h3" id={PAGE_HEADING} style={{ scrollMarginTop: 108 }}>
        {localize(page.node.title, language)}
      </Title>
      {page.node.description !== null && (
        <Spoiler maxHeight={66} showLabel="▾" hideLabel="▴">
          <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }}>
            {localize(page.node.description, language)}
          </Text>
        </Spoiler>
      )}
      <div className={classes.head} aria-hidden>
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
          {t('pathway.columns.group')}
        </Text>
        <span />
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
          {t('pathway.columns.treatment')}
        </Text>
        <span />
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
          {t('pathway.columns.next')}
        </Text>
      </div>
      {page.rows.map((row) => (
        <RowView
          key={row.node.id}
          catalog={catalog}
          row={row}
          focused={focus === row.node.id}
          onGo={onGo}
        />
      ))}
    </Stack>
  )
}

function RowView({
  catalog,
  row,
  focused,
  onGo,
}: {
  catalog: CatalogIndex
  row: PathwayRow
  focused: boolean
  onGo: (targetId: string) => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const { node } = row
  const links = catalog.regimenLinksByNode.get(node.id) ?? []
  const next = stepsIn(node.steps, 'next')
  return (
    <section
      id={rowAnchor(node.id)}
      className={classes.row}
      data-focused={focused}
      aria-label={localize(node.title, language)}
    >
      <Stack gap={4} className={`${classes.group} ${row.isPage ? classes.groupPage : ''}`}>
        {row.trail.length > 0 && (
          <Text size="xs" c="dimmed">
            {row.trail.map((entry) => localize(entry.title, language)).join(' › ')}
          </Text>
        )}
        <Text fw={700} size="sm">
          {row.isPage ? t('pathway.wholePage') : localize(node.title, language)}
        </Text>
        {!row.isPage && node.description !== null && (
          <Text size="xs" c="dimmed">
            {localize(node.description, language)}
          </Text>
        )}
      </Stack>
      <Text className={classes.arrow} aria-hidden>
        →
      </Text>
      <Stack gap={6}>
        {rankedTreatment(links, node.steps).map((group) => (
          <Stack key={group.preference ?? 'unranked'} gap={2}>
            {group.preference !== null && (
              <Badge size="sm" variant="light" color={PREFERENCE_COLOR[group.preference]} tt="none">
                {t(`pathway.preference.${group.preference}`)}
              </Badge>
            )}
            {group.steps.map((step, index) => (
              <StepView key={`s${index}`} step={step} onGo={onGo} />
            ))}
            <RegimenList catalog={catalog} links={group.links} />
          </Stack>
        ))}
      </Stack>
      <Text className={classes.arrow} aria-hidden>
        {next.length > 0 ? '→' : ''}
      </Text>
      <Stack gap={4} className={next.length > 0 ? classes.next : undefined}>
        {next.map((step, index) => (
          <StepView key={index} step={step} onGo={onGo} />
        ))}
      </Stack>
    </section>
  )
}

function StepView({ step, onGo }: { step: PathwayStep; onGo: (targetId: string) => void }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const label = localize(step.label, language)
  const kindName = t(`pathway.step.${step.kind}`)
  // A heading over the step, in full: a squeezed badge before the text read as «пер…».
  // Left out where it would only repeat the text, and for a plain arrow or step.
  const showKind =
    step.kind !== 'page' &&
    step.kind !== 'other' &&
    !label.toLocaleLowerCase(language).includes(kindName.toLocaleLowerCase(language))
  const category = step.category !== null && <CategoryBadge category={step.category} />
  const target = step.target_id
  return (
    <Stack gap={0}>
      {showKind && (
        <Text size="xs" c="dimmed" fw={600}>
          {kindName}
        </Text>
      )}
      <Group gap={4} wrap="wrap" align="flex-start">
        {target !== null ? (
          <Anchor
            component="button"
            type="button"
            size="sm"
            ta="left"
            onClick={() => onGo(target)}
            title={t('pathway.go', { title: label })}
          >
            {label} →
          </Anchor>
        ) : (
          <Text size="sm">{label}</Text>
        )}
        {category}
      </Group>
    </Stack>
  )
}

function CategoryBadge({ category }: { category: EvidenceCategory }) {
  const { t } = useTranslation()
  return (
    <Badge
      size="xs"
      variant={category === '1' ? 'filled' : 'light'}
      color={category === '1' ? 'teal' : category === '3' ? 'red' : 'gray'}
      tt="none"
    >
      {t(`pathway.category.${category}`)}
    </Badge>
  )
}

/** The regimens of one rank: courses in several phases as one tile, as in the tree. */
function RegimenList({
  catalog,
  links,
}: {
  catalog: CatalogIndex
  links: readonly TreatmentNodeRegimen[]
}) {
  const entries = links.flatMap((link) => {
    const regimen = catalog.regimens.get(link.regimen_id)
    return regimen ? [{ link, regimen } as LinkedRegimen] : []
  })
  return (
    <>
      {courseTiles(entries).map((tile) =>
        tile.kind === 'single' ? (
          <RegimenTile key={tile.entry.link.id} catalog={catalog} entries={[tile.entry]} />
        ) : (
          <RegimenTile
            key={tile.phases[0]!.link.id}
            catalog={catalog}
            entries={tile.phases}
            courseTitle={tile.course.title}
          />
        ),
      )}
    </>
  )
}

function RegimenTile({
  catalog,
  entries,
  courseTitle,
}: {
  catalog: CatalogIndex
  entries: readonly LinkedRegimen[]
  courseTitle?: TreatmentNode['title']
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const first = entries[0]!
  const unavailable = entries.some(
    ({ regimen }) => regimenAvailability(catalog, regimen.id) === 'unavailable',
  )
  const category = entries.find(({ link }) => link.category !== null)?.link.category ?? null
  const notes = [
    ...new Set(
      entries.flatMap(({ link }) => (link.notes !== null ? [localize(link.notes, language)] : [])),
    ),
  ]
  const described = first.regimen.reference !== null
  const name = courseTitle
    ? localize(courseTitle, language)
    : localize(first.regimen.name, language)
  return (
    <Stack gap={0} className={classes.regimen}>
      <Group gap={6} wrap="wrap">
        {courseTitle || described ? (
          <Text size="sm" fw={600}>
            {courseTitle ? name : first.regimen.short_name}
          </Text>
        ) : (
          <Anchor
            component={Link}
            to={`${routes.calculator}?regimen=${first.regimen.id}`}
            size="sm"
            fw={600}
            title={t('diseaseDetail.calculate')}
          >
            {first.regimen.short_name} →
          </Anchor>
        )}
        {category !== null && <CategoryBadge category={category} />}
        {described && (
          <Badge size="xs" variant="light" color="cyan" tt="none">
            {t('treatmentKind.reference')}
          </Badge>
        )}
        {unavailable && (
          <Badge size="xs" variant="light" color="red" tt="none">
            {t('availability.unavailable')}
          </Badge>
        )}
      </Group>
      {courseTitle ? (
        <Group gap={4} mt={2}>
          {entries.map(({ regimen }) => (
            <Button
              key={regimen.id}
              size="compact-xs"
              variant="light"
              component={Link}
              to={`${routes.calculator}?regimen=${regimen.id}`}
              title={`${localize(regimen.name, language)} — ${t('diseaseDetail.calculate')}`}
            >
              {regimen.course ? localize(regimen.course.phase, language) : regimen.short_name}
            </Button>
          ))}
        </Group>
      ) : (
        name !== first.regimen.short_name && (
          <Text size="xs" c="dimmed">
            {name}
          </Text>
        )
      )}
      {notes.map((note) => (
        <Text key={note} size="xs" c="dimmed">
          {note}
        </Text>
      ))}
    </Stack>
  )
}
