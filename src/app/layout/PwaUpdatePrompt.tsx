import { Button, Group, Notification } from '@mantine/core'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * The service worker waits for the user's consent before updating,
 * so an in-progress calculation is never lost to an automatic reload.
 */
export function PwaUpdatePrompt() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  // "Offline ready" is informational only; hide it on its own.
  useEffect(() => {
    if (!offlineReady || needRefresh) return
    const timer = setTimeout(() => setOfflineReady(false), 5000)
    return () => clearTimeout(timer)
  }, [offlineReady, needRefresh, setOfflineReady])

  if (!needRefresh && !offlineReady) return null

  const close = () => {
    setNeedRefresh(false)
    setOfflineReady(false)
  }

  return (
    <Notification
      onClose={close}
      closeButtonProps={{ 'aria-label': t('pwa.close') }}
      style={{ position: 'fixed', right: 16, bottom: 56, zIndex: 1000, maxWidth: 360 }}
      withBorder
    >
      <Group justify="space-between" gap="sm">
        {needRefresh ? t('pwa.updateAvailable') : t('pwa.offlineReady')}
        {needRefresh && (
          <Button size="xs" onClick={() => void updateServiceWorker(true)}>
            {t('pwa.reload')}
          </Button>
        )}
      </Group>
    </Notification>
  )
}
