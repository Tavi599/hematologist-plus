import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Collapse,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  BagOption,
  BsaVariant,
  CourseDrugResult,
  CourseResult,
  RenalAdjustment,
  RenalBandLevel,
} from '../../domain'
import {
  amountUnitOf,
  defaultInfusionStart,
  isMassUnit,
  rampDurationMin,
  renalBandDose,
  type RampDurations,
  type RampKind,
} from '../../domain'
import { rampStepsFor } from '../../lib/ramp-steps'
import type { DrugInfusionParams } from '../../schemas/catalog'
import { formatNumber } from '../../lib/format'
import { currentLanguage, type DynamicTranslate } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import {
  DEFAULT_DOSE_CHOICE,
  defaultBolusMode,
  isContinuousDoxorubicin,
  PROTOCOL_MODE,
  solventOf,
  type AdministrationMode,
  type InfusionLength,
  type CourseItem,
  type DurationOption,
  type SheetChoice,
} from '../../lib/course-input'
import { groupCourseItems } from '../../lib/dose-groups'
import { PREMEDICATION_ADVISED } from '../../lib/premedication'
import { IVIG_DRUG_ID } from './supportive-rows'
import { CalculationChain } from './CalculationChain'
import { SourceNotes } from './SourceNotes'
import { WarningList } from './WarningList'
import classes from './DoseTable.module.css'

export interface DoseTableProps {
  items: CourseItem[]
  /** null until the patient data is complete: the course is shown, the doses are not calculated. */
  course: CourseResult | null
  disabledIds: string[]
  drugPercent: Record<string, number>
  doseOverrideAmount: Record<string, number>
  onToggle: (itemId: string, enabled: boolean) => void
  /** `null` switches the reduction off for this drug. */
  onReduction: (itemId: string, percent: number | null) => void
  onDoseOverride: (itemId: string, doseAmount: number | null) => void
  onDoseChoice: (itemId: string, choiceId: string) => void
  /** How a switchable drug (mesna) is given; absent means the protocol's own schedule. */
  administrationModes: Record<string, AdministrationMode>
  onAdministrationMode: (itemId: string, mode: AdministrationMode) => void
  /** The full set of modifier keys in force for this item after the physician's click. */
  onDoseModifiers: (itemId: string, keys: string[]) => void
  /** The bag an antimicrobial infusion is diluted in, picked by the physician. */
  onBagChoice: (itemId: string, bagVolumeMl: number) => void
  /** Durations the physician picked for antimicrobial infusions, by row, min. */
  chosenDurations: Record<string, number>
  /** `null` goes back to the row's own duration. */
  onDurationChoice: (itemId: string, durationMin: number | null) => void
  /** Rows whose correction by creatinine clearance the physician switched off. */
  renalBandOffIds: string[]
  onRenalBandOff: (itemId: string, off: boolean) => void
  /** Where in the label's range of a corrected dose the physician puts it. */
  onRenalBandLevel: (itemId: string, level: RenalBandLevel) => void
  /** The full dose every other day instead of the lower daily one, where a range offers it. */
  onRenalBandEveryOtherDay: (itemId: string, on: boolean) => void
  onRemove: (itemId: string) => void
  customIds: string[]
  /** The BSA the doses are given on; the other variant is shown under it when it differs. */
  bsaVariant: BsaVariant
  /** Drugs that ask for premedication, by item id, with the days they get none. */
  premedicationMissing: Map<string, number[]>
  /** Cyclophosphamide items mesna can be added to, though their protocol gives none. */
  mesnaOffered: string[]
  /** Of those, the ones the physician has added it to. */
  mesnaAdded: string[]
  onMesna: (itemId: string, on: boolean) => void
  /** Immunoglobulin rows whose standard support is written out among the hand-written lines. */
  ivigSupportAdded: string[]
  onIvigSupport: (itemId: string, on: boolean) => void
  /** Opens the hand-written lines, where the support is changed. */
  onIvigSupportEdit: () => void
  /** Gives the row by another route the label allows at the same dose. */
  onRoute: (itemId: string, route: CourseItem['item']['route']) => void
  /** The sheet the physician moved a row to; a row not in it is printed where the regimen puts it. */
  sheetChoices: Record<string, SheetChoice>
  onSheet: (itemId: string, sheet: SheetChoice) => void
  /** Cycle of the course: cycle 1 opens with the first, slower infusion unless set otherwise. */
  cycleNumber: number
  /** Which infusion of an antibody the course opens with, by drug; see CourseAdjustments. */
  infusionStart: Record<string, number>
  onInfusionStart: (drugId: string, start: number) => void
}

const RANGE_LEVELS: RenalBandLevel[] = ['low', 'mid', 'high']

/** Which level of a range a dose sits at; the middle unless it is one of the ends. */
function rangeLevel(range: { min: number; max: number }, dose: number): RenalBandLevel {
  if (dose === range.min) return 'low'
  if (dose === range.max) return 'high'
  return 'mid'
}

/** «2 g every 12 h»: a dose and how often it is given. */
function doseEvery(
  t: DynamicTranslate,
  language: ReturnType<typeof currentLanguage>,
  value: number,
  unit: string,
  administrationsPerDay: number,
  intervalMin: number | null | undefined,
): string {
  const hours = intervalMin ? intervalMin / 60 : 24 / administrationsPerDay
  return t('calculator.doses.renal.doseEvery', {
    dose: formatNumber(value, language, 2),
    unit: t(`units.${unit}`),
    hours: formatNumber(hours, language, 1),
  })
}

/**
 * What the creatinine clearance did to the row: the label's dose and interval in force (with the
 * note of that range and a switch to keep the protocol's), the clearance above every range, or
 * why nothing was checked.
 */
function RenalBandInfo({
  adjustment,
  item,
  off,
  disabled,
  onOff,
  onLevel,
  onEveryOtherDay,
}: {
  adjustment: RenalAdjustment
  item: CourseItem
  off: boolean
  disabled: boolean
  onOff: (off: boolean) => void
  onLevel: (level: RenalBandLevel) => void
  onEveryOtherDay: (on: boolean) => void
}) {
  const { t } = useTranslation()
  const tu = t as unknown as DynamicTranslate
  const language = currentLanguage()
  // The ranges are written in the item's own dose unit: mg/kg for a dose per kilogram.
  const unit = item.item.dose_unit
  const protocol = doseEvery(
    tu,
    language,
    item.item.dose_value,
    unit,
    item.item.administrations_per_day,
    item.item.interval_min,
  )
  if (adjustment.status === 'unchecked' || adjustment.status === 'notForDose') {
    return (
      <Text size="xs" c="orange.8" mt={2}>
        {t(`calculator.doses.renal.${adjustment.status}`)}
      </Text>
    )
  }
  if (adjustment.status === 'above') {
    return (
      <Text size="xs" c="dimmed" mt={2}>
        {t('calculator.doses.renal.above', {
          crcl: formatNumber(adjustment.clearanceMlMin, language, 0),
          above: adjustment.aboveMlMin,
        })}
      </Text>
    )
  }
  const { band } = adjustment
  const row = item.item.renal_bands.find(
    (entry) => entry.crcl_min === band.minMlMin && entry.crcl_max === band.maxMlMin,
  )
  const corrected =
    adjustment.status === 'applied' && adjustment.everyOtherDay
      ? t('calculator.doses.renal.everyOtherDay.everyOther', {
          dose: formatNumber(adjustment.doseValue, language, 2),
          unit: tu(`units.${unit}`),
        })
      : band.withhold === undefined
        ? doseEvery(
            tu,
            language,
            adjustment.status === 'applied' ? adjustment.doseValue : band.doseValue,
            unit,
            band.administrationsPerDay,
            band.intervalMin,
          )
        : tu(`calculator.doses.renal.withhold.${band.withhold}`)
  const key =
    adjustment.status === 'withheld'
      ? 'withheld'
      : off
        ? band.withhold === undefined
          ? 'off'
          : 'withheldOff'
        : 'applied'
  return (
    <Stack gap={2} mt={4}>
      <Text size="xs" c={off || adjustment.status === 'withheld' ? 'red' : 'blue.8'} fw={500}>
        {tu(`calculator.doses.renal.${key}`, {
          crcl: formatNumber(adjustment.clearanceMlMin, language, 0),
          min: band.minMlMin,
          max: band.maxMlMin,
          corrected,
          protocol,
        })}
      </Text>
      {/* A range rather than one dose: said out loud, with the switch between its ends. */}
      {band.withhold === undefined && band.doseRange && !off && (
        <>
          <Text size="xs" c="orange.9" fw={500}>
            {t('calculator.doses.renal.range', {
              min: formatNumber(band.doseRange.min, language, 2),
              max: formatNumber(band.doseRange.max, language, 2),
              dayMin: formatNumber(band.doseRange.min * band.administrationsPerDay, language, 2),
              dayMax: formatNumber(band.doseRange.max * band.administrationsPerDay, language, 2),
              unit: tu(`units.${unit}`),
            })}
          </Text>
          <SegmentedControl
            size="xs"
            disabled={disabled}
            value={rangeLevel(
              band.doseRange,
              adjustment.status === 'applied' ? adjustment.doseValue : band.doseValue,
            )}
            onChange={(value) => onLevel(value as RenalBandLevel)}
            data={RANGE_LEVELS.map((level) => ({
              value: level,
              label: t(`calculator.doses.renal.level.${level}`, {
                dose: formatNumber(renalBandDose(band.doseRange!, level), language, 2),
              }),
            }))}
            aria-label={`${t('calculator.doses.renal.rangeLabel')}: ${localize(item.drug.name, language)}`}
          />
        </>
      )}
      {/* The lower daily dose cannot always be made from the forms on hand: the full dose every
          other day is offered as the alternative, the physician's to choose. */}
      {band.withhold === undefined && band.everyOtherDayFull && !off && (
        <>
          <SegmentedControl
            size="xs"
            disabled={disabled}
            value={
              adjustment.status === 'applied' && adjustment.everyOtherDay ? 'everyOther' : 'daily'
            }
            onChange={(value) => onEveryOtherDay(value === 'everyOther')}
            data={[
              {
                value: 'daily',
                label: t('calculator.doses.renal.everyOtherDay.daily', {
                  dose: formatNumber(band.doseValue, language, 2),
                  unit: tu(`units.${unit}`),
                }),
              },
              {
                value: 'everyOther',
                label: t('calculator.doses.renal.everyOtherDay.everyOther', {
                  dose: formatNumber(item.item.dose_value, language, 2),
                  unit: tu(`units.${unit}`),
                }),
              },
            ]}
            aria-label={`${t('calculator.doses.renal.everyOtherDay.label')}: ${localize(item.drug.name, language)}`}
          />
          <Text size="xs" c="orange.9">
            {t('calculator.doses.renal.everyOtherDay.note')}
          </Text>
        </>
      )}
      {row?.notes && (
        <Text size="xs" c={band.withhold === undefined && band.doseRange ? 'orange.9' : 'dimmed'}>
          {localize(row.notes, language)}
        </Text>
      )}
      <Checkbox
        size="xs"
        disabled={disabled}
        checked={off}
        onChange={(event) => onOff(event.currentTarget.checked)}
        label={t('calculator.doses.renal.keepProtocol')}
      />
    </Stack>
  )
}

/**
 * The rising rate of an antibody: which infusion of the drug this course opens with (the
 * physician switches it; untouched, cycle 1 opens with the first), and under it each dose of the
 * row with the steps and the time it runs at.
 */
function RampInfo({
  params,
  durations,
  kinds,
  start,
  disabled,
  onStart,
}: {
  params: DrugInfusionParams
  durations: RampDurations
  kinds: Record<number, RampKind>
  start: number
  disabled: boolean
  onStart: (start: number) => void
}) {
  const { t } = useTranslation()
  const tu = t as unknown as DynamicTranslate
  const hasSecond = params.ramp_sequence?.second != null
  // Days of the row run together while their kind stays the same: «Дні 15, 22 — наступні».
  const groups: { kind: RampKind; days: number[] }[] = []
  for (const [day, kind] of Object.entries(kinds)
    .map(([day, kind]) => [Number(day), kind] as const)
    .sort((a, b) => a[0] - b[0])) {
    const last = groups.at(-1)
    if (last && last.kind === kind) last.days.push(day)
    else groups.push({ kind, days: [day] })
  }
  const options = [
    { value: '1', label: t('calculator.doses.rampStart.first') },
    ...(hasSecond ? [{ value: '2', label: t('calculator.doses.rampStart.second') }] : []),
    { value: '3', label: t('calculator.doses.rampStart.later') },
  ]
  return (
    <Stack gap={2}>
      <Text size="xs" fw={500}>
        {t('calculator.doses.rampOpens')}
      </Text>
      <SegmentedControl
        size="xs"
        disabled={disabled}
        value={String(!hasSecond && start === 2 ? 3 : Math.min(start, 3))}
        onChange={(value) => onStart(Number(value))}
        data={options}
      />
      {groups.map(({ kind, days }) => {
        const steps = rampStepsFor(params, kind)
        if (!steps) return null
        const whole = kind === 'first' ? durations.firstWhole : null
        return (
          <Text key={days.join()} size="xs" c={kind.startsWith('first') ? 'orange.8' : 'dimmed'}>
            {t('calculator.doses.rampLine', {
              days: t('calculator.doses.rampDays', { count: days.length, list: days.join(', ') }),
              kind: tu(`calculator.doses.rampKind.${kind}`),
              start: steps.start_ml_h,
              step: steps.step_ml_h,
              every: steps.every_min,
              max: steps.max_ml_h,
              minutes: rampDurationMin(durations, kind),
            })}
            {whole && ` ${t('calculator.doses.rampWholeBag', { bag: whole.bagVolumeMl })}`}
          </Text>
        )
      })}
    </Stack>
  )
}

/** Value of the "typed by hand" entry in the dose-source list; not a real choice id. */
const MANUAL_CHOICE = '__manual__'

/** Doses on both BSA variants, with vials, dilution, the calculation chain and warnings. */
export function DoseTable(props: DoseTableProps) {
  const { t } = useTranslation()
  const { items, course } = props
  const [expanded, setExpanded] = useState<string | null>(null)
  // A phone gets the rows as cards (DoseTable.module.css), not a table scrolled sideways.
  const narrow = useMediaQuery('(max-width: 47.99em)')
  const resultById = new Map((course?.drugs ?? []).map((drug) => [drug.id, drug]))

  if (items.length === 0) {
    return (
      <Card withBorder component="section">
        <Title order={2} size="h4">
          {t('calculator.doses.title')}
        </Title>
        <Text c="dimmed">{t('calculator.doses.empty')}</Text>
      </Card>
    )
  }

  return (
    <Card withBorder component="section" p={0}>
      <Box p="md" pb="xs">
        <Title order={2} size="h4">
          {t('calculator.doses.title')}
        </Title>
      </Box>
      <Table.ScrollContainer minWidth={narrow ? 0 : 760}>
        <Table
          verticalSpacing="xs"
          highlightOnHover
          aria-label={t('calculator.doses.title')}
          className={classes.table}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={52}>{t('calculator.doses.enabled')}</Table.Th>
              <Table.Th>{t('calculator.doses.drug')}</Table.Th>
              <Table.Th>{t('calculator.doses.scheme')}</Table.Th>
              <Table.Th>
                {t(
                  course?.bsa?.entered
                    ? 'calculator.doses.doseEntered'
                    : props.bsaVariant === 'capped'
                      ? 'calculator.doses.doseCapped'
                      : 'calculator.doses.doseActual',
                )}
                {course?.bsa && (
                  <Text span size="xs" c="dimmed" fw={400}>
                    {' '}
                    {formatNumber(
                      props.bsaVariant === 'capped' ? course.bsa.cappedM2 : course.bsa.actualM2,
                      currentLanguage(),
                      2,
                    )}{' '}
                    {t('units.m2')}
                  </Text>
                )}
              </Table.Th>
              <Table.Th w={110}>{t('calculator.doses.reduction')}</Table.Th>
              <Table.Th w={120}>{t('calculator.doses.manualDose')}</Table.Th>
              <Table.Th>{t('calculator.doses.units')}</Table.Th>
              <Table.Th>{t('calculator.doses.infusion')}</Table.Th>
              <Table.Th w={44} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {groupCourseItems(items).map((group) => (
              <Fragment key={group.key}>
                <Table.Tr bg="var(--mantine-color-default-hover)">
                  <Table.Td colSpan={9} py={6}>
                    <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                      {t(`calculator.doses.block.${group.kind}`)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
                {group.items.map((item) => (
                  <DoseRow
                    key={item.item.id}
                    item={item}
                    result={resultById.get(item.item.id)}
                    expanded={expanded === item.item.id}
                    onExpand={() => setExpanded(expanded === item.item.id ? null : item.item.id)}
                    {...props}
                  />
                ))}
              </Fragment>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  )
}

function DoseRow({
  item,
  result,
  expanded,
  onExpand,
  disabledIds,
  drugPercent,
  doseOverrideAmount,
  onToggle,
  onReduction,
  onDoseOverride,
  onDoseChoice,
  administrationModes,
  onAdministrationMode,
  onDoseModifiers,
  onBagChoice,
  chosenDurations,
  onDurationChoice,
  renalBandOffIds,
  onRenalBandOff,
  onRenalBandLevel,
  onRenalBandEveryOtherDay,
  onRemove,
  customIds,
  bsaVariant,
  premedicationMissing,
  mesnaOffered,
  mesnaAdded,
  onMesna,
  ivigSupportAdded,
  onIvigSupport,
  onIvigSupportEdit,
  onRoute,
  sheetChoices,
  onSheet,
  cycleNumber,
  infusionStart,
  onInfusionStart,
  course,
}: DoseTableProps & {
  item: CourseItem
  result: CourseDrugResult | undefined
  expanded: boolean
  onExpand: () => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const id = item.item.id
  const enabled = !disabledIds.includes(id)
  const manualAmount = doseOverrideAmount[id]
  const chosen =
    item.doseChoices.find((choice) => choice.id === item.doseChoiceId) ?? item.doseChoices[0]!
  const reduced = drugPercent[id] !== undefined
  // The drug's own organ-function rules fired: this is the drug that may need reducing.
  const suggested = result?.warnings.some((warning) => warning.code.startsWith('review.')) ?? false
  const tu = t as unknown as DynamicTranslate
  const unit = amountUnitOf(chosen.doseUnit)
  const unitName = tu(`units.${unit}`)
  const amount = (value: number) => `${formatNumber(value, language, 2)} ${unitName}`

  return (
    <>
      <Table.Tr opacity={enabled ? 1 : 0.55}>
        <Table.Td>
          <Switch
            checked={enabled}
            onChange={(event) => onToggle(id, event.currentTarget.checked)}
            aria-label={`${t('calculator.doses.enabled')}: ${localize(item.drug.name, language)}`}
          />
        </Table.Td>
        <Table.Td>
          <Text fw={500}>{localize(item.drug.name, language)}</Text>
          <Text size="xs" c="dimmed">
            {item.routeChoices.length === 0 && t(`route.${item.item.route}`)}
            {item.routeChoices.length === 0 && item.item.role !== 'main' && ' · '}
            {item.item.role !== 'main' && t(`role.${item.item.role}`)}
            {customIds.includes(id) && ` · ${t('calculator.doses.custom')}`}
          </Text>
          {/* Another route the label allows at the same dose: the regimen's own is the default,
              and a switch is marked, since the sheet then says something the protocol did not. */}
          {item.routeChoices.length > 0 && (
            <Group gap={6} mt={2} wrap="nowrap">
              <SegmentedControl
                size="xs"
                disabled={!enabled}
                value={item.item.route}
                onChange={(value) => onRoute(id, value as CourseItem['item']['route'])}
                data={item.routeChoices.map((route) => ({
                  value: route,
                  label: t(`route.${route}`),
                }))}
                aria-label={`${t('calculator.doses.route')}: ${localize(item.drug.name, language)}`}
              />
              {item.item.route !== item.protocolRoute && (
                <Badge size="xs" variant="light" color="blue">
                  {t('calculator.doses.routeChanged')}
                </Badge>
              )}
            </Group>
          )}
          {/* Which sheet the row is printed on. A single injection or a plain push does not call
              for a whole hourly sheet: written into the inpatient list it takes a line there. */}
          <Group gap={6} mt={2} wrap="nowrap">
            <SegmentedControl
              size="xs"
              disabled={!enabled}
              value={item.item.block === 'ward' ? 'ward' : 'infusion'}
              onChange={(value) => onSheet(id, value as SheetChoice)}
              data={[
                { value: 'infusion', label: t('calculator.doses.sheet.infusion') },
                { value: 'ward', label: t('calculator.doses.sheet.ward') },
              ]}
              aria-label={`${t('calculator.doses.sheet.label')}: ${localize(item.drug.name, language)}`}
            />
            {id in sheetChoices && (
              <Badge size="xs" variant="light" color="blue">
                {t('calculator.doses.sheet.changed')}
              </Badge>
            )}
          </Group>
          {/* The label asks for premedication before this drug: always in sight, and loud when
              the course has none on one of its days. */}
          {item.item.role === 'main' && PREMEDICATION_ADVISED.has(item.item.drug_id) && (
            <Badge
              size="xs"
              mt={2}
              variant={premedicationMissing.has(id) ? 'filled' : 'light'}
              color={premedicationMissing.has(id) ? 'red' : 'orange'}
            >
              {premedicationMissing.has(id)
                ? t('calculator.doses.premedMissing', {
                    days: premedicationMissing.get(id)!.join(', '),
                  })
                : t('calculator.doses.premedBadge')}
            </Badge>
          )}
          {/* A high cyclophosphamide dose the protocol gives without mesna: the prophylaxis is
              one click away, not added behind the physician's back. */}
          {mesnaOffered.includes(id) && (
            <Group gap={6} mt={2} wrap="nowrap">
              <Badge size="xs" variant="light" color="grape">
                {t('calculator.doses.cystitisBadge')}
              </Badge>
              <Button
                size="compact-xs"
                variant={mesnaAdded.includes(id) ? 'subtle' : 'light'}
                disabled={!enabled}
                onClick={() => onMesna(id, !mesnaAdded.includes(id))}
              >
                {t(
                  mesnaAdded.includes(id)
                    ? 'calculator.doses.mesnaRemove'
                    : 'calculator.doses.mesnaAdd',
                )}
              </Button>
            </Group>
          )}
          {/* Immunoglobulin: the department's standard support, written out as lines above it
              that a colleague edits as text, or one click away when it was removed. */}
          {item.item.drug_id === IVIG_DRUG_ID && item.item.role === 'main' && (
            <Stack gap={2} mt={4}>
              <Group gap={6} wrap="nowrap">
                <Badge size="xs" variant="light" color="teal">
                  {t('calculator.doses.ivigSupport')}
                </Badge>
                {ivigSupportAdded.includes(id) && (
                  <Button size="compact-xs" variant="light" onClick={onIvigSupportEdit}>
                    {t('calculator.doses.ivigSupportEdit')}
                  </Button>
                )}
                <Button
                  size="compact-xs"
                  variant={ivigSupportAdded.includes(id) ? 'subtle' : 'light'}
                  disabled={!enabled}
                  onClick={() => onIvigSupport(id, !ivigSupportAdded.includes(id))}
                >
                  {t(
                    ivigSupportAdded.includes(id)
                      ? 'calculator.doses.ivigSupportRemove'
                      : 'calculator.doses.ivigSupportAdd',
                  )}
                </Button>
              </Group>
              <Text size="xs" c="dimmed">
                {t(
                  ivigSupportAdded.includes(id)
                    ? 'calculator.doses.ivigSupportOn'
                    : 'calculator.doses.ivigSupportOff',
                )}
              </Text>
            </Stack>
          )}
          {/* What to watch while the drug is given, folded: a reminder, not a dose change. */}
          {item.drug.monitoring && item.drug.monitoring.length > 0 && (
            <details>
              <summary>
                <Text size="xs" c="blue" component="span">
                  {t('calculator.doses.monitoring')}
                </Text>
              </summary>
              <Stack gap={2} mt={2}>
                {item.drug.monitoring.map((line, index) => (
                  <Text key={index} size="xs" c="dimmed" title={line.source.name}>
                    • {localize(line.notes, language)}
                  </Text>
                ))}
              </Stack>
            </details>
          )}
          {/* A drug the department cannot simply take off the shelf. The badge in the regimen
              list says only that something in the course is missing; here it is clear which
              drug, and the drug's own note says why — most often that it is not registered. */}
          {item.drug.availability !== 'department' && (
            <Text size="xs" c={item.drug.availability === 'unavailable' ? 'red' : 'yellow.8'}>
              {t(`availability.${item.drug.availability}`)}
              {item.drug.notes !== null && `. ${localize(item.drug.notes, language)}`}
            </Text>
          )}
        </Table.Td>
        <Table.Td>
          <Text>
            {formatNumber(chosen.doseValue, language, 2)} {tu(`units.${chosen.doseUnit}`)}
          </Text>
          <Text size="xs" c="dimmed">
            {t('calculator.doses.days')}: {item.item.days.join(', ')}
            {(result?.administrationsPerDay ?? item.item.administrations_per_day) > 1 &&
              ` · ${t('calculator.doses.timesPerDay', { count: result?.administrationsPerDay ?? item.item.administrations_per_day })}`}
          </Text>
          {/* The first, full dose the label keeps uncorrected, split off its corrected row. */}
          {item.firstDoseOf !== undefined && (
            <Text size="xs" c="orange.8">
              {t('calculator.doses.renal.firstDose')}
            </Text>
          )}
          {course?.renal[id] && (
            <RenalBandInfo
              adjustment={course.renal[id]}
              item={item}
              off={renalBandOffIds.includes(id)}
              disabled={!enabled}
              onOff={(off) => onRenalBandOff(id, off)}
              onLevel={(level) => onRenalBandLevel(id, level)}
              onEveryOtherDay={(on) => onRenalBandEveryOtherDay(id, on)}
            />
          )}
          {item.doseChoices.length > 1 && (
            <Select
              size="xs"
              mt={4}
              allowDeselect={false}
              disabled={!enabled}
              data={[
                ...item.doseChoices.map((choice) => ({
                  value: choice.id,
                  // One protocol often writes several doses — a phase of the disease, a platelet
                  // count. Then its note is what tells them apart, not its name.
                  label:
                    (choice.note ? localize(choice.note, language) : null) ||
                    choice.label ||
                    (choice.id === DEFAULT_DOSE_CHOICE
                      ? t('calculator.doses.doseSourceRegimen')
                      : choice.id),
                })),
                { value: MANUAL_CHOICE, label: t('calculator.doses.doseSourceManual') },
              ]}
              value={manualAmount === undefined ? item.doseChoiceId : MANUAL_CHOICE}
              onChange={(value) => {
                if (value === null) return
                if (value === MANUAL_CHOICE) onDoseOverride(id, result?.doseAmount ?? null)
                else {
                  onDoseOverride(id, null)
                  onDoseChoice(id, value)
                }
              }}
              aria-label={`${t('calculator.doses.doseSource')}: ${localize(item.drug.name, language)}`}
            />
          )}
          {item.switchable && (
            <AdministrationModeControl
              drugName={localize(item.drug.name, language)}
              mode={administrationModes[id] ?? PROTOCOL_MODE}
              disabled={!enabled}
              onChange={(mode) => onAdministrationMode(id, mode)}
            />
          )}
          {item.infusionSwitchable && (
            <InfusionLengthControl
              drugName={localize(item.drug.name, language)}
              protocol={item.protocolInfusion}
              mode={administrationModes[id] ?? PROTOCOL_MODE}
              disabled={!enabled}
              onChange={(mode) => onAdministrationMode(id, mode)}
            />
          )}
          {item.doseModifiers.length > 0 && (
            // Several circumstances can hold at once — an interaction and an organ — and two of
            // them may well land on the same milligrams, so these are ticks, not a list to pick from.
            <Checkbox.Group
              mt={6}
              label={t('calculator.doses.modifiers')}
              description={t('calculator.doses.modifiersHint')}
              value={item.activeModifierKeys}
              onChange={(keys) => onDoseModifiers(id, keys)}
            >
              <Stack gap={2} mt={2}>
                {item.doseModifiers.map((modifier) => (
                  <Checkbox
                    key={modifier.key}
                    value={modifier.key}
                    disabled={!enabled || manualAmount !== undefined}
                    size="xs"
                    label={
                      <Text size="xs">
                        {localize(modifier.label, language)}
                        <Text span c="dimmed">
                          {' '}
                          — {formatNumber(modifier.dose_value, language, 2)}{' '}
                          {tu(`units.${item.item.dose_unit}`)}
                        </Text>
                      </Text>
                    }
                  />
                ))}
              </Stack>
            </Checkbox.Group>
          )}
        </Table.Td>
        <Table.Td data-label={t('calculator.doses.doseActual')}>
          {result ? (
            <>
              <Group gap={6} wrap="nowrap">
                <Text fw={600}>
                  {amount(
                    manualAmount === undefined
                      ? result.rounded[bsaVariant].roundedAmount
                      : manualAmount,
                  )}
                </Text>
                {manualAmount !== undefined && (
                  <Badge size="xs" variant="light" color="blue">
                    {t('calculator.doses.manualDoseBadge')}
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                {t('calculator.doses.unrounded', {
                  value: formatNumber(result.rounded[bsaVariant].unroundedAmount, language, 2),
                  unit: unitName,
                })}
              </Text>
              {/* The two BSA variants used to be two columns; the one not chosen is still here,
                  under the dose, whenever it would give a different number. */}
              {result.variants.differs && manualAmount === undefined && (
                <Text size="xs" c="orange.8">
                  {t('calculator.doses.otherVariant', {
                    variant: t(
                      bsaVariant === 'capped'
                        ? 'calculator.doses.variantActual'
                        : 'calculator.doses.variantCapped',
                    ),
                    value: amount(
                      result.rounded[bsaVariant === 'capped' ? 'actual' : 'capped'].roundedAmount,
                    ),
                  })}
                </Text>
              )}
            </>
          ) : (
            <Text c="dimmed">—</Text>
          )}
        </Table.Td>
        <Table.Td data-label={t('calculator.doses.reduction')}>
          <Stack gap={4}>
            <Checkbox
              size="xs"
              disabled={!enabled}
              checked={reduced}
              label={
                suggested ? (
                  <Text size="xs" c="orange.7">
                    {t('calculator.doses.reductionSuggested')}
                  </Text>
                ) : (
                  <Text size="xs" c="dimmed">
                    {t('calculator.doses.reductionNeeded')}
                  </Text>
                )
              }
              onChange={(event) => onReduction(id, event.currentTarget.checked ? 0 : null)}
              aria-label={`${t('calculator.doses.reductionNeeded')}: ${localize(item.drug.name, language)}`}
            />
            {reduced && (
              <NumberInput
                size="xs"
                min={0}
                max={100}
                disabled={!enabled}
                value={drugPercent[id] ?? 0}
                onChange={(value) => onReduction(id, Number(value) || 0)}
                aria-label={`${t('calculator.doses.reduction')}: ${localize(item.drug.name, language)}`}
              />
            )}
          </Stack>
        </Table.Td>
        <Table.Td data-label={t('calculator.doses.manualDose')}>
          <NumberInput
            size="xs"
            min={0}
            step={isMassUnit(unit) ? 0.5 : 1}
            disabled={!enabled}
            value={manualAmount ?? ''}
            placeholder={
              result
                ? formatNumber(result.rounded[bsaVariant].roundedAmount, language, 2)
                : undefined
            }
            onChange={(value) => onDoseOverride(id, Number(value) > 0 ? Number(value) : null)}
            aria-label={`${t('calculator.doses.manualDose')}: ${localize(item.drug.name, language)}`}
          />
        </Table.Td>
        <Table.Td data-label={t('calculator.doses.units')}>
          {result?.pack ? (
            <Stack gap={2}>
              {result.pack.items.map((entry) => (
                <Text key={entry.presentation.id} size="sm">
                  {t('calculator.doses.unitsValue', {
                    count: entry.count,
                    strength: formatNumber(entry.presentation.strengthAmount, language, 2),
                    unit: unitName,
                  })}
                </Text>
              ))}
              <Text size="xs" c="dimmed">
                {t('calculator.doses.waste', {
                  value: formatNumber(result.pack.wasteAmount, language, 1),
                  unit: unitName,
                })}
              </Text>
            </Stack>
          ) : result ? (
            <Text size="sm" c="dimmed">
              {t('calculator.doses.noPresentations')}
            </Text>
          ) : (
            <Text size="sm" c="dimmed">
              —
            </Text>
          )}
        </Table.Td>
        <Table.Td data-label={t('calculator.doses.infusion')}>
          {result?.infusion ? (
            <Stack gap={2}>
              <Text size="sm">
                {result.infusion.bagVolumeMl === 0
                  ? t('calculator.doses.infusionUndiluted', {
                      total: formatNumber(result.infusion.totalVolumeMl, language, 1),
                    })
                  : t('calculator.doses.infusionValue', {
                      solvent: t(`solvent.${solventOf(item)}`),
                      bag: formatNumber(result.infusion.bagVolumeMl, language, 0),
                      total: formatNumber(result.infusion.totalVolumeMl, language, 1),
                      concentration: formatNumber(result.infusion.concentrationPerMl, language, 2),
                      unit: tu(`units.${result.infusion.concentrationUnit}_ml`),
                    })}
              </Text>
              {item.bagSwitchable && result.infusion.bagOptions.length > 1 && (
                <BagVolumeControl
                  drugName={localize(item.drug.name, language)}
                  options={result.infusion.bagOptions}
                  limits={item.infusionParams}
                  {...(isContinuousDoxorubicin(item.item)
                    ? { hint: t('calculator.doses.continuousDoxorubicinBag') }
                    : {})}
                  value={result.infusion.bagVolumeMl}
                  unit={tu(`units.${result.infusion.concentrationUnit}_ml`)}
                  disabled={!enabled}
                  onChange={(bag) => onBagChoice(id, bag)}
                />
              )}
              {item.durationOptions.length > 0 && result.infusion.durationMin !== null && (
                <DurationControl
                  drugName={localize(item.drug.name, language)}
                  options={item.durationOptions}
                  chosen={chosenDurations[id] ?? null}
                  protocolMin={item.protocolDurationMin}
                  actualMin={result.infusion.durationMin}
                  minDurationMin={item.minDurationMin}
                  maxRateMgMin={item.infusionParams?.max_rate_mg_min ?? null}
                  disabled={!enabled}
                  onChange={(minutes) => onDurationChoice(id, minutes)}
                />
              )}
              {result.infusion.ramp && item.infusionParams?.rate_ramp && (
                <RampInfo
                  params={item.infusionParams}
                  durations={result.infusion.ramp}
                  kinds={course?.rampKinds[id] ?? {}}
                  start={infusionStart[item.item.drug_id] ?? defaultInfusionStart(cycleNumber)}
                  disabled={!enabled}
                  onStart={(start) => onInfusionStart(item.item.drug_id, start)}
                />
              )}
              {result.infusion.rateMlH !== null && result.infusion.rateGttMin !== null && (
                <Text size="xs" c="dimmed">
                  {t('calculator.doses.infusionRate', {
                    rate: formatNumber(result.infusion.rateMlH, language, 1),
                    drops: formatNumber(result.infusion.rateGttMin, language, 0),
                  })}
                </Text>
              )}
            </Stack>
          ) : result && item.missingInfusionData ? (
            <Badge color="yellow" variant="light">
              {t('calculator.doses.infusionMissing')}
            </Badge>
          ) : (
            <Text size="sm" c="dimmed">
              —
            </Text>
          )}
        </Table.Td>
        <Table.Td>
          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="subtle"
              aria-label={t('calculator.doses.chain')}
              onClick={onExpand}
            >
              {expanded ? '−' : '+'}
            </ActionIcon>
            {customIds.includes(id) && (
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={t('calculator.doses.remove')}
                onClick={() => onRemove(id)}
              >
                ×
              </ActionIcon>
            )}
          </Group>
        </Table.Td>
      </Table.Tr>
      <Table.Tr>
        <Table.Td colSpan={9} p={0} style={{ border: expanded ? undefined : 'none' }}>
          <Collapse expanded={expanded}>
            <Stack gap="xs" p="md">
              {result && (
                <>
                  <Text size="sm" fw={500}>
                    {t('calculator.doses.chain')}
                  </Text>
                  <CalculationChain steps={result.steps} />
                  <WarningList warnings={result.warnings} compact />
                </>
              )}
              <SourceNotes
                sources={[
                  ...(chosen.source ? [chosen.source] : []),
                  ...item.drug.sources,
                  ...(item.infusionParams?.sources ?? []),
                ]}
              />
            </Stack>
          </Collapse>
        </Table.Td>
      </Table.Tr>
    </>
  )
}

/**
 * The bags the label allows for an antimicrobial, each with the concentration the dose gives in
 * it. A bag that would take the concentration out of the label's range cannot be picked.
 */
function BagVolumeControl({
  drugName,
  options,
  limits,
  hint,
  value,
  unit,
  disabled,
  onChange,
}: {
  drugName: string
  options: BagOption[]
  limits: DrugInfusionParams | null
  /** Said in place of the label's concentration range. */
  hint?: string
  value: number
  unit: string
  disabled: boolean
  onChange: (bagVolumeMl: number) => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  return (
    <Stack gap={4} mt={4}>
      <Text size="xs" c="dimmed">
        {t('calculator.doses.bagVolume')}
      </Text>
      <SegmentedControl
        size="xs"
        disabled={disabled}
        data={options.map((option) => ({
          value: String(option.bagVolumeMl),
          disabled: !option.fits,
          label: (
            <span
              title={
                option.fits
                  ? `${formatNumber(option.concentrationPerMl, language, 2)} ${unit}`
                  : t('calculator.doses.bagOutOfRange', {
                      concentration: formatNumber(option.concentrationPerMl, language, 2),
                      unit,
                    })
              }
            >
              {t('calculator.doses.bagOption', { bag: option.bagVolumeMl })}
            </span>
          ),
        }))}
        value={String(value)}
        onChange={(bag) => onChange(Number(bag))}
        aria-label={`${t('calculator.doses.bagVolume')}: ${drugName}`}
      />
      <Text size="xs" c="dimmed">
        {hint ?? concentrationHint(t as unknown as DynamicTranslate, language, limits)}
      </Text>
    </Stack>
  )
}

type Translate = DynamicTranslate

/** The label's concentration range in words: "1–20 mg/mL", "up to 5 mg/mL", "from 0.5 mg/mL". */
function concentrationHint(
  t: Translate,
  language: ReturnType<typeof currentLanguage>,
  limits: DrugInfusionParams | null,
): string {
  const min = limits?.concentration_min_mg_ml ?? null
  const max = limits?.concentration_max_mg_ml ?? null
  const value = (n: number) => formatNumber(n, language, 2)
  if (min !== null && max !== null) {
    return t('calculator.doses.concentrationRange', { min: value(min), max: value(max) })
  }
  if (max !== null) return t('calculator.doses.concentrationMax', { max: value(max) })
  if (min !== null) return t('calculator.doses.concentrationMin', { min: value(min) })
  return t('calculator.doses.concentrationNone')
}

/** Minutes in words: 30 min, 3 h, 1 h 30 min. */
function durationLabel(t: Translate, minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return t('calculator.doses.durationMinutes', { minutes })
  if (rest === 0) return t('calculator.doses.durationHours', { hours })
  return t('calculator.doses.durationHoursMinutes', { hours, minutes: rest })
}

/**
 * How long an antimicrobial runs: the durations the sources recommend, or another one typed in.
 * The rate follows from it; a typed duration never goes below the label's shortest, and a dose too
 * large for the drug's fastest pace still runs longer, as the calculation shows.
 */
function DurationControl({
  drugName,
  options,
  chosen,
  protocolMin,
  actualMin,
  minDurationMin,
  maxRateMgMin,
  disabled,
  onChange,
}: {
  drugName: string
  options: DurationOption[]
  chosen: number | null
  protocolMin: number | null
  actualMin: number
  minDurationMin: number | null
  maxRateMgMin: number | null
  disabled: boolean
  onChange: (durationMin: number | null) => void
}) {
  const { t: translate } = useTranslation()
  const t = translate as unknown as DynamicTranslate
  const current = chosen ?? protocolMin
  const standard = options.filter((option) => !option.extended)
  const extended = options.filter((option) => option.extended)
  const list = (entries: DurationOption[]) =>
    entries.map((option) => durationLabel(t, option.durationMin)).join(', ')
  const hint = [
    standard.length > 0 && t('calculator.doses.durationStandard', { list: list(standard) }),
    extended.length > 0 && t('calculator.doses.durationExtended', { list: list(extended) }),
    minDurationMin !== null &&
      t('calculator.doses.durationShortest', { duration: durationLabel(t, minDurationMin) }),
    maxRateMgMin !== null && t('calculator.doses.durationMaxRate', { rate: maxRateMgMin }),
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <Stack gap={4} mt={4}>
      <Text size="xs" c="dimmed">
        {t('calculator.doses.duration')}
      </Text>
      <Group gap={6} wrap="wrap" align="center">
        <SegmentedControl
          size="xs"
          disabled={disabled}
          data={options.map((option) => ({
            value: String(option.durationMin),
            label: durationLabel(t, option.durationMin),
          }))}
          value={options.some((option) => option.durationMin === current) ? String(current) : ''}
          onChange={(value) => {
            const minutes = Number(value)
            onChange(minutes === protocolMin ? null : minutes)
          }}
          aria-label={`${t('calculator.doses.duration')}: ${drugName}`}
        />
        <NumberInput
          size="xs"
          w={110}
          disabled={disabled}
          min={minDurationMin ?? 1}
          max={1440}
          step={5}
          allowDecimal={false}
          clampBehavior="blur"
          suffix={` ${t('calculator.doses.durationMinUnit')}`}
          value={current ?? ''}
          onChange={(value) => {
            if (typeof value !== 'number' || value <= 0) return
            onChange(value === protocolMin ? null : value)
          }}
          aria-label={`${t('calculator.doses.durationCustom')}: ${drugName}`}
        />
      </Group>
      {current !== null && actualMin > current && (
        <Text size="xs" c="orange">
          {t('calculator.doses.durationStretched', { duration: durationLabel(t, actualMin) })}
        </Text>
      )}
      <Text size="xs" c="dimmed">
        {hint}
      </Text>
    </Stack>
  )
}

/** Short infusion each day or a 24-hour one; the protocol's own choice is the unchanged row. */
function InfusionLengthControl({
  drugName,
  protocol,
  mode,
  disabled,
  onChange,
}: {
  drugName: string
  protocol: InfusionLength
  mode: AdministrationMode
  disabled: boolean
  onChange: (mode: AdministrationMode) => void
}) {
  const { t } = useTranslation()
  const current: InfusionLength =
    mode.kind === 'short' || mode.kind === 'continuous' ? mode.kind : protocol
  return (
    <Stack gap={4} mt={6}>
      <Text size="xs" c="dimmed">
        {t('calculator.doses.infusionLength')}
      </Text>
      <SegmentedControl
        size="xs"
        disabled={disabled}
        data={[
          { value: 'short', label: t('calculator.doses.infusionShort') },
          { value: 'continuous', label: t('calculator.doses.infusionContinuous') },
        ]}
        value={current}
        onChange={(kind) =>
          onChange(kind === protocol ? PROTOCOL_MODE : { kind: kind as InfusionLength })
        }
        aria-label={`${t('calculator.doses.infusionLength')}: ${drugName}`}
      />
    </Stack>
  )
}

/** Switch between the protocol's schedule and separate boluses, with the numbers of the latter. */
function AdministrationModeControl({
  drugName,
  mode,
  disabled,
  onChange,
}: {
  drugName: string
  mode: AdministrationMode
  disabled: boolean
  onChange: (mode: AdministrationMode) => void
}) {
  const { t } = useTranslation()
  return (
    <Stack gap={4} mt={6}>
      <Text size="xs" c="dimmed">
        {t('calculator.doses.administrationMode')}
      </Text>
      <SegmentedControl
        size="xs"
        disabled={disabled}
        data={[
          { value: 'protocol', label: t('calculator.doses.modeProtocol') },
          { value: 'bolus', label: t('calculator.doses.modeBolus') },
        ]}
        value={mode.kind}
        onChange={(kind) => onChange(kind === 'bolus' ? defaultBolusMode() : PROTOCOL_MODE)}
        aria-label={`${t('calculator.doses.administrationMode')}: ${drugName}`}
      />
      {mode.kind === 'bolus' && (
        <>
          <Group gap="xs" wrap="nowrap">
            <NumberInput
              size="xs"
              w={90}
              min={2}
              max={12}
              allowDecimal={false}
              disabled={disabled}
              label={t('calculator.doses.bolusCount')}
              value={mode.count}
              onChange={(next) => {
                const count = Math.round(Number(next))
                if (Number.isFinite(count) && count >= 2) onChange({ ...mode, count })
              }}
            />
            <NumberInput
              size="xs"
              w={110}
              min={0.5}
              max={24}
              step={0.5}
              decimalScale={1}
              disabled={disabled}
              label={t('calculator.doses.bolusIntervalHours')}
              value={mode.intervalMin / 60}
              onChange={(next) => {
                const hours = Number(next)
                if (Number.isFinite(hours) && hours >= 0.5) {
                  onChange({ ...mode, intervalMin: Math.round(hours * 60) })
                }
              }}
            />
          </Group>
          <Text size="xs" c="dimmed">
            {t('calculator.doses.bolusHint')}
          </Text>
        </>
      )}
    </Stack>
  )
}
