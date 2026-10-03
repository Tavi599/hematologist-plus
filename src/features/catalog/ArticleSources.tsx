import { Button, Group, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { formatDate } from '../../lib/format'
import { currentLanguage, type DynamicTranslate } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import { articleSources, type ArticleSourceChoice } from '../../lib/article-sources'
import type { Disease } from '../../schemas/catalog'
import type { ArticleSection } from '../../schemas/common'

/**
 * Buttons that switch the article between the sources it has been written from. Each opens what
 * the department wrote from that guideline, inside the app and behind the same sign-in as the
 * rest of the article — it never sends the reader out, and no guideline text is stored.
 *
 * Nothing is drawn while the department's own article is all there is, which is the usual case:
 * a row of buttons that all lead to the same text only takes up the screen.
 */

export function ArticleSources({
  disease,
  written,
  value,
  onChange,
}: {
  disease: Disease
  /** Sections that have text for this disease; a source without text gets no button. */
  written: ReadonlySet<ArticleSection>
  value: ArticleSection
  onChange: (section: ArticleSection) => void
}) {
  const { t } = useTranslation()
  const tu = t as unknown as DynamicTranslate
  const language = currentLanguage()
  const choices = articleSources(disease, written)
  const reference = choices.find((choice) => choice.section === value)?.reference

  if (choices.length <= 1) return null

  return (
    <Stack gap={6}>
      <Group gap="xs">
        {choices.map((choice) => (
          <Button
            key={choice.section}
            size="compact-xs"
            variant={choice.section === value ? 'filled' : 'default'}
            onClick={() => onChange(choice.section)}
          >
            {label(choice, language, tu)}
          </Button>
        ))}
      </Group>
      {reference !== undefined && (
        <Text size="xs" c="dimmed">
          {t('diseaseDetail.referencesWritten', { source: edition(reference, language, tu) })}
        </Text>
      )}
    </Stack>
  )
}

/** The guideline as the reader needs to see it cited: name, edition, and the day it was issued. */
function edition(
  reference: NonNullable<ArticleSourceChoice['reference']>,
  language: ReturnType<typeof currentLanguage>,
  tu: DynamicTranslate,
): string {
  const named = [tu(`referenceName.${reference.kind}`), reference.version].filter(Boolean).join(' ')
  return reference.updated === null
    ? named
    : `${named} — ${formatDate(reference.updated, language)}`
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
