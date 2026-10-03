import { Badge, Card, Group, List, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import type { Regimen } from '../../schemas/catalog'
import { SourceNotes } from '../calculator/SourceNotes'

/**
 * A course that is described and not calculated: its drugs, the short facts that matter and what
 * the sources leave out. It stands in the treatment tree where a calculated regimen would have a
 * link into the calculator, and says at a glance that there is none to offer.
 */
export function RegimenReference({ regimen }: { regimen: Regimen }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const reference = regimen.reference
  if (reference === null || reference === undefined) return null
  const keyInfo = reference.key_info ?? []

  return (
    <Card withBorder padding="sm" ml="md">
      <Stack gap={6}>
        <Group gap="xs" wrap="wrap">
          <Text fw={500}>{regimen.short_name}</Text>
          <Badge size="xs" variant="light" color="gray" tt="none">
            {t('describedCourse.noCalculation')}
          </Badge>
          {reference.availability === 'unavailable' && (
            <Badge size="xs" variant="light" color="red" tt="none">
              {t('describedCourse.unavailable')}
            </Badge>
          )}
          {reference.availability === 'registered' && (
            <Badge size="xs" variant="light" color="green" tt="none">
              {t('describedCourse.registered')}
            </Badge>
          )}
        </Group>
        <Text size="sm" fw={500}>
          {localize(regimen.name, language)}
        </Text>
        <Text size="sm">{localize(reference.summary, language)}</Text>
        <Text size="sm">
          <Text span fw={500}>
            {t('describedCourse.drugs')}:{' '}
          </Text>
          {reference.drugs.map((drug) => localize(drug.name, language)).join(', ')}
        </Text>
        {keyInfo.length > 0 && (
          <Stack gap={2}>
            <Text size="sm" fw={500}>
              {t('describedCourse.keyInfo')}
            </Text>
            <List size="sm" spacing={2}>
              {keyInfo.map((line, index) => (
                <List.Item key={index}>{localize(line, language)}</List.Item>
              ))}
            </List>
          </Stack>
        )}
        {reference.gap !== undefined && (
          <Text size="sm" c="dimmed">
            <Text span fw={500}>
              {t('describedCourse.gap')}:{' '}
            </Text>
            {localize(reference.gap, language)}
          </Text>
        )}
        <SourceNotes sources={regimen.sources} />
      </Stack>
    </Card>
  )
}
