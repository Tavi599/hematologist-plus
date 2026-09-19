import { List, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { CalculationStep } from '../../domain'
import { formatNumber } from '../../lib/format'
import { currentLanguage, type DynamicTranslate } from '../../lib/i18n'
import { formatDynamicParams } from '../../lib/step-params'

const DECIMALS: Record<string, number> = {
  m2: 2,
  mg: 1,
  mcg: 1,
  iu: 0,
  miu: 2,
  ml: 1,
  mg_ml: 2,
  mcg_ml: 2,
  iu_ml: 1,
  miu_ml: 3,
  ml_h: 1,
  ml_min: 1,
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
            {t(`step.${step.key}`, formatDynamicParams(step.params, language, t))}
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
