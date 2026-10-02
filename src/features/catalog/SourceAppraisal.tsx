import { Anchor, Badge, Group, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { currentLanguage, type DynamicTranslate } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import type { Appraisal } from '../../schemas/common'

import { SourceNotes } from '../calculator/SourceNotes'

/**
 * How good the publication behind a regimen is, by published instruments only: the level of
 * evidence its design earns on the Oxford scale, NLM's own label for the article, and whether
 * NLM indexes the journal at all. Nothing here is our own grade of the medicine.
 */
export function SourceAppraisal({ appraisal }: { appraisal: Appraisal[] }) {
  // Levels and scales are keys built from the data, which the typed signature cannot check.
  const t = useTranslation().t as unknown as DynamicTranslate
  const language = currentLanguage()
  if (appraisal.length === 0) return null

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        {t('regimen.appraisalTitle')}
      </Text>
      {appraisal.map((entry) => (
        <Stack key={entry.publication} gap={4}>
          <Group gap={6} wrap="wrap">
            <Text size="sm">{entry.publication}</Text>
            {entry.pmid !== undefined && (
              <Anchor
                size="xs"
                href={`https://pubmed.ncbi.nlm.nih.gov/${entry.pmid}/`}
                target="_blank"
                rel="noreferrer"
              >
                {t('regimen.pmid')} {entry.pmid}
              </Anchor>
            )}
          </Group>
          {entry.level !== undefined && (
            <Stack gap={2}>
              <Text size="xs">
                {t('regimen.level')}: {t(`regimen.levelValue.${entry.level.value}`)}
              </Text>
              <Text size="xs" c="dimmed">
                {t(`regimen.levelScale.${entry.level.scale}`)}
                {entry.level.notes === undefined
                  ? ''
                  : `. ${localize(entry.level.notes, language)}`}
              </Text>
            </Stack>
          )}
          {entry.publication_types.length > 0 && (
            <Group gap={4} wrap="wrap">
              <Text size="xs" c="dimmed">
                {t('regimen.publicationTypes')}:
              </Text>
              {entry.publication_types.map((type) => (
                <Badge key={type} size="xs" variant="light" color="gray" tt="none">
                  {type}
                </Badge>
              ))}
            </Group>
          )}
          {entry.journal !== undefined && (
            <Group gap={6} wrap="wrap">
              <Text size="xs" c="dimmed">
                {t('regimen.journal')}: {entry.journal.name}
              </Text>
              {entry.journal.medline_indexed !== undefined && (
                <Badge
                  size="xs"
                  variant="light"
                  color={entry.journal.medline_indexed ? 'green' : 'gray'}
                  tt="none"
                >
                  {t(
                    entry.journal.medline_indexed
                      ? 'regimen.medlineIndexed'
                      : 'regimen.medlineNotIndexed',
                  )}
                </Badge>
              )}
              {entry.journal.sjr_quartile !== undefined && (
                <Badge size="xs" variant="light" color="blue" tt="none">
                  {t('regimen.quartile', {
                    quartile: entry.journal.sjr_quartile,
                    year: entry.journal.sjr_year ?? '',
                  })}
                </Badge>
              )}
            </Group>
          )}
          <SourceNotes sources={entry.sources} />
        </Stack>
      ))}
    </Stack>
  )
}
