import { Alert, Badge, Group, List, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { CourseInteraction } from '../../lib/course-interactions'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'

const COLOR = {
  contraindicated: 'red',
  avoid: 'red',
  dose_adjust: 'orange',
  caution: 'yellow',
} as const

/**
 * What the labels say of the drugs of this course given together. A reminder: no dose is
 * changed by it — the physician decides, and the source is named on every line.
 */
export function InteractionList({ interactions }: { interactions: CourseInteraction[] }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  if (interactions.length === 0) return null
  const worst = interactions[0]!.interaction.level

  return (
    <Alert color={COLOR[worst]} title={t('calculator.interactions.title')}>
      <List size="sm" spacing={6}>
        {interactions.map(({ drug, others, interaction }, index) => (
          <List.Item key={`${drug.id}-${index}`}>
            <Group gap={6} wrap="wrap">
              <Badge size="xs" color={COLOR[interaction.level]} variant="light">
                {t(`calculator.interactions.level.${interaction.level}`)}
              </Badge>
              <Text size="sm" fw={500}>
                {localize(drug.name, language)} +{' '}
                {others.map((other) => localize(other.name, language)).join(', ')}
              </Text>
            </Group>
            <Text size="sm">{localize(interaction.notes, language)}</Text>
            <Text size="xs" c="dimmed">
              {interaction.source.name}
            </Text>
          </List.Item>
        ))}
      </List>
    </Alert>
  )
}
