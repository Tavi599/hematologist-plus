import { Anchor, Card, Collapse, Stack, Text, Title, UnstyledButton } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CLASSES } from './classes'
import { findInteractions, type Interaction } from './interactions'

function Row({ row }: { row: Interaction }) {
  const { t } = useTranslation()
  const cls = row.classId === undefined ? undefined : CLASSES.find((c) => c.id === row.classId)
  return (
    <Card withBorder padding="sm" component="article">
      <Stack gap={4}>
        <Text size="sm" fw={700}>
          {row.antibacterial} ↔ {row.partner}
        </Text>
        <Text size="sm">
          <Text span size="sm" fw={600}>
            {t('antibacterials.interactions.effect')}:
          </Text>{' '}
          {row.effect}
        </Text>
        <Text size="sm">
          <Text span size="sm" fw={600}>
            {t('antibacterials.interactions.action')}:
          </Text>{' '}
          {row.action ?? (
            <Text span size="sm" c="dimmed">
              {t('antibacterials.interactions.noAction')}
            </Text>
          )}
        </Text>
        {cls && (
          <Text size="xs" c="dimmed">
            {t('antibacterials.interactions.seeClass')} «{cls.title}»
          </Text>
        )}
        {row.sources.map((source) => (
          <Text size="xs" c="dimmed" key={source.url}>
            <Anchor href={source.url} target="_blank" rel="noreferrer" size="xs">
              {source.name}
            </Anchor>
            {source.version ? `, ${source.version}` : ''}, {t('antibacterials.checkedOn')}{' '}
            {source.checkedOn}
          </Text>
        ))}
      </Stack>
    </Card>
  )
}

/**
 * Interactions that matter in haematology, folded; with a query it shows only the matching rows,
 * opened, and disappears when none matches.
 */
export function InteractionsBlock({ needle }: { needle: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rows = findInteractions(needle)
  if (rows.length === 0) return null
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
          {t('antibacterials.interactions.title')}
        </Title>
        <Text c="dimmed" aria-hidden>
          {shown ? '▴' : '▾'}
        </Text>
      </UnstyledButton>
      <Collapse expanded={shown}>
        <Stack gap="xs" pt={6}>
          <Text size="xs" c="dimmed">
            {t('antibacterials.interactions.hint')}
          </Text>
          {rows.map((row) => (
            <Row row={row} key={row.id} />
          ))}
        </Stack>
      </Collapse>
    </Card>
  )
}
