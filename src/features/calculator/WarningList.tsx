import { Alert, List } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { DomainWarning } from '../../domain'
import { formatNumber } from '../../lib/format'
import { currentLanguage, type DynamicTranslate } from '../../lib/i18n'

/** Clinical notes and input checks. They never change a dose — the physician decides. */
export function WarningList({
  warnings,
  compact,
}: {
  warnings: DomainWarning[]
  compact?: boolean
}) {
  const t = useTranslation().t as unknown as DynamicTranslate
  const language = currentLanguage()
  if (warnings.length === 0) return null

  const texts = warnings.map((warning) => {
    const params: Record<string, string> = {}
    for (const [key, value] of Object.entries(warning.params)) {
      params[key] = typeof value === 'number' ? formatNumber(value, language, 2) : String(value)
    }
    return t(`warning.${warning.code}`, params)
  })

  return (
    <Alert
      color="yellow"
      title={compact ? undefined : t('warning.title')}
      p={compact ? 'xs' : undefined}
    >
      <List size="sm" spacing={2}>
        {texts.map((text) => (
          <List.Item key={text}>{text}</List.Item>
        ))}
      </List>
    </Alert>
  )
}
