import { Button, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { isAuthConfigured, signOut, useSessionUser } from '../../lib/auth'

/** Shows the signed-in physician and lets them sign out; hidden when nobody is signed in. */
export function SessionBadge() {
  const { t } = useTranslation()
  const { user } = useSessionUser()

  if (!isAuthConfigured || user === null) return null

  return (
    <>
      <Text size="xs" c="dimmed" visibleFrom="sm">
        {user.email}
      </Text>
      <Button size="compact-xs" variant="subtle" onClick={() => void signOut()}>
        {t('auth.signOut')}
      </Button>
    </>
  )
}
