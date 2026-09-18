import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Checkbox,
  Collapse,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CourseDrugResult, CourseResult } from '../../domain'
import { formatNumber } from '../../lib/format'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import { DEFAULT_DOSE_CHOICE, type CourseItem } from '../../lib/course-input'
import { CalculationChain } from './CalculationChain'
import { SourceNotes } from './SourceNotes'
import { WarningList } from './WarningList'

export interface DoseTableProps {
  items: CourseItem[]
  /** null until the patient data is complete: the course is shown, the doses are not calculated. */
  course: CourseResult | null
  disabledIds: string[]
  drugPercent: Record<string, number>
  doseOverrideMg: Record<string, number>
  onToggle: (itemId: string, enabled: boolean) => void
  /** `null` switches the reduction off for this drug. */
  onReduction: (itemId: string, percent: number | null) => void
  onDoseOverride: (itemId: string, doseMg: number | null) => void
  onDoseChoice: (itemId: string, choiceId: string) => void
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
              <Table.Th>{t('calculator.doses.doseActual')}</Table.Th>
              <Table.Th>{t('calculator.doses.doseCapped')}</Table.Th>
              <Table.Th w={110}>{t('calculator.doses.reduction')}</Table.Th>
              <Table.Th w={120}>{t('calculator.doses.manualDose')}</Table.Th>
              <Table.Th>{t('calculator.doses.units')}</Table.Th>
              <Table.Th>{t('calculator.doses.infusion')}</Table.Th>
              <Table.Th w={44} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => (
              <DoseRow
                key={item.item.id}
                item={item}
                result={resultById.get(item.item.id)}
                expanded={expanded === item.item.id}
                onExpand={() => setExpanded(expanded === item.item.id ? null : item.item.id)}
                {...props}
              />
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
  doseOverrideMg,
  onToggle,
  onReduction,
  onDoseOverride,
  onDoseChoice,
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
  const manualMg = doseOverrideMg[id]
  const chosen =
    item.doseChoices.find((choice) => choice.id === item.doseChoiceId) ?? item.doseChoices[0]!
  const reduced = drugPercent[id] !== undefined
  // The drug's own organ-function rules fired: this is the drug that may need reducing.
  const suggested = result?.warnings.some((warning) => warning.code.startsWith('review.')) ?? false
  const mg = (value: number) => `${formatNumber(value, language, 1)} ${t('units.mg')}`

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
        </Table.Td>
        <Table.Td>
          <Text>
            {formatNumber(chosen.doseValue, language, 2)} {t(`units.${chosen.doseUnit}`)}
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
                  label:
                    choice.label ??
                    (choice.id === DEFAULT_DOSE_CHOICE
                      ? t('calculator.doses.doseSourceRegimen')
                      : choice.id),
                })),
                { value: MANUAL_CHOICE, label: t('calculator.doses.doseSourceManual') },
              ]}
              value={manualMg === undefined ? item.doseChoiceId : MANUAL_CHOICE}
              onChange={(value) => {
                if (value === null) return
                if (value === MANUAL_CHOICE) onDoseOverride(id, result?.doseMg ?? null)
                else {
                  onDoseOverride(id, null)
                  onDoseChoice(id, value)
                }
              }}
              aria-label={`${t('calculator.doses.doseSource')}: ${localize(item.drug.name, language)}`}
            />
          )}
        </Table.Td>
        <Table.Td>
          {result ? (
            <>
              <Group gap={6} wrap="nowrap">
                <Text fw={600}>
                  {mg(manualMg === undefined ? result.rounded.actual.roundedMg : manualMg)}
                </Text>
                {manualMg !== undefined && (
                  <Badge size="xs" variant="light" color="blue">
                    {t('calculator.doses.manualDoseBadge')}
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                {t('calculator.doses.unrounded', {
                  value: formatNumber(result.rounded.actual.unroundedMg, language, 2),
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
              fw={result.variants.differs && manualMg === undefined ? 600 : 400}
              c={result.variants.differs && manualMg === undefined ? undefined : 'dimmed'}
            >
              {mg(manualMg === undefined ? result.rounded.capped.roundedMg : manualMg)}
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
            step={0.5}
            disabled={!enabled}
            value={manualMg ?? ''}
            placeholder={
              result ? formatNumber(result.rounded['actual'].roundedMg, language, 1) : undefined
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
                    strength: formatNumber(entry.presentation.strengthMg, language, 2),
                  })}
                </Text>
              ))}
              <Text size="xs" c="dimmed">
                {t('calculator.doses.waste', {
                  value: formatNumber(result.pack.wasteMg, language, 1),
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
                  concentration: formatNumber(result.infusion.concentrationMgMl, language, 2),
                })}
              </Text>
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
