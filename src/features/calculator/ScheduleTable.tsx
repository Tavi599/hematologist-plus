import { Card, NumberInput, Stack, Table, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { addDays, type CourseResult } from '../../domain'
import type { CourseItem } from '../../lib/course-input'
import { formatDate } from '../../lib/format'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import { daysWithManual, manualRowsOn, manualWardRows, type ManualRow } from './manual-rows'

/**
 * Course days with the hourly plan; every administration can be shifted by hand.
 *
 * Lines written by hand stand in it beside the calculated ones, on the day and at the hour they
 * were written for — the sheet is read here before it is printed, and a line missing from the
 * screen but present on the paper is worse than no screen at all.
 */
export function ScheduleTable({
  items,
  course,
  manualRows = [],
  startDateIso,
  shiftMin,
  onShift,
}: {
  items: CourseItem[]
  /** Null when nothing was calculated: the days then come from the hand-written lines alone. */
  course: CourseResult | null
  manualRows?: ManualRow[]
  startDateIso: string
  shiftMin: Record<string, number>
  onShift: (itemId: string, minutes: number) => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const byId = new Map(items.map((item) => [item.item.id, item]))
  const nameOf = (id: string) => {
    const item = byId.get(id)
    return item ? localize(item.drug.name, language) : id
  }
  const days = daysWithManual(
    (course?.days ?? []).map((day) => ({ day: day.day, date: day.date })),
    manualRows,
    (day) => addDays(startDateIso, day - 1),
  )
  const administrationsOn = (dayNumber: number) =>
    course?.days.find((day) => day.day === dayNumber)?.administrations ?? []
  const untimedOn = (dayNumber: number) =>
    course?.days.find((day) => day.day === dayNumber)?.untimed ?? []

  // A zero-length administration is a bolus — unless the regimen simply has no duration for it.
  const zeroLengthNote = (id: string) =>
    byId.get(id)?.item.route === 'iv_infusion'
      ? t('calculator.schedule.noDuration')
      : t('calculator.schedule.bolus')

  const wardLine = (dayNumber: number) => [
    ...untimedOn(dayNumber).map(nameOf),
    ...manualWardRows(manualRows)
      .filter((row) => row.days.includes(dayNumber))
      .map((row) => row.what),
  ]

  return (
    <Card withBorder component="section">
      <Stack gap="sm">
        <Title order={2} size="h4">
          {t('calculator.schedule.title')}
        </Title>
        <Text size="xs" c="dimmed">
          {t('calculator.schedule.wardNote')}
        </Text>
        {days.map((day) => (
          <Stack key={day.day} gap={4}>
            <Text fw={500}>
              {t('calculator.schedule.day', { day: day.day })} · {formatDate(day.date, language)}
            </Text>
            <Table.ScrollContainer minWidth={480}>
              <Table
                verticalSpacing={4}
                withTableBorder
                aria-label={t('calculator.schedule.day', { day: day.day })}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={130}>{t('calculator.schedule.time')}</Table.Th>
                    <Table.Th>{t('calculator.schedule.drug')}</Table.Th>
                    <Table.Th w={120}>{t('calculator.schedule.shift')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {administrationsOn(day.day).map((administration) => (
                    <Table.Tr key={administration.id}>
                      <Table.Td>
                        {administration.start === administration.end
                          ? `${administration.start} · ${zeroLengthNote(administration.drugId)}`
                          : `${administration.start} – ${administration.end}`}
                        {administration.endDayOffset > 0 && (
                          <Text size="xs" c="dimmed">
                            {t('calculator.schedule.nextDay')}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>{nameOf(administration.drugId)}</Table.Td>
                      <Table.Td>
                        <NumberInput
                          size="xs"
                          step={15}
                          value={shiftMin[administration.drugId] ?? ''}
                          onChange={(value) => onShift(administration.drugId, Number(value) || 0)}
                        />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {manualRowsOn(manualRows, 'infusion', day.day).map((row) => (
                    <Table.Tr key={row.id}>
                      <Table.Td>
                        {row.hour === null
                          ? t('calculator.manual.hourNone')
                          : `${String(row.hour).padStart(2, '0')}:00`}
                      </Table.Td>
                      <Table.Td>
                        {row.what}
                        {row.how !== '' && (
                          <Text size="xs" c="dimmed">
                            {row.how}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {t('calculator.manual.byHand')}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {wardLine(day.day).length > 0 && (
              <Text size="xs" c="dimmed">
                {t('calculator.schedule.ward')}: {wardLine(day.day).join(', ')}
              </Text>
            )}
          </Stack>
        ))}
      </Stack>
    </Card>
  )
}
