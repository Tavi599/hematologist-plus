import { Button, Card, FileButton, Group, Stack, Switch, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { SaveOutcome } from '../../lib/save-folder'
import { SaveOutcomeNote } from './SaveFolder'

/**
 * The course kept on this device, and the file it is carried in. The draft itself needs no
 * button: it is written as the physician works and restored on the next visit. What is here is
 * the one decision that is the physician's — whether the patient's name may be written down —
 * and the card: a file to take the course to another device or into the next cycle.
 */
export function CourseDraft({
  personal,
  onPersonal,
  onSave,
  onOpen,
  note,
  saved,
}: {
  personal: boolean
  onPersonal: (allowed: boolean) => void
  onSave: () => void
  onOpen: (file: File) => void
  /** What the last card did: opened, or not a card at all. */
  note: 'opened' | 'invalid' | null
  /** Where the last card was saved. */
  saved: SaveOutcome | null
}) {
  const { t } = useTranslation()

  return (
    <Card withBorder component="section">
      <Stack gap="xs">
        <Title order={2} size="h4">
          {t('calculator.draft.title')}
        </Title>
        <Text size="xs" c="dimmed">
          {t('calculator.draft.hint')}
        </Text>
        <Switch
          checked={personal}
          onChange={(event) => onPersonal(event.currentTarget.checked)}
          label={t('calculator.draft.personal')}
          description={t('calculator.draft.personalHint')}
        />
        <Group gap="xs" wrap="wrap">
          <Button size="xs" variant="default" onClick={onSave}>
            {t('calculator.draft.save')}
          </Button>
          <FileButton onChange={(file) => file && onOpen(file)} accept="application/json">
            {(props) => (
              <Button size="xs" variant="default" {...props}>
                {t('calculator.draft.open')}
              </Button>
            )}
          </FileButton>
        </Group>
        <SaveOutcomeNote outcome={saved} />
        {note !== null && (
          <Text size="xs" c={note === 'opened' ? 'green.8' : 'red.8'}>
            {t(note === 'opened' ? 'calculator.draft.opened' : 'calculator.draft.invalid')}
          </Text>
        )}
      </Stack>
    </Card>
  )
}
