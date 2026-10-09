import { Alert, Badge, Group, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { DynamicTranslate } from '../../lib/i18n'
import type { Evidence } from '../../schemas/common'

/**
 * What a physician filters a study on before reading it: whether it was randomised and met its
 * goal, whom it enrolled, and — above everything — whether it refuted the combination. The
 * verdict comes first, because a regimen to avoid must not be read as one more option.
 */
export function TrialFacts({ evidence }: { evidence: Evidence }) {
  const { t } = useTranslation()
  const tu = t as unknown as DynamicTranslate
  const trial = evidence.trial
  const settings = evidence.settings ?? []
  const verdict = evidence.verdict ?? 'option'

  const facts: string[] = []
  if (trial) {
    if (trial.acronym) facts.push(trial.acronym)
    facts.push(t('trial.phase', { phase: trial.phase }))
    facts.push(trial.randomized ? t('trial.randomized') : t('trial.singleArm'))
    if (trial.n !== undefined) facts.push(t('trial.patients', { count: trial.n }))
    if (trial.comparator) facts.push(t('trial.comparator', { comparator: trial.comparator }))
    if (trial.primary_met === true) facts.push(t('trial.primaryMet'))
    if (trial.primary_met === false) facts.push(t('trial.primaryNotMet'))
  }

  if (verdict === 'option' && facts.length === 0 && settings.length === 0) return null

  return (
    <Stack gap={6}>
      {verdict !== 'option' && (
        <Alert color={verdict === 'avoid' ? 'red' : 'orange'} variant="light" p="xs">
          <Text size="sm">{tu(`trial.verdict.${verdict}`)}</Text>
        </Alert>
      )}
      {facts.length > 0 && <Text size="sm">{facts.join(' · ')}</Text>}
      {settings.length > 0 && (
        <Group gap={4} wrap="wrap">
          {settings.map((setting) => (
            <Badge key={setting} size="xs" variant="light" color="gray" tt="none">
              {tu(`trial.setting.${setting}`)}
            </Badge>
          ))}
        </Group>
      )}
    </Stack>
  )
}
