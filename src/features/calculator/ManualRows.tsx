import {
  ActionIcon,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SHEET_HOURS } from './course-sheets'
import { newManualRow, type ManualBlock, type ManualRow } from './manual-rows'
import { parseDays } from './parse-days'

/**
 * Orders written out by hand. They are printed as typed, so the physician can put a line on the
 * sheet that the catalog knows nothing about — and can make a whole sheet without a regimen.
 */
export function ManualRows({
  rows,
  onChange,
}: {
  rows: ManualRow[]
  onChange: (rows: ManualRow[]) => void
}) {
  const { t } = useTranslation()
  // The days are kept as the physician typed them, so «1, 8, 15» can be edited mid-word.
  const [typedDays, setTypedDays] = useState<Record<string, string>>({})

  const patch = (id: string, next: Partial<ManualRow>) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...next } : row)))
  }

  const hours = [
    { value: '', label: t('calculator.manual.hourNone') },
    ...SHEET_HOURS.map((hour) => ({ value: String(hour), label: `${hour}:00` })),
  ]

  return (
    <Card withBorder component="section">
      <Stack gap="sm">
        <Title order={2} size="h4">
          {t('calculator.manual.title')}
        </Title>
        <Text size="sm" c="dimmed">
          {t('calculator.manual.lead')}
        </Text>

        {rows.map((row) => {
          const typed = typedDays[row.id] ?? row.days.join(', ')
          const parsed = parseDays(typed)
          return (
            <Group key={row.id} align="flex-end" wrap="wrap" gap="sm">
              <TextInput
                label={t('calculator.manual.what')}
                placeholder={t('calculator.manual.whatPlaceholder')}
                value={row.what}
                onChange={(event) => patch(row.id, { what: event.currentTarget.value })}
                style={{ flex: '1 1 260px' }}
              />
              <TextInput
                label={t('calculator.manual.how')}
                placeholder={t('calculator.manual.howPlaceholder')}
                value={row.how}
                onChange={(event) => patch(row.id, { how: event.currentTarget.value })}
                w={180}
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
          onClick={() => onChange([...rows, newManualRow(`manual-${Date.now()}`)])}
        >
          {t('calculator.manual.add')}
        </Button>
      </Stack>
    </Card>
  )
}
