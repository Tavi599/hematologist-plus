import { Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { showFolder, type SaveOutcome } from '../../lib/save-folder'
import { useSaveFolder } from '../../lib/use-save-folder'

/**
 * Where this device saves courses: the folder the physician chose once («Схеми»), and whether
 * the browser still lets the app write there. A setting of the device, kept in its IndexedDB.
 */
export function SaveFolderCard() {
  const { t } = useTranslation()
  const { status, pickFailed, folderName, choose, allow, forget, open } = useSaveFolder()
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
        {pickFailed && (
          <Text size="xs" c="red.8">
            {t('calculator.saveFolder.pickFailed')}
          </Text>
        )}
        {/* While the device's folder is still being read, choosing one is offered all the same:
            a browser whose storage never answers must not leave the physician without a folder. */}
        {status !== 'unsupported' && (
          <Group gap="xs" wrap="wrap">
            {status === 'prompt' && (
              <Button size="xs" onClick={() => void allow()}>
                {t('calculator.saveFolder.allow')}
              </Button>
            )}
            {status !== 'none' && status !== 'loading' && (
              <Button size="xs" variant="light" onClick={() => void open()}>
                {t('calculator.saveFolder.open')}
              </Button>
            )}
            <Button size="xs" variant="default" onClick={() => void choose()}>
              {t(
                status === 'none' || status === 'loading'
                  ? 'calculator.saveFolder.choose'
                  : 'calculator.saveFolder.change',
              )}
            </Button>
            {status !== 'none' && status !== 'loading' && (
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
      <Group gap="xs" wrap="wrap">
        <Text size="xs" c="green.8">
          {t('calculator.saveFolder.savedFolder', { path: outcome.path.join(' / ') })}
        </Text>
        <Button
          size="compact-xs"
          variant="subtle"
          title={t('calculator.saveFolder.openHint')}
          onClick={() => void showFolder(outcome.directory)}
        >
          {t('calculator.saveFolder.showFile')}
        </Button>
      </Group>
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
