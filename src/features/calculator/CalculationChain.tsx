import { List, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { CalculationStep } from '../../domain'
import { formatNumber } from '../../lib/format'
import { currentLanguage, type DynamicTranslate } from '../../lib/i18n'

const DECIMALS: Record<string, number> = {
  m2: 2,
  mg: 1,
  ml: 1,
  mg_ml: 2,
  ml_h: 1,
  ml_min: 1,
}

/** Rounds every interpolated number so the chain reads like a worked example. */
function formatParams(
  params: CalculationStep['params'],
  language: ReturnType<typeof currentLanguage>,
) {
  const formatted: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(params ?? {})) {
    formatted[key] = typeof value === 'number' ? formatNumber(value, language, 2) : value
  }
  return formatted
}

/** The calculation chain shown next to every dose: BSA → dose → cap → reduction → rounding. */
export function CalculationChain({ steps }: { steps: CalculationStep[] }) {
  const t = useTranslation().t as unknown as DynamicTranslate
  const language = currentLanguage()

  return (
    <List size="sm" spacing={4}>
      {steps.map((step, index) => (
        <List.Item key={`${step.key}-${index}`}>
          <Text component="span" size="sm">
            {t(`step.${step.key}`, formatParams(step.params, language))}
            {' = '}
          </Text>
          <Text component="span" size="sm" fw={600}>
            {formatNumber(step.value, language, DECIMALS[step.unit] ?? 2)} {t(`units.${step.unit}`)}
          </Text>
        </List.Item>
      ))}
    </List>
  )
}
