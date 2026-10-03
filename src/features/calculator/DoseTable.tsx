import {
  ActionIcon,
  Badge,
  Box,
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
import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CourseDrugResult, CourseResult } from '../../domain'
import { amountUnitOf, isMassUnit } from '../../domain'
import { formatNumber } from '../../lib/format'
import { currentLanguage, type DynamicTranslate } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import {
  DEFAULT_DOSE_CHOICE,
  defaultBolusMode,
  PROTOCOL_MODE,
  type AdministrationMode,
  type CourseItem,
} from '../../lib/course-input'
import { groupCourseItems } from '../../lib/dose-groups'
import { CalculationChain } from './CalculationChain'
import { SourceNotes } from './SourceNotes'
import { WarningList } from './WarningList'

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
  onRemove: (itemId: string) => void
  customIds: string[]
}

/** Value of the "typed by hand" entry in the dose-source list; not a real choice id. */
const MANUAL_CHOICE = '__manual__'

/** Doses on both BSA variants, with vials, dilution, the calculation chain and warnings. */
export function DoseTable(props: DoseTableProps) {
  const { t } = useTranslation()
  const { items, course } = props
  const [expanded, setExpanded] = useState<string | null>(null)
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
      <Table.ScrollContainer minWidth={840}>
        <Table verticalSpacing="sm" highlightOnHover aria-label={t('calculator.doses.title')}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={52}>{t('calculator.doses.enabled')}</Table.Th>
              <Table.Th>{t('calculator.doses.drug')}</Table.Th>
              <Table.Th>{t('calculator.doses.scheme')}</Table.Th>
              <Table.Th>
                {t(
                  course?.bsa.entered
                    ? 'calculator.doses.doseEntered'
                    : 'calculator.doses.doseActual',
                )}
              </Table.Th>
              <Table.Th>{t('calculator.doses.doseCapped')}</Table.Th>
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
                  <Table.Td colSpan={10} py={6}>
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
  onRemove,
  customIds,
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
  const amount = (value: number) => `${formatNumber(value, language, 1)} ${unitName}`

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
            {t(`route.${item.item.route}`)}
            {item.item.role !== 'main' && ` · ${t(`role.${item.item.role}`)}`}
            {customIds.includes(id) && ` · ${t('calculator.doses.custom')}`}
          </Text>
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
            {item.item.administrations_per_day > 1 &&
              ` · ${t('calculator.doses.timesPerDay', { count: item.item.administrations_per_day })}`}
          </Text>
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
        <Table.Td>
          {result ? (
            <>
              <Group gap={6} wrap="nowrap">
                <Text fw={600}>
                  {amount(
                    manualAmount === undefined ? result.rounded.actual.roundedAmount : manualAmount,
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
                  value: formatNumber(result.rounded.actual.unroundedAmount, language, 2),
                  unit: unitName,
                })}
              </Text>
            </>
          ) : (
            <Text c="dimmed">—</Text>
          )}
        </Table.Td>
        <Table.Td>
          {result ? (
            <Text
              fw={result.variants.differs && manualAmount === undefined ? 600 : 400}
              c={result.variants.differs && manualAmount === undefined ? undefined : 'dimmed'}
            >
              {amount(
                manualAmount === undefined ? result.rounded.capped.roundedAmount : manualAmount,
              )}
            </Text>
          ) : (
            <Text c="dimmed">—</Text>
          )}
        </Table.Td>
        <Table.Td>
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
        <Table.Td>
          <NumberInput
            size="xs"
            min={0}
            step={isMassUnit(unit) ? 0.5 : 1}
            disabled={!enabled}
            value={manualAmount ?? ''}
            placeholder={
              result ? formatNumber(result.rounded['actual'].roundedAmount, language, 1) : undefined
            }
            onChange={(value) => onDoseOverride(id, Number(value) > 0 ? Number(value) : null)}
            aria-label={`${t('calculator.doses.manualDose')}: ${localize(item.drug.name, language)}`}
          />
        </Table.Td>
        <Table.Td>
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
        <Table.Td>
          {result?.infusion ? (
            <Stack gap={2}>
              <Text size="sm">
                {t('calculator.doses.infusionValue', {
                  solvent: item.infusionParams
                    ? t(`solvent.${item.infusionParams.solvent}`)
                    : t('solvent.sodium_chloride_0_9'),
                  bag: formatNumber(result.infusion.bagVolumeMl, language, 0),
                  total: formatNumber(result.infusion.totalVolumeMl, language, 1),
                  concentration: formatNumber(result.infusion.concentrationPerMl, language, 2),
                  unit: tu(`units.${result.infusion.concentrationUnit}_ml`),
                })}
              </Text>
              {result.infusion.ramp && item.infusionParams?.rate_ramp && (
                <>
                  <Text size="xs" c="dimmed">
                    {t('calculator.doses.infusionRamp', {
                      start: item.infusionParams.rate_ramp.first.start_ml_h,
                      step: item.infusionParams.rate_ramp.first.step_ml_h,
                      every: item.infusionParams.rate_ramp.first.every_min,
                      max: item.infusionParams.rate_ramp.first.max_ml_h,
                    })}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('calculator.doses.infusionRampDuration', {
                      first: result.infusion.ramp.first.durationMin,
                      next: result.infusion.ramp.next.durationMin,
                    })}
                  </Text>
                </>
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
        <Table.Td colSpan={10} p={0} style={{ border: expanded ? undefined : 'none' }}>
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
