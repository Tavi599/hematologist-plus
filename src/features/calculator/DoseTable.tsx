import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Collapse,
  Group,
  NumberInput,
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
import type { CourseItem } from '../../lib/course-input'
import { CalculationChain } from './CalculationChain'
import { WarningList } from './WarningList'

export interface DoseTableProps {
  items: CourseItem[]
  course: CourseResult
  disabledIds: string[]
  drugPercent: Record<string, number>
  onToggle: (itemId: string, enabled: boolean) => void
  onReduction: (itemId: string, percent: number) => void
  onRemove: (itemId: string) => void
  customIds: string[]
}

/** Doses on both BSA variants, with vials, dilution, the calculation chain and warnings. */
export function DoseTable(props: DoseTableProps) {
  const { t } = useTranslation()
  const { items, course } = props
  const [expanded, setExpanded] = useState<string | null>(null)
  const resultById = new Map(course.drugs.map((drug) => [drug.id, drug]))

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
      <Table.ScrollContainer minWidth={720}>
        <Table verticalSpacing="sm" highlightOnHover aria-label={t('calculator.doses.title')}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={52}>{t('calculator.doses.enabled')}</Table.Th>
              <Table.Th>{t('calculator.doses.drug')}</Table.Th>
              <Table.Th>{t('calculator.doses.scheme')}</Table.Th>
              <Table.Th>{t('calculator.doses.doseActual')}</Table.Th>
              <Table.Th>{t('calculator.doses.doseCapped')}</Table.Th>
              <Table.Th w={110}>{t('calculator.doses.reduction')}</Table.Th>
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
  onToggle,
  onReduction,
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
            {formatNumber(item.item.dose_value, language, 2)} {t(`units.${item.item.dose_unit}`)}
          </Text>
          <Text size="xs" c="dimmed">
            {t('calculator.doses.days')}: {item.item.days.join(', ')}
            {item.item.administrations_per_day > 1 &&
              ` · ${t('calculator.doses.timesPerDay', { count: item.item.administrations_per_day })}`}
          </Text>
        </Table.Td>
        <Table.Td>
          {result ? (
            <>
              <Text fw={600}>{mg(result.rounded.actual.roundedMg)}</Text>
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
              fw={result.variants.differs ? 600 : 400}
              c={result.variants.differs ? undefined : 'dimmed'}
            >
              {mg(result.rounded.capped.roundedMg)}
            </Text>
          ) : (
            <Text c="dimmed">—</Text>
          )}
        </Table.Td>
        <Table.Td>
          <NumberInput
            size="xs"
            min={0}
            max={100}
            disabled={!enabled}
            value={drugPercent[id] ?? ''}
            onChange={(value) => onReduction(id, Number(value) || 0)}
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
          ) : (
            <Text size="sm" c="dimmed">
              {t('calculator.doses.noPresentations')}
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
          ) : item.missingInfusionData ? (
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
              disabled={!result}
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
      {result && (
        <Table.Tr>
          <Table.Td colSpan={9} p={0} style={{ border: expanded ? undefined : 'none' }}>
            <Collapse expanded={expanded}>
              <Stack gap="xs" p="md">
                <Text size="sm" fw={500}>
                  {t('calculator.doses.chain')}
                </Text>
                <CalculationChain steps={result.steps} />
                <WarningList warnings={result.warnings} compact />
              </Stack>
            </Collapse>
          </Table.Td>
        </Table.Tr>
      )}
    </>
  )
}
