import { Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

export function CalculatorPage() {
  const { t } = useTranslation()

  return (
    <Stack>
      <Title order={1}>{t('calculator.title')}</Title>
      <Text c="dimmed">{t('calculator.placeholder')}</Text>
    </Stack>
  )
}
