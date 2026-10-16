import { Badge, Button, Group, SegmentedControl, Text, TextInput } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CourseDrugResult, CourseResult } from '../../domain'
import type { CourseItem, SheetChoice } from '../../lib/course-input'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import { defaultWardHours, hourOfMinutes, type RowPlan, type WardMode } from '../../lib/row-plan'
import { HourStrip } from './HourStrip'
import { formatDays, parseDays } from './parse-days'

/** How many times a day the inpatient sheet offers for a drug whose frequency is the physician's. */
const PER_DAY_OPTIONS = [1, 2, 3, 4]

/** The hours the schedule gives a row on the first day it is given: what the strip shows untouched. */
function scheduledHours(course: CourseResult | null, id: string): number[] {
  for (const day of course?.days ?? []) {
    const hours = day.administrations
      .filter((administration) => administration.drugId === id)
      .map((administration) => hourOfMinutes(administration.startMin))
    if (hours.length > 0) return hours
  }
  return []
}

/**
 * Where a row goes and when, in one line under it: the sheet; the hours on a strip of the sheet's
 * own hours (or, on the inpatient sheet, how many times a day); the days, for the support around
 * the regimen; and a second row of the same drug with settings of its own.
 */
export function RowPlanControls({
  item,
  result,
  course,
  plan,
  free,
  enabled,
  sheetChanged,
  overlap,
  onSheet,
  onPlan,
  onVariant,
}: {
  item: CourseItem
  result: CourseDrugResult | undefined
  course: CourseResult | null
  plan: RowPlan | undefined
  /** The frequency and the days are the physician's: support, a drug added by hand, a copy. */
  free: boolean
  enabled: boolean
  sheetChanged: boolean
  /** Days another row of the same drug is given on too. */
  overlap: number[] | undefined
  onSheet: (sheet: SheetChoice) => void
  /** `null` takes everything set for the row away. */
  onPlan: (patch: Partial<RowPlan> | null) => void
  onVariant: () => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const name = localize(item.drug.name, language)
  const ward = item.item.block === 'ward'
  const perDay = result?.administrationsPerDay ?? item.item.administrations_per_day
  const wardMode: WardMode = plan?.wardMode ?? 'count'
  const pinned = (plan?.hours?.length ?? 0) > 0
  const hours = pinned
    ? plan!.hours!
    : ward
      ? (item.wardHours ?? [])
      : scheduledHours(course, item.item.id)

  return (
    <Group gap="sm" wrap="wrap" align="center">
      <Group gap={4} wrap="nowrap">
        <SegmentedControl
          size="xs"
          disabled={!enabled}
          value={ward ? 'ward' : 'infusion'}
          onChange={(value) => onSheet(value as SheetChoice)}
          data={[
            { value: 'infusion', label: t('calculator.doses.sheet.infusion') },
            { value: 'ward', label: t('calculator.doses.sheet.ward') },
          ]}
          aria-label={`${t('calculator.doses.sheet.label')}: ${name}`}
        />
        {sheetChanged && (
          <Badge size="xs" variant="light" color="blue">
            {t('calculator.doses.sheet.changed')}
          </Badge>
        )}
      </Group>

      {/* The inpatient sheet writes how many times a day unless the physician asks for hours. */}
      {ward && (
        <SegmentedControl
          size="xs"
          disabled={!enabled}
          value={wardMode}
          onChange={(value) => {
            const mode = value as WardMode
            onPlan(
              mode === 'hours' && !pinned
                ? { wardMode: mode, hours: defaultWardHours(perDay) }
                : { wardMode: mode },
            )
          }}
          data={[
            { value: 'count', label: t('calculator.plan.count') },
            { value: 'hours', label: t('calculator.plan.hours') },
          ]}
          aria-label={`${t('calculator.plan.wardMode')}: ${name}`}
        />
      )}

      {ward && wardMode === 'count' ? (
        free ? (
          <SegmentedControl
            size="xs"
            disabled={!enabled}
            value={String(perDay)}
            onChange={(value) => onPlan({ perDay: Number(value) })}
            data={[...new Set([...PER_DAY_OPTIONS, perDay])]
              .sort((a, b) => a - b)
              .map((count) => ({
                value: String(count),
                label: t('calculator.plan.perDay', { count }),
              }))}
            aria-label={`${t('calculator.plan.count')}: ${name}`}
          />
        ) : (
          <Text size="xs">{t('calculator.plan.perDay', { count: perDay })}</Text>
        )
      ) : (
        <Group gap={6} wrap="nowrap" maw="100%">
          <HourStrip
            hours={hours}
            pinned={pinned}
            multiple={free || (ward && perDay > 1)}
            disabled={!enabled}
            label={`${t('calculator.plan.hours')}: ${name}`}
            onChange={(next) => onPlan({ hours: next })}
          />
          {pinned && !ward && (
            <Button
              size="compact-xs"
              variant="subtle"
              disabled={!enabled}
              onClick={() => onPlan({ hours: [] })}
            >
              {t('calculator.plan.auto')}
            </Button>
          )}
        </Group>
      )}

      {free && (
        <DaysInput
          days={item.item.days}
          disabled={!enabled}
          label={`${t('calculator.plan.days')}: ${name}`}
          onChange={(days) => onPlan({ days })}
        />
      )}

      {free && (
        <Button size="compact-xs" variant="subtle" disabled={!enabled} onClick={onVariant}>
          {t('calculator.plan.variant')}
        </Button>
      )}

      {overlap && overlap.length > 0 && (
        <Text size="xs" c="orange.8">
          {t('calculator.plan.overlap', { days: formatDays(overlap) })}
        </Text>
      )}
    </Group>
  )
}

/** The days as typed, «1-7, 10»; a list that does not read as days is shown in red and not taken. */
function DaysInput({
  days,
  disabled,
  label,
  onChange,
}: {
  days: number[]
  disabled: boolean
  label: string
  onChange: (days: number[]) => void
}) {
  const { t } = useTranslation()
  const [typed, setTyped] = useState<string | null>(null)
  const parsed = typed === null ? days : parseDays(typed)
  const commit = () => {
    if (typed === null) return
    if (parsed && parsed.length > 0) onChange(parsed)
    setTyped(null)
  }
  return (
    <TextInput
      size="xs"
      w={130}
      disabled={disabled}
      leftSection={
        <Text size="xs" c="dimmed">
          {t('calculator.plan.daysShort')}
        </Text>
      }
      leftSectionWidth={44}
      value={typed ?? formatDays(days)}
      error={typed !== null && (parsed === null || parsed.length === 0)}
      onChange={(event) => setTyped(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit()
      }}
      aria-label={label}
    />
  )
}
