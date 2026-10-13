import {
  Button,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { CourseItem } from '../../lib/course-input'
import {
  clockMinutes,
  defaultTiming,
  type DoseTiming,
  type TimingChoice,
} from '../../lib/dose-timing'

/**
 * How often a supportive drug is given and when, for the days of the course: ondansetron before
 * the cytostatic on day 1, then every 8 hours at a convenient time. The first day can be set apart
 * from the others. The calculation, the schedule and the sheets all follow it.
 */
export function TimingEditor({
  item,
  choice,
  defaultClock,
  disabled,
  onChange,
}: {
  item: CourseItem
  choice: TimingChoice | undefined
  /** Where a fixed time starts until the physician sets one. */
  defaultClock: string
  disabled: boolean
  onChange: (choice: TimingChoice | null) => void
}) {
  const { t } = useTranslation()
  const rest = choice?.rest ?? defaultTiming(item.item, defaultClock)
  const firstDay = choice?.firstDay ?? null
  // A row on the inpatient list has no hour: there, only how often matters.
  const timed = item.item.block !== 'ward'
  const canSplit = item.item.days.length > 1

  const set = (next: Partial<TimingChoice>) => onChange({ rest, firstDay, ...next })

  return (
    <details>
      <summary>
        <Text size="xs" c="blue" component="span">
          {t('calculator.doses.timing.title')}
          {choice !== undefined && ` · ${t('calculator.doses.timing.changed')}`}
        </Text>
      </summary>
      <Stack gap={6} mt={4}>
        <TimingFields
          timing={rest}
          timed={timed}
          disabled={disabled}
          label={
            firstDay === null
              ? t('calculator.doses.timing.allDays')
              : t('calculator.doses.timing.otherDays')
          }
          onChange={(next) => set({ rest: next })}
        />
        {canSplit && (
          <Switch
            size="xs"
            disabled={disabled}
            checked={firstDay !== null}
            onChange={(event) =>
              set({ firstDay: event.currentTarget.checked ? { ...rest } : null })
            }
            label={t('calculator.doses.timing.firstDayApart')}
          />
        )}
        {firstDay !== null && (
          <TimingFields
            timing={firstDay}
            timed={timed}
            disabled={disabled}
            label={t('calculator.doses.timing.firstDay')}
            onChange={(next) => set({ firstDay: next })}
          />
        )}
        {choice !== undefined && (
          <Group>
            <Button
              size="compact-xs"
              variant="subtle"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              {t('calculator.doses.timing.reset')}
            </Button>
          </Group>
        )}
      </Stack>
    </details>
  )
}

function TimingFields({
  timing,
  timed,
  disabled,
  label,
  onChange,
}: {
  timing: DoseTiming
  timed: boolean
  disabled: boolean
  label: string
  onChange: (timing: DoseTiming) => void
}) {
  const { t } = useTranslation()
  const patch = (next: Partial<DoseTiming>) => onChange({ ...timing, ...next })
  return (
    <Stack gap={4}>
      <Text size="xs" fw={500}>
        {label}
      </Text>
      <Group gap={6} align="flex-end" wrap="wrap">
        <NumberInput
          size="xs"
          w={86}
          min={1}
          max={8}
          allowDecimal={false}
          disabled={disabled}
          label={t('calculator.doses.timing.perDay')}
          value={timing.perDay}
          onChange={(value) => patch({ perDay: Math.max(1, Number(value) || 1) })}
        />
        {timing.perDay > 1 && (
          <NumberInput
            size="xs"
            w={86}
            min={1}
            max={24}
            step={1}
            disabled={disabled}
            label={t('calculator.doses.timing.interval')}
            value={timing.intervalH}
            onChange={(value) => patch({ intervalH: Math.max(1, Number(value) || 8) })}
          />
        )}
      </Group>
      {timed && (
        <Group gap={6} align="flex-end" wrap="wrap">
          <SegmentedControl
            size="xs"
            disabled={disabled}
            value={timing.mode}
            onChange={(mode) => patch({ mode: mode as DoseTiming['mode'] })}
            data={[
              { value: 'chemo', label: t('calculator.doses.timing.fromChemo') },
              { value: 'clock', label: t('calculator.doses.timing.atTime') },
            ]}
          />
          {timing.mode === 'chemo' ? (
            <NumberInput
              size="xs"
              w={96}
              step={15}
              allowNegative
              allowDecimal={false}
              disabled={disabled}
              label={t('calculator.doses.timing.offset')}
              value={timing.offsetMin}
              onChange={(value) => patch({ offsetMin: Number(value) || 0 })}
            />
          ) : (
            <TextInput
              size="xs"
              w={96}
              type="time"
              disabled={disabled}
              label={t('calculator.doses.timing.clock')}
              value={timing.clock}
              error={clockMinutes(timing.clock) === null}
              onChange={(event) => patch({ clock: event.currentTarget.value })}
            />
          )}
        </Group>
      )}
    </Stack>
  )
}
