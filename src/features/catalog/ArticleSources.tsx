import { Button, Group, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { formatDate } from '../../lib/format'
import { currentLanguage, type DynamicTranslate } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import { articleSources, type ArticleSourceChoice } from '../../lib/article-sources'
import type { Disease } from '../../schemas/catalog'
import type { ArticleSection } from '../../schemas/common'

/**
 * Buttons that switch the article between the sources it is written from. Each opens what the
 * department wrote from that guideline, inside the app and behind the same sign-in as the rest
 * of the article — it never sends the reader out, and no guideline text is stored.
 */

export function ArticleSources({
  disease,
  value,
  onChange,
}: {
  disease: Disease
  value: ArticleSection
  onChange: (section: ArticleSection) => void
}) {
  const { t } = useTranslation()
  const tu = t as unknown as DynamicTranslate
  const language = currentLanguage()
  const choices = articleSources(disease)
  const selected = choices.find((choice) => choice.section === value)
  const reference = selected?.reference

  if (choices.length <= 1) return null

  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>
        {t('diseaseDetail.references')}
      </Text>
      <Group gap="xs">
        {choices.map((choice) => (
          <Button
            key={choice.section}
            size="xs"
            variant={choice.section === value ? 'filled' : 'default'}
            onClick={() => onChange(choice.section)}
          >
            {label(choice, language, tu)}
          </Button>
        ))}
      </Group>
      {reference?.updated != null && (
        <Text size="xs" c="dimmed">
          {t('diseaseDetail.referencesUpdated', {
            list:
              [tu(`referenceName.${reference.kind}`), reference.version].filter(Boolean).join(' ') +
              ` — ${formatDate(reference.updated, language)}`,
          })}
        </Text>
      )}
      <Text size="xs" c="dimmed">
        {t('diseaseDetail.referencesNote')}
      </Text>
    </Stack>
  )
}

function label(
  choice: ArticleSourceChoice,
  language: ReturnType<typeof currentLanguage>,
  tu: DynamicTranslate,
): string {
  if (choice.reference === undefined) return tu('diseaseDetail.sourceOwn')
  const name = choice.reference.label
    ? localize(choice.reference.label, language)
    : tu(`reference.${choice.reference.kind}`)
  return [name, choice.reference.version].filter(Boolean).join(' · ')
}
