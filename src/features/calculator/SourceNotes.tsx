import { Anchor, Group, List, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { Source } from '../../schemas/common'

/** Where the numbers of one course item come from: its dose, its drug and its dilution. */
export function SourceNotes({ sources }: { sources: Source[] }) {
  const { t } = useTranslation()
  const unique = sources.filter(
    (source, index) =>
      sources.findIndex(
        (other) => other.name === source.name && other.version === source.version,
      ) === index,
  )
  if (unique.length === 0) return null

  return (
    <>
      <Text size="sm" fw={500}>
        {t('sources.itemTitle')}
      </Text>
      <List size="sm" spacing={2}>
        {unique.map((source) => (
          <List.Item key={`${source.name}|${source.version ?? ''}`}>
            <Group gap={6} wrap="wrap">
              {source.url === undefined ? (
                <Text size="sm">{source.name}</Text>
              ) : (
                <Anchor size="sm" href={source.url} target="_blank" rel="noreferrer">
                  {source.name}
                </Anchor>
              )}
              <Text size="xs" c="dimmed">
                {source.version === undefined ? '' : `${source.version} · `}
                {t('sources.checkedOn')}: {source.checkedOn}
              </Text>
            </Group>
          </List.Item>
        ))}
      </List>
    </>
  )
}
