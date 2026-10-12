import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SHEET_HOURS } from './course-sheets'
import { moveRow, newManualRow, type ManualBlock, type ManualRow } from './manual-rows'
import { parseDays } from './parse-days'
import { SupportiveBuilder } from './SupportiveBuilder'
import { CollapsibleCard } from './CollapsibleCard'

/** Height of a field in lines: as many as the text has, the sheet's own line breaks. */
const lineCount = (text: string) => Math.max(1, text.split('\n').length)

/** Anchor of the section, so a link elsewhere on the page can scroll to it. */
export const MANUAL_ROWS_ANCHOR = 'manual-rows'

/**
 * Orders written out by hand. They are printed as typed, so the physician can put a line on the
 * sheet that the catalog knows nothing about — and can make a whole sheet without a regimen.
 */
export function ManualRows({
  rows,
  onChange,
  openRequest,
}: {
  rows: ManualRow[]
  onChange: (rows: ManualRow[]) => void
  /** Opens the section whenever it changes (the immunoglobulin row asks to show its support). */
  openRequest?: number
}) {
  const { t } = useTranslation()
  // The days are kept as the physician typed them, so «1, 8, 15» can be edited mid-word.
  const [typedDays, setTypedDays] = useState<Record<string, string>>({})
  // A clock alone does not tell two lines apart: two added in the same millisecond would share
  // an id, and editing one would edit both.
  const added = useRef(0)

  const patch = (id: string, next: Partial<ManualRow>) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...next } : row)))
  }

  const hours = [
    { value: '', label: t('calculator.manual.hourNone') },
    ...SHEET_HOURS.map((hour) => ({ value: String(hour), label: `${hour}:00` })),
  ]

  return (
    <CollapsibleCard
      title={t('calculator.manual.title')}
      id={MANUAL_ROWS_ANCHOR}
      {...(openRequest === undefined ? {} : { openRequest })}
      {...(rows.length > 0 ? { hint: t('calculator.manual.count', { count: rows.length }) } : {})}
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          {t('calculator.manual.lead')}
        </Text>

        <SupportiveBuilder onAdd={(row) => onChange([...rows, row])} />

        {rows.map((row, index) => {
          const typed = typedDays[row.id] ?? row.days.join(', ')
          const parsed = parseDays(typed)
          return (
            <Group key={row.id} align="flex-end" wrap="wrap" gap="sm">
              {/* Several lines, as the sheet writes them: a bag and what goes into it. */}
              <Textarea
                label={
                  row.supportFor ? (
                    <Group gap={6} wrap="nowrap" component="span">
                      {t('calculator.manual.what')}
                      <Badge size="xs" variant="light" component="span">
                        {t('calculator.manual.ivigSupport')}
                      </Badge>
                    </Group>
                  ) : (
                    t('calculator.manual.what')
                  )
                }
                placeholder={t('calculator.manual.whatPlaceholder')}
                rows={lineCount(row.what)}
                value={row.what}
                onChange={(event) => patch(row.id, { what: event.currentTarget.value })}
                style={{ flex: '1 1 260px' }}
              />
              <Textarea
                label={t('calculator.manual.how')}
                placeholder={t('calculator.manual.howPlaceholder')}
                rows={lineCount(row.how)}
                value={row.how}
                onChange={(event) => patch(row.id, { how: event.currentTarget.value })}
                w={200}
              />
              <TextInput
                label={t('calculator.doses.addDays')}
                placeholder={t('calculator.doses.addDaysPlaceholder')}
                value={typed}
                onChange={(event) => {
                  const value = event.currentTarget.value
                  setTypedDays((current) => ({ ...current, [row.id]: value }))
                  const days = parseDays(value)
                  if (days !== null) patch(row.id, { days })
                }}
                error={parsed === null ? t('calculator.doses.addInvalidDays') : null}
                w={140}
              />
              <Select
                label={t('calculator.manual.block')}
                allowDeselect={false}
                data={[
                  { value: 'infusion', label: t('calculator.manual.blockInfusion') },
                  { value: 'ward', label: t('calculator.manual.blockWard') },
                ]}
                value={row.block}
                onChange={(value) =>
                  patch(row.id, { block: (value as ManualBlock | null) ?? 'infusion' })
                }
                w={200}
              />
              <Select
                label={t('calculator.manual.hour')}
                allowDeselect={false}
                data={hours}
                value={row.hour === null ? '' : String(row.hour)}
                onChange={(value) => patch(row.id, { hour: value ? Number(value) : null })}
                // The inpatient sheet has no clock: its lines are marked by the date alone.
                disabled={row.block === 'ward'}
                w={130}
              />
              <Checkbox
                label={t('calculator.manual.before')}
                checked={row.before ?? false}
                disabled={row.block === 'ward'}
                onChange={(event) => patch(row.id, { before: event.currentTarget.checked })}
                mb={8}
              />
              <ActionIcon
                variant="subtle"
                aria-label={t('calculator.manual.up')}
                disabled={index === 0}
                onClick={() => onChange(moveRow(rows, row.id, -1))}
              >
                ↑
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                aria-label={t('calculator.manual.down')}
                disabled={index === rows.length - 1}
                onClick={() => onChange(moveRow(rows, row.id, 1))}
              >
                ↓
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={t('calculator.manual.remove')}
                onClick={() => onChange(rows.filter((other) => other.id !== row.id))}
              >
                ×
              </ActionIcon>
            </Group>
          )
        })}

        <Button
          variant="light"
          style={{ alignSelf: 'flex-start' }}
          onClick={() =>
            onChange([...rows, newManualRow(`manual-${Date.now()}-${added.current++}`)])
          }
        >
          {t('calculator.manual.add')}
        </Button>
      </Stack>
    </CollapsibleCard>
  )
}
