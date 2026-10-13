import { Card, Group, NumberInput, Stack, Switch, Table, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { addDays, type CourseResult } from '../../domain'
import type { CourseItem } from '../../lib/course-input'
import { formatDate } from '../../lib/format'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import { daysOfDrugs, isSynced, previousDayOf, type ShiftSync } from '../../lib/shift-sync'
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
  shifts,
  sync,
  onShift,
  onDaySync,
  onDrugSync,
}: {
  items: CourseItem[]
  /** Null when nothing was calculated: the days then come from the hand-written lines alone. */
  course: CourseResult | null
  manualRows?: ManualRow[]
  startDateIso: string
  /** The shift of every drug on every day: typed in, or taken from the previous day. */
  shifts: Record<string, Record<number, number>>
  sync: ShiftSync
  /** `null` takes the typed shift away, and the day follows the previous one again. */
  onShift: (itemId: string, day: number, minutes: number | null) => void
  onDaySync: (day: number, on: boolean) => void
  onDrugSync: (itemId: string, day: number, on: boolean) => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const byId = new Map(items.map((item) => [item.item.id, item]))
  const daysOf = daysOfDrugs(items)
  const firstDay = Math.min(...[...daysOf.values()].flat(), Infinity)
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

  // A zero-length administration is named by its route: only an intravenous push is «струминно»;
  // an injection under the skin or into a muscle, or a tablet, is not — and an infusion with no
  // duration in the regimen says so.
  const zeroLengthNote = (id: string) => {
    const route = byId.get(id)?.item.route
    if (route === 'iv_infusion') return t('calculator.schedule.noDuration')
    if (route === undefined || route === 'iv_bolus') return t('calculator.schedule.bolus')
    return t(`routeShort.${route}`)
  }

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
            <Group gap="sm" align="center">
              <Text fw={500}>
                {t('calculator.schedule.day', { day: day.day })} · {formatDate(day.date, language)}
              </Text>
              {day.day > firstDay && (
                <Switch
                  size="xs"
                  checked={!sync.offDays.includes(day.day)}
                  onChange={(event) => onDaySync(day.day, event.currentTarget.checked)}
                  label={t('calculator.schedule.syncDay')}
                />
              )}
            </Group>
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
                        <Stack gap={2}>
                          <NumberInput
                            size="xs"
                            step={15}
                            value={sync.explicit[administration.drugId]?.[day.day] ?? ''}
                            placeholder={String(shifts[administration.drugId]?.[day.day] ?? '')}
                            onChange={(value) =>
                              onShift(
                                administration.drugId,
                                day.day,
                                value === '' ? null : Number(value) || 0,
                              )
                            }
                          />
                          {previousDayOf(daysOf, administration.drugId, day.day) !== null && (
                            <Switch
                              size="xs"
                              disabled={sync.offDays.includes(day.day)}
                              checked={isSynced(sync, administration.drugId, day.day)}
                              onChange={(event) =>
                                onDrugSync(
                                  administration.drugId,
                                  day.day,
                                  event.currentTarget.checked,
                                )
                              }
                              label={t('calculator.schedule.syncDrug')}
                            />
                          )}
                        </Stack>
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
