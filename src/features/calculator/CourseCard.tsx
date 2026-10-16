import { Button, Card, FileButton, Group, Stack, Switch, Text, Title } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { saveFile } from '../../lib/save-file'
import { courseCardFile, readCourseCard } from './course-draft'
import type { CourseState } from './course-state'

/**
 * The course as a file: saved to be opened on another computer or taken out again for the next
 * cycle, and read back here. The file never leaves the machine — it is written in the browser and
 * handed straight to the download, like the printed sheets.
 *
 * Beside it, the one decision about the draft this browser keeps: whether it may hold the
 * patient's name. Switched off, the draft carries the measurements and the sheet but no identity.
 */
export function CourseCard({
  state,
  rememberName,
  onRememberName,
  onImport,
}: {
  state: CourseState
  rememberName: boolean
  onRememberName: (on: boolean) => void
  onImport: (state: CourseState) => void
}) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)

  const read = async (file: File | null) => {
    if (!file) return
    const course = readCourseCard(await file.text())
    setFailed(course === null)
    if (course) onImport(course)
  }

  return (
    <Card withBorder component="section">
      <Stack gap="xs">
        <Title order={2} size="h4">
          {t('calculator.draft.title')}
        </Title>
        <Text size="xs" c="dimmed">
          {t('calculator.draft.note')}
        </Text>
        <Switch
          checked={rememberName}
          onChange={(event) => onRememberName(event.currentTarget.checked)}
          label={t('calculator.draft.rememberName')}
          description={t('calculator.draft.rememberNameHint')}
        />
        <Group gap="xs">
          <Button
            size="xs"
            variant="default"
            onClick={() => {
              const file = courseCardFile(state)
              saveFile(file.name, file.bytes, 'application/json')
            }}
          >
            {t('calculator.draft.export')}
          </Button>
          <FileButton accept="application/json,.json" onChange={read}>
            {(props) => (
              <Button {...props} size="xs" variant="default">
                {t('calculator.draft.import')}
              </Button>
            )}
          </FileButton>
        </Group>
        {failed && (
          <Text size="xs" c="red">
            {t('calculator.draft.importFailed')}
          </Text>
        )}
      </Stack>
    </Card>
  )
}
