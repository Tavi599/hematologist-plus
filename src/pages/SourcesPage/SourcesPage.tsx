import { Alert, Anchor, Badge, Card, Group, Stack, Table, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { CatalogGate } from '../../features/catalog/CatalogGate'
import type { CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage } from '../../lib/i18n'
import { collectSources, type SourceEntry } from '../../lib/sources'

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
      <CatalogGate>{(catalog) => <SourceTable catalog={catalog} />}</CatalogGate>
    </Stack>
  )
}

function SourceTable({ catalog }: { catalog: CatalogIndex }) {
  const { t } = useTranslation()
  const entries = collectSources(catalog, currentLanguage())

  if (entries.length === 0) {
    return (
      <Card withBorder>
        <Text c="dimmed">{t('sources.empty')}</Text>
      </Card>
    )
  }

  return (
    <Card withBorder p={0}>
      <Table.ScrollContainer minWidth={640}>
        <Table verticalSpacing="sm" aria-label={t('sources.title')}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('sources.document')}</Table.Th>
              <Table.Th w={120}>{t('sources.version')}</Table.Th>
              <Table.Th w={120}>{t('sources.checkedOn')}</Table.Th>
              <Table.Th>{t('sources.usedFor')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {entries.map((entry) => (
              <SourceRow key={`${entry.source.name}|${entry.source.version ?? ''}`} entry={entry} />
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
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
