import { Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { SaveOutcome } from '../../lib/save-folder'
import { useSaveFolder } from '../../lib/use-save-folder'

/**
 * Where this device saves courses: the folder the physician chose once («Схеми»), and whether
 * the browser still lets the app write there. A setting of the device, kept in its IndexedDB.
 */
export function SaveFolderCard() {
  const { t } = useTranslation()
  const { status, folderName, choose, allow, forget } = useSaveFolder()
  const name = folderName ?? ''

  return (
    <Card withBorder component="section">
      <Stack gap="xs">
        <Title order={2} size="h4">
          {t('calculator.saveFolder.title')}
        </Title>
        <Text size="xs" c="dimmed">
          {t('calculator.saveFolder.hint')}
        </Text>
        <Text size="sm" c={status === 'prompt' ? 'orange.8' : undefined}>
          {t(`calculator.saveFolder.${status}`, { name })}
        </Text>
        {status !== 'unsupported' && status !== 'loading' && (
          <Group gap="xs" wrap="wrap">
            {status === 'prompt' && (
              <Button size="xs" onClick={() => void allow()}>
                {t('calculator.saveFolder.allow')}
              </Button>
            )}
            <Button size="xs" variant="default" onClick={() => void choose()}>
              {t(
                status === 'none' ? 'calculator.saveFolder.choose' : 'calculator.saveFolder.change',
              )}
            </Button>
            {status !== 'none' && (
              <Button size="xs" variant="subtle" color="gray" onClick={() => void forget()}>
                {t('calculator.saveFolder.forget')}
              </Button>
            )}
          </Group>
        )}
      </Stack>
    </Card>
  )
}

/** What became of the last file saved: where it lies, or that it was downloaded and why. */
export function SaveOutcomeNote({ outcome }: { outcome: SaveOutcome | null }) {
  const { t } = useTranslation()
  if (outcome === null) return null
  if (outcome.kind === 'folder') {
    return (
      <Text size="xs" c="green.8">
        {t('calculator.saveFolder.savedFolder', { path: outcome.path.join(' / ') })}
      </Text>
    )
  }
  const key = (
    {
      'no-folder': 'calculator.saveFolder.savedDownload',
      denied: 'calculator.saveFolder.denied',
      failed: 'calculator.saveFolder.failed',
    } as const
  )[outcome.reason]
  return (
    <Text size="xs" c={outcome.reason === 'no-folder' ? 'dimmed' : 'orange.8'}>
      {t(key, { name: outcome.name })}
    </Text>
  )
}
