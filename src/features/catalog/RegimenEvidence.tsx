import { Alert, Card, Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import type { Regimen } from '../../schemas/catalog'
import { EVIDENCE_FIELDS } from '../../schemas/common'

import { SourceNotes } from '../calculator/SourceNotes'

/**
 * What the chosen regimen is and where it comes from. A regimen taken from a published study
 * says so before it says anything else: the dose table alone cannot distinguish a trial from a
 * protocol, and the difference decides whether the course may be given at all.
 */
export function RegimenEvidence({ regimen }: { regimen: Regimen }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const evidence = regimen.evidence
  const fields = EVIDENCE_FIELDS.filter((field) => evidence?.[field] !== undefined)
  /* A catalog cached offline before the column existed has no key at all, and a regimen from a
     protocol must never be labelled a trial because of that. So: anything nullish is not one. */
  const isTrial = evidence !== null && evidence !== undefined
  if (
    regimen.description === null &&
    fields.length === 0 &&
    regimen.sources.length === 0 &&
    !isTrial
  ) {
    return null
  }

  return (
    <Card withBorder>
      <Stack gap="xs">
        <Title order={4}>
          {isTrial ? t('regimen.trialTitle') : t('regimen.title')}: {regimen.short_name}
        </Title>
        {isTrial && (
          <Alert color="yellow" variant="light">
            {t('regimen.trialNote')}
          </Alert>
        )}
        {regimen.description !== null && (
          <Text size="sm">{localize(regimen.description, language)}</Text>
        )}
        {fields.map((field) => (
          <Stack key={field} gap={2}>
            <Text size="sm" fw={500}>
              {t(`regimen.${field}`)}
            </Text>
            <Text size="sm">{localize(evidence?.[field], language)}</Text>
          </Stack>
        ))}
        <SourceNotes sources={regimen.sources} />
      </Stack>
    </Card>
  )
}
