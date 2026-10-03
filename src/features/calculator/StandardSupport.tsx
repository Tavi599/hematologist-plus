import { Card, Stack, Switch, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { CourseItem } from '../../lib/course-input'
import {
  categoryItemIds,
  SUPPORT_CATEGORIES,
  type SupportCategory,
} from '../../lib/standard-support'

/**
 * Four switches for the supportive care a course is surrounded by. The regimen's own rows of a
 * kind are enabled or disabled together; where the regimen writes none, the standard ones are
 * added while the switch is on.
 */
export function StandardSupport({
  items,
  value,
  onChange,
}: {
  items: CourseItem[]
  value: Record<SupportCategory, boolean>
  onChange: (category: SupportCategory, on: boolean) => void
}) {
  const { t } = useTranslation()

  return (
    <Card withBorder component="section">
      <Stack gap="xs">
        <Title order={2} size="h4">
          {t('calculator.standardSupport.title')}
        </Title>
        <Text size="sm" c="dimmed">
          {t('calculator.standardSupport.lead')}
        </Text>
        {SUPPORT_CATEGORIES.map((category) => {
          const own = categoryItemIds(items, category).length
          return (
            <Switch
              key={category}
              label={t(`calculator.standardSupport.${category}`)}
              description={
                own > 0
                  ? t('calculator.standardSupport.ownRows', { count: own })
                  : t(`calculator.standardSupport.standard.${category}`)
              }
              checked={value[category]}
              onChange={(event) => onChange(category, event.currentTarget.checked)}
            />
          )
        })}
      </Stack>
    </Card>
  )
}
