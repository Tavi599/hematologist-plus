import { Anchor, Stack, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { routes } from '../../app/routes'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <Stack>
      <Title order={1}>{t('notFound.title')}</Title>
      <Anchor component={Link} to={routes.calculator}>
        {t('notFound.home')}
      </Anchor>
    </Stack>
  )
}
