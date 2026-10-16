import {
  Checkbox,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { clockOfHour, SHEET_HOURS } from '../../lib/row-plan'
import { formatDays, parseDays } from './parse-days'
import {
  INFUSION_VOLUMES_ML,
  infusionWhat,
  isProportionalBag,
  KCL_STRENGTHS,
  kclPercent,
  solutionLine,
  SOLVENTS,
  STANDARD_INFUSION_RATE_ML_H,
  type InfusionTherapy,
  type KclChoice,
  type SolutionPlan,
  type Solvent,
} from './supportive-rows'

const SOLVENT_LABEL: Record<Solvent, string> = { nacl: 'NaCl 0,9%', glucose: 'Глюкоза 5%' }

/**
 * The standard infusion among the standard support: saline, 5% glucose or both, each bag with
 * potassium (4% by default, or 7.5%) and magnesium in proportion to it. A bag under 500 mL goes
 * without them. Given on the days of the cytostatics, before them, unless other days are typed.
 */
export function InfusionTherapyControls({
  value,
  onChange,
  chemoDays,
  dayStart,
}: {
  value: InfusionTherapy
  onChange: (value: InfusionTherapy) => void
  /** The days of the cytostatics: the infusion's days until others are typed. */
  chemoDays: number[]
  /** HH:MM: the hour the infusion is marked at until another is picked. */
  dayStart: string
}) {
  const { t } = useTranslation()
  const [typedDays, setTypedDays] = useState<string | null>(null)
  const parsedDays = typedDays === null ? null : parseDays(typedDays)
  const solution = (solvent: Solvent, patch: Partial<SolutionPlan>) =>
    onChange({ ...value, [solvent]: { ...value[solvent], ...patch } })
  const lines = SOLVENTS.filter((solvent) => value[solvent].on).map((solvent) =>
    infusionWhat(solutionLine(solvent, value[solvent])),
  )
  const startHour = Number(dayStart.split(':')[0]) || 0

  return (
    <Stack gap={4}>
      <Switch
        label={t('calculator.standardSupport.infusion.title')}
        description={
          lines.length > 0 ? lines.join('; ') : t('calculator.standardSupport.infusion.none')
        }
        checked={value.on}
        onChange={(event) => onChange({ ...value, on: event.currentTarget.checked })}
      />
      {value.on && (
        <Stack gap={6} pl="xs">
          {SOLVENTS.map((solvent) => {
            const plan = value[solvent]
            const proportional = isProportionalBag(plan.volumeMl)
            return (
              <Stack key={solvent} gap={4}>
                <Group gap="xs" wrap="nowrap">
                  <Checkbox
                    size="xs"
                    label={SOLVENT_LABEL[solvent]}
                    checked={plan.on}
                    onChange={(event) => solution(solvent, { on: event.currentTarget.checked })}
                    w={110}
                  />
                  <Select
                    size="xs"
                    w={110}
                    allowDeselect={false}
                    disabled={!plan.on}
                    data={INFUSION_VOLUMES_ML.map((ml) => ({
                      value: String(ml),
                      label: `${ml} ${t('calculator.manual.support.ml')}`,
                    }))}
                    value={String(plan.volumeMl)}
                    onChange={(next) => next && solution(solvent, { volumeMl: Number(next) })}
                    aria-label={`${SOLVENT_LABEL[solvent]}, ${t('calculator.manual.support.volume')}`}
                  />
                </Group>
                {plan.on && (
                  <Group gap="xs" wrap="wrap">
                    <SegmentedControl
                      size="xs"
                      disabled={!proportional}
                      value={plan.kcl}
                      onChange={(next) => solution(solvent, { kcl: next as KclChoice })}
                      data={[
                        ...KCL_STRENGTHS.map((strength) => ({
                          value: strength,
                          label: `KCl ${kclPercent(strength)}%`,
                        })),
                        { value: 'none', label: t('calculator.standardSupport.infusion.noKcl') },
                      ]}
                      aria-label={`${SOLVENT_LABEL[solvent]}, KCl`}
                    />
                    <Checkbox
                      size="xs"
                      disabled={!proportional}
                      label="MgSO4 25%"
                      checked={plan.mgso4}
                      onChange={(event) =>
                        solution(solvent, { mgso4: event.currentTarget.checked })
                      }
                    />
                  </Group>
                )}
                {plan.on && !proportional && (
                  <Text size="xs" c="dimmed">
                    {t('calculator.standardSupport.infusion.smallBag')}
                  </Text>
                )}
              </Stack>
            )
          })}
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <TextInput
              size="xs"
              w={130}
              label={t('calculator.plan.days')}
              placeholder={formatDays(chemoDays)}
              value={typedDays ?? (value.days ? formatDays(value.days) : '')}
              error={typedDays !== null && typedDays.trim() !== '' && parsedDays === null}
              description={value.days ? null : t('calculator.standardSupport.infusion.chemoDays')}
              onChange={(event) => setTypedDays(event.currentTarget.value)}
              onBlur={() => {
                if (typedDays === null) return
                if (typedDays.trim() === '') onChange({ ...value, days: null })
                else if (parsedDays) onChange({ ...value, days: parsedDays })
                setTypedDays(null)
              }}
            />
            <Select
              size="xs"
              w={100}
              label={t('calculator.standardSupport.infusion.hour')}
              allowDeselect={false}
              data={SHEET_HOURS.map((hour) => ({ value: String(hour), label: clockOfHour(hour) }))}
              value={String(value.hour ?? startHour)}
              onChange={(next) => next !== null && onChange({ ...value, hour: Number(next) })}
            />
            {/* Emptied, the rate is left to the ward and the sheet says only «в/в крап.». */}
            <NumberInput
              size="xs"
              w={120}
              label={t('calculator.standardSupport.infusion.rate')}
              placeholder={t('calculator.standardSupport.infusion.rateNone')}
              min={10}
              max={2000}
              step={10}
              allowDecimal={false}
              clampBehavior="blur"
              value={value.rateMlH ?? ''}
              onChange={(next) =>
                onChange({ ...value, rateMlH: typeof next === 'number' && next > 0 ? next : null })
              }
              description={
                value.rateMlH === STANDARD_INFUSION_RATE_ML_H
                  ? t('calculator.standardSupport.infusion.rateStandard')
                  : null
              }
            />
          </Group>
        </Stack>
      )}
    </Stack>
  )
}
