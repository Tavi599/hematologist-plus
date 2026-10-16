import {
  Accordion,
  Alert,
  Anchor,
  Badge,
  Card,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CatalogGate } from '../../features/catalog/CatalogGate'
import type { CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage } from '../../lib/i18n'
import {
  collectSources,
  filterSources,
  groupSources,
  indexSources,
  type SourceEntry,
  type SourceGroup,
} from '../../lib/sources'

/** Every official design and protocol the catalog rests on, and what each one is used for. */
export function SourcesPage() {
  const { t } = useTranslation()

  return (
    <Stack>
      <Title order={1}>{t('sources.title')}</Title>
      <Text c="dimmed">{t('sources.intro')}</Text>
      <Alert color="yellow" variant="light" title={t('sources.staleTitle')}>
        {t('sources.stale')}
      </Alert>
      <CatalogGate>{(catalog) => <SourceList catalog={catalog} />}</CatalogGate>
    </Stack>
  )
}

/**
 * Several hundred documents: too many for one table. They are searched by name, by version and by
 * the drug or regimen that rests on them, and read one kind at a time — every group is collapsed
 * until it is opened, and a search opens the groups that answer it.
 */
function SourceList({ catalog }: { catalog: CatalogIndex }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [query, setQuery] = useState('')
  const [opened, setOpened] = useState<string[]>([])

  const index = useMemo(() => indexSources(collectSources(catalog, language)), [catalog, language])
  const groups = useMemo(() => groupSources(filterSources(index, query)), [index, query])

  if (index.length === 0) {
    return (
      <Card withBorder>
        <Text c="dimmed">{t('sources.empty')}</Text>
      </Card>
    )
  }

  const searching = query.trim() !== ''
  const found = groups.reduce((count, group) => count + group.entries.length, 0)

  return (
    <Stack gap="sm">
      <TextInput
        label={t('sources.searchLabel')}
        placeholder={t('sources.searchPlaceholder')}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        aria-label={t('sources.searchLabel')}
      />
      <Text size="sm" c="dimmed">
        {searching ? t('sources.found', { value: found }) : t('sources.total', { value: found })}
      </Text>
      {groups.length === 0 ? (
        <Card withBorder>
          <Text c="dimmed">{t('sources.notFound')}</Text>
        </Card>
      ) : (
        <Accordion
          multiple
          variant="separated"
          chevronPosition="left"
          value={searching ? groups.map((group) => group.kind) : opened}
          onChange={setOpened}
        >
          {groups.map((group) => (
            <SourceGroupItem key={group.kind} group={group} />
          ))}
        </Accordion>
      )}
    </Stack>
  )
}

function SourceGroupItem({ group }: { group: SourceGroup }) {
  const { t } = useTranslation()

  return (
    <Accordion.Item value={group.kind}>
      <Accordion.Control>
        <Group gap="xs" wrap="wrap">
          <Text fw={600} size="sm">
            {t(`sources.group.${group.kind}`)}
          </Text>
          <Badge variant="light" color="gray">
            {group.entries.length}
          </Badge>
          <Text size="xs" c="dimmed">
            {t('sources.oldestCheckedOn', { date: group.oldestCheckedOn })}
          </Text>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <SourceTable group={group} />
      </Accordion.Panel>
    </Accordion.Item>
  )
}

function SourceTable({ group }: { group: SourceGroup }) {
  const { t } = useTranslation()

  return (
    <Table.ScrollContainer minWidth={640}>
      <Table verticalSpacing="sm" aria-label={t(`sources.group.${group.kind}`)}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('sources.document')}</Table.Th>
            <Table.Th w={120}>{t('sources.version')}</Table.Th>
            <Table.Th w={120}>{t('sources.checkedOn')}</Table.Th>
            <Table.Th>{t('sources.usedFor')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {group.entries.map((entry) => (
            <SourceRow key={`${entry.source.name}|${entry.source.version ?? ''}`} entry={entry} />
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}

function SourceRow({ entry }: { entry: SourceEntry }) {
  const { t } = useTranslation()
  const { source, uses } = entry
  const byKind = ['regimen', 'dose', 'drug', 'infusion'] as const

  return (
    <Table.Tr>
      <Table.Td>
        {source.url === undefined ? (
          <Text fw={500}>{source.name}</Text>
        ) : (
          <Anchor href={source.url} target="_blank" rel="noreferrer" fw={500}>
            {source.name}
          </Anchor>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {source.version ?? '—'}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {source.checkedOn}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap={6} wrap="wrap">
          {byKind.flatMap((kind) => {
            const labels = [...new Set(uses.filter((use) => use.kind === kind).map((u) => u.label))]
            if (labels.length === 0) return []
            return [
              <Badge key={kind} variant="light" color="gray" tt="none">
                {t(`sources.kind.${kind}`)}: {labels.join(', ')}
              </Badge>,
            ]
          })}
        </Group>
      </Table.Td>
    </Table.Tr>
  )
}
