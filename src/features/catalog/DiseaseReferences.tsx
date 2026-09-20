import { Button, Group, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { formatDate } from '../../lib/format'
import { currentLanguage, type DynamicTranslate } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import type { Disease } from '../../schemas/catalog'

/**
 * Buttons to the guidelines a physician reads next. The app links out and never carries their
 * text: NCCN, UpToDate and eviQ are copyrighted, and two of them need the reader's own account.
 */
export function DiseaseReferences({ disease }: { disease: Disease }) {
  const { t } = useTranslation()
  const tu = t as unknown as DynamicTranslate
  const language = currentLanguage()
  const references = disease.references_json

  if (references.length === 0) return null
  // A guideline is only worth reading against a known edition: say which one and when it came out.
  const dated = references.filter((reference) => reference.updated !== null)

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {t('diseaseDetail.references')}
      </Text>
      <Group gap="xs">
        {references.map((reference) => (
          <Button
            key={reference.url}
            component="a"
            href={reference.url}
            target="_blank"
            rel="noreferrer noopener"
            size="xs"
            variant="default"
          >
            {[
              reference.label
                ? localize(reference.label, language)
                : tu(`reference.${reference.kind}`),
              reference.version,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Button>
        ))}
      </Group>
      {dated.length > 0 && (
        <Text size="xs" c="dimmed">
          {t('diseaseDetail.referencesUpdated', {
            list: dated
              .map(
                (reference) =>
                  `${tu(`reference.${reference.kind}`)} ${reference.version ?? ''} — ${formatDate(reference.updated!, language)}`,
              )
              .join('; '),
          })}
        </Text>
      )}
      <Text size="xs" c="dimmed">
        {t('diseaseDetail.referencesNote')}
      </Text>
    </Stack>
  )
}
