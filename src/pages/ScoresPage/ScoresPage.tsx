import { Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { ReferenceScores } from '../../features/reference-list/ReferenceLists'
import { scoreById } from '../../features/scores/areas'

/**
 * Formulas and scores a haematologist reaches for beside the dose calculator: the everyday
 * formulas first, then risk and prognostic scores grouped by the disease each was built on. A
 * link from a disease page (`?score=…`) opens its score straight away.
 */
export function ScoresPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const linked = searchParams.get('score')

  return (
    <Stack gap="sm">
      <Title order={1}>{t('scores.title')}</Title>
      <Text size="sm" c="dimmed">
        {t('scores.lead')}
      </Text>
      <ReferenceScores linked={linked && scoreById(linked) ? linked : undefined} />
    </Stack>
  )
}
