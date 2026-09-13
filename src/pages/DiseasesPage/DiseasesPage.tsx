import { Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

export function DiseasesPage() {
  const { t } = useTranslation()

  return (
    <Stack>
      <Title order={1}>{t('diseases.title')}</Title>
      <Text c="dimmed">{t('diseases.placeholder')}</Text>
    </Stack>
  )
}
