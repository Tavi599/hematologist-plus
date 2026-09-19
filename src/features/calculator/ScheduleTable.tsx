import { Card, NumberInput, Stack, Table, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { CourseResult } from '../../domain'
import type { CourseItem } from '../../lib/course-input'
import { formatDate } from '../../lib/format'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'

/** Course days with the hourly plan; every administration can be shifted by hand. */
export function ScheduleTable({
  items,
  course,
  shiftMin,
  onShift,
}: {
  items: CourseItem[]
  course: CourseResult
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
  // A zero-length administration is a bolus — unless the regimen simply has no duration for it.
  const zeroLengthNote = (id: string) =>
    byId.get(id)?.item.route === 'iv_infusion'
      ? t('calculator.schedule.noDuration')
      : t('calculator.schedule.bolus')

  return (
    <Card withBorder component="section">
      <Stack gap="sm">
        <Title order={2} size="h4">
          {t('calculator.schedule.title')}
        </Title>
        <Text size="xs" c="dimmed">
          {t('calculator.schedule.wardNote')}
        </Text>
        {course.days.map((day) => (
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
                  {day.administrations.map((administration) => (
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
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {day.untimed.length > 0 && (
              <Text size="xs" c="dimmed">
                {t('calculator.schedule.ward')}: {day.untimed.map(nameOf).join(', ')}
              </Text>
            )}
          </Stack>
        ))}
      </Stack>
    </Card>
  )
}
