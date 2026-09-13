import { Anchor, Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'

import { routes } from '../../app/routes'

export function DiseaseDetailPage() {
  const { t } = useTranslation()
  const { slug = '' } = useParams()

  return (
    <Stack>
      <Anchor component={Link} to={routes.diseases} size="sm">
        ← {t('diseaseDetail.back')}
      </Anchor>
      <Title order={1}>{t('diseaseDetail.title')}</Title>
      <Text c="dimmed">{t('diseaseDetail.placeholder', { slug })}</Text>
    </Stack>
  )
}
