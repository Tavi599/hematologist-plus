import {
  Anchor,
  Badge,
  Card,
  Collapse,
  Group,
  List,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import { CLASSES, DISCREPANCIES } from './classes'
import {
  findResistance,
  RESISTANCE_TOPICS,
  type ResistanceSection,
  type ResistanceSource,
} from './resistance'

/** Every source of a section once, in the order the points first name them. */
function sectionSources(section: ResistanceSection): ResistanceSource[] {
  const seen = new Map<string, ResistanceSource>()
  for (const point of section.points) {
    for (const source of point.sources) if (!seen.has(source.url)) seen.set(source.url, source)
  }
  return [...seen.values()]
}

function Section({ section, catalog }: { section: ResistanceSection; catalog: CatalogIndex }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const classes = CLASSES.filter((c) => section.classIds.includes(c.id))
  const related = DISCREPANCIES.filter((item) => section.discrepancyIds?.includes(item.id))
  const drugs = section.drugIds.flatMap((id) => {
    const row = catalog.drugs.get(id)
    return row ? [{ id, name: localize(row.name, language) }] : []
  })
  const registered = section.notInCatalog.filter((item) => item.status === 'registered')
  const unregistered = section.notInCatalog.filter((item) => item.status === 'unregistered')
  return (
    <Card withBorder padding="sm" component="article">
      <Stack gap={6}>
        <Text size="sm" fw={700}>
          {section.title}
        </Text>
        {drugs.length > 0 && (
          <Group gap={4}>
            <Text size="xs" c="dimmed">
              {t('antibacterials.resistance.inCatalog')}:
            </Text>
            {drugs.map((drug) => (
              <Badge key={drug.id} size="xs" variant="light" tt="none">
                {drug.name}
              </Badge>
            ))}
          </Group>
        )}
        {registered.length > 0 && (
          <Text size="xs" c="dimmed">
            {t('antibacterials.resistance.registeredNotInCatalog')}:{' '}
            {registered.map((item) => `${item.name} (${item.registration})`).join(', ')}
          </Text>
        )}
        {unregistered.length > 0 && (
          <Text size="xs" c="orange">
            {t('antibacterials.resistance.unregistered')}:{' '}
            {unregistered.map((item) => item.name).join(', ')}
          </Text>
        )}
        {RESISTANCE_TOPICS.map((topic) => {
          const own = section.points.filter((point) => point.topic === topic)
          if (own.length === 0) return null
          return (
            <Stack gap={2} key={topic}>
              <Text
                size="xs"
                fw={700}
                c={topic === 'discrepancy' || topic === 'avoid' ? 'orange' : 'dimmed'}
                tt="uppercase"
              >
                {t(`antibacterials.resistance.topic.${topic}`)}
              </Text>
              <List size="sm" spacing={2}>
                {own.map((point) => (
                  <List.Item key={point.text}>
                    {point.text}{' '}
                    <Text span size="xs" c="dimmed">
                      ({point.sources.map((source) => source.short).join('; ')})
                    </Text>
                  </List.Item>
                ))}
              </List>
            </Stack>
          )
        })}
        {related.length > 0 && (
          <Text size="xs" c="dimmed">
            {t('antibacterials.tdm.seeDiscrepancies')}{' '}
            {related.map((item) => `«${item.topic}»`).join(', ')}
          </Text>
        )}
        {classes.length > 0 && (
          <Text size="xs" c="dimmed">
            {t('antibacterials.interactions.seeClass')}{' '}
            {classes.map((cls) => `«${cls.title}»`).join(', ')}
          </Text>
        )}
        <Stack gap={0}>
          {sectionSources(section).map((source) => (
            <Text size="xs" c="dimmed" key={source.url}>
              {source.short}:{' '}
              <Anchor href={source.url} target="_blank" rel="noreferrer" size="xs">
                {source.name}
              </Anchor>
              {source.version ? `, ${source.version}` : ''}, {t('antibacterials.checkedOn')}{' '}
              {source.checkedOn}
            </Text>
          ))}
        </Stack>
      </Stack>
    </Card>
  )
}

/**
 * Targeted therapy by resistance type, folded; with a query it shows only the matching points,
 * opened, and disappears when none matches.
 */
export function ResistanceBlock({ needle, catalog }: { needle: string; catalog: CatalogIndex }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const sections = findResistance(needle)
  if (sections.length === 0) return null
  const shown = open || needle !== ''
  return (
    <Card withBorder component="section">
      <UnstyledButton
        onClick={() => setOpen((value) => !value)}
        aria-expanded={shown}
        w="100%"
        style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}
      >
        <Title order={3} size="h4">
          {t('antibacterials.resistance.title')}
        </Title>
        <Text c="dimmed" aria-hidden>
          {shown ? '▴' : '▾'}
        </Text>
      </UnstyledButton>
      <Collapse expanded={shown}>
        <Stack gap="xs" pt={6}>
          <Text size="xs" c="dimmed">
            {t('antibacterials.resistance.hint')}
          </Text>
          {sections.map((section) => (
            <Section section={section} catalog={catalog} key={section.id} />
          ))}
        </Stack>
      </Collapse>
    </Card>
  )
}
