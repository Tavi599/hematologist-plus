import {
  Badge,
  Card,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { CourseItem } from '../../lib/course-input'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import {
  categoryItemIds,
  indicatedSupport,
  SUPPORT_CATEGORIES,
  THROMBO_AGENTS,
  type SupportCategory,
  type ThromboAgent,
} from '../../lib/standard-support'

/**
 * Switches for the supportive care a course is surrounded by. The regimen's own rows of a kind are
 * enabled or disabled together; where the regimen writes none, the standard ones are added while
 * the switch is on. A kind the regimen's drugs call for is marked with those drugs.
 */
export function StandardSupport({
  items,
  value,
  onChange,
  thromboAgent,
  onThromboAgent,
}: {
  items: CourseItem[]
  value: Record<SupportCategory, boolean>
  onChange: (category: SupportCategory, on: boolean) => void
  thromboAgent: ThromboAgent
  onThromboAgent: (agent: ThromboAgent) => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const indicated = indicatedSupport(items)
  const drugName = (drugId: string) => {
    const found = items.find((entry) => entry.item.drug_id === drugId)
    return found ? localize(found.drug.name, language) : drugId
  }

  return (
    <Card withBorder component="section">
      <Stack gap="xs">
        <Title order={2} size="h4">
          {t('calculator.standardSupport.title')}
        </Title>
        <Text size="xs" c="dimmed">
          {t('calculator.standardSupport.lead')}
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 1 }} spacing="xs" verticalSpacing={8}>
          {SUPPORT_CATEGORIES.map((category) => {
            const own = categoryItemIds(items, category).length
            const because = indicated[category]
            const choosesAgent = category === 'thrombosis' && own === 0 && value[category]
            return (
              <Stack key={category} gap={4}>
                <Switch
                  label={t(`calculator.standardSupport.${category}`)}
                  description={
                    own > 0
                      ? t('calculator.standardSupport.ownRows', { count: own })
                      : category === 'thrombosis'
                        ? t(`calculator.standardSupport.thromboAgent.${thromboAgent}`)
                        : t(`calculator.standardSupport.standard.${category}`)
                  }
                  checked={value[category]}
                  onChange={(event) => onChange(category, event.currentTarget.checked)}
                />
                {because && (
                  <Badge
                    size="sm"
                    variant="light"
                    color={value[category] ? 'teal' : 'orange'}
                    tt="none"
                    style={{ alignSelf: 'flex-start', height: 'auto', whiteSpace: 'normal' }}
                  >
                    {t('calculator.standardSupport.indicated', {
                      drugs: because.map(drugName).join(', '),
                    })}
                  </Badge>
                )}
                {choosesAgent && (
                  <SegmentedControl
                    size="xs"
                    fullWidth
                    value={thromboAgent}
                    onChange={(next) => onThromboAgent(next as ThromboAgent)}
                    data={THROMBO_AGENTS.map((agent) => ({
                      value: agent,
                      label: t(`calculator.standardSupport.thromboAgentName.${agent}`),
                    }))}
                  />
                )}
              </Stack>
            )
          })}
        </SimpleGrid>
      </Stack>
    </Card>
  )
}
