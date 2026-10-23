import { ActionIcon, Menu, Modal, Tooltip } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SignInPanel } from '../../features/auth/SignInPanel'
import { isAuthConfigured, signOut, useSessionUser } from '../../lib/auth'

function UserIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}

/**
 * Sign-in from any page: signed out, the button opens the sign-in form; signed in, it shows whose
 * session it is and lets them sign out. Hidden where sign-in cannot work.
 */
export function SessionBadge() {
  const { t } = useTranslation()
  const { user, loading } = useSessionUser()
  const [opened, setOpened] = useState(false)

  if (!isAuthConfigured || loading) return null

  if (user === null) {
    return (
      <>
        <Tooltip label={t('auth.signIn')}>
          <ActionIcon
            variant="default"
            size="md"
            aria-label={t('auth.signIn')}
            onClick={() => setOpened(true)}
          >
            <UserIcon />
          </ActionIcon>
        </Tooltip>
        <Modal opened={opened} onClose={() => setOpened(false)} title={t('auth.title')} size="md">
          <SignInPanel bare />
        </Modal>
      </>
    )
  }

  const label = t('auth.signedInAs', { email: user.email })
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Tooltip label={label}>
          <ActionIcon variant="light" size="md" aria-label={label}>
            <UserIcon />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{label}</Menu.Label>
        <Menu.Item onClick={() => void signOut()}>{t('auth.signOut')}</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
