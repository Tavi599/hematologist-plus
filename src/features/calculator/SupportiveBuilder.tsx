import { Button, Group, NumberInput, Select, Stack, Switch, Text, TextInput } from '@mantine/core'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ManualRow } from './manual-rows'
import { parseDays } from './parse-days'
import {
  PROPORTIONAL_VOLUMES_ML,
  SMALL_VOLUMES_ML,
  infusionRow,
  presetRow,
  standardAdditives,
  type DrugPreset,
  type Solvent,
} from './supportive-rows'

const VOLUMES = [...SMALL_VOLUMES_ML, ...PROPORTIONAL_VOLUMES_ML]

interface Additive {
  on: boolean
  /** Kept as typed, so an amount can be edited mid-number. */
  ml: number | string
}

const OFF: Additive = { on: false, ml: '' }

/**
 * The department's standard support lines, added to the course on request. A bag of 500, 1000 or
 * 3000 mL comes with potassium and magnesium in proportion, each of which can be switched off; a
 * small bag comes with neither, and any amount is the physician's own.
 */
export function SupportiveBuilder({ onAdd }: { onAdd: (row: ManualRow) => void }) {
  const { t } = useTranslation()
  const added = useRef(0)
  const [solvent, setSolvent] = useState<Solvent>('nacl')
  const [volume, setVolume] = useState(1000)
  const [kcl, setKcl] = useState<Additive>(() => ({ on: true, ml: 40 }))
  const [mgso4, setMgso4] = useState<Additive>(() => ({ on: true, ml: 4 }))
  const [rate, setRate] = useState<number | string>('')
  const [typedDays, setTypedDays] = useState('1')

  const days = parseDays(typedDays)
  const nextId = () => `support-${Date.now()}-${added.current++}`

  const changeVolume = (value: number) => {
    setVolume(value)
    const standard = standardAdditives(value)
    // A standard bag brings its proportional additives; a small one starts clean.
    setKcl(standard ? { on: true, ml: standard.kclMl } : OFF)
    setMgso4(standard ? { on: true, ml: standard.mgso4Ml } : OFF)
  }

  const amount = (additive: Additive): number | null => {
    if (!additive.on) return null
    const value = Number(additive.ml)
    return additive.ml !== '' && Number.isFinite(value) && value > 0 ? value : null
  }
  // A switched-on additive without an amount would print as if it were off.
  const incomplete = (additive: Additive) => additive.on && amount(additive) === null
  const canAdd = days !== null && days.length > 0 && !incomplete(kcl) && !incomplete(mgso4)

  const additiveInput = (label: string, additive: Additive, set: (next: Additive) => void) => (
    <Group align="flex-end" gap="xs" wrap="nowrap">
      <Switch
        label={label}
        checked={additive.on}
        onChange={(event) => set({ ...additive, on: event.currentTarget.checked })}
      />
      <NumberInput
        aria-label={`${label}, ${t('calculator.manual.support.ml')}`}
        suffix={` ${t('calculator.manual.support.ml')}`}
        min={0}
        decimalScale={2}
        decimalSeparator=","
        w={110}
        disabled={!additive.on}
        value={additive.ml}
        onChange={(ml) => set({ ...additive, ml })}
        error={incomplete(additive)}
      />
    </Group>
  )

  return (
    <Stack gap="xs">
      <Text fw={500}>{t('calculator.manual.support.title')}</Text>
      <Group align="flex-end" wrap="wrap" gap="sm">
        <Select
          label={t('calculator.manual.support.solvent')}
          allowDeselect={false}
          data={[
            { value: 'nacl', label: 'NaCl 0,9%' },
            { value: 'glucose', label: t('calculator.manual.support.glucose') },
          ]}
          value={solvent}
          onChange={(value) => setSolvent((value as Solvent | null) ?? 'nacl')}
          w={150}
        />
        <Select
          label={t('calculator.manual.support.volume')}
          allowDeselect={false}
          data={VOLUMES.map((ml) => ({
            value: String(ml),
            label: `${ml} ${t('calculator.manual.support.ml')}`,
          }))}
          value={String(volume)}
          onChange={(value) => value && changeVolume(Number(value))}
          w={120}
        />
        {additiveInput('KCl 4%', kcl, setKcl)}
        {additiveInput('MgSO4 25%', mgso4, setMgso4)}
        <NumberInput
          label={t('calculator.manual.support.rate')}
          suffix={` ${t('calculator.manual.support.rateUnit')}`}
          min={0}
          allowNegative={false}
          w={140}
          value={rate}
          onChange={setRate}
        />
        <TextInput
          label={t('calculator.doses.addDays')}
          placeholder={t('calculator.doses.addDaysPlaceholder')}
          value={typedDays}
          onChange={(event) => setTypedDays(event.currentTarget.value)}
          error={days === null ? t('calculator.doses.addInvalidDays') : null}
          w={140}
        />
        <Button
          variant="light"
          disabled={!canAdd}
          onClick={() =>
            onAdd(
              infusionRow(
                nextId(),
                {
                  solvent,
                  volumeMl: volume,
                  kclMl: amount(kcl),
                  mgso4Ml: amount(mgso4),
                  rateMlH: Number(rate) > 0 ? Number(rate) : null,
                },
                days ?? [1],
              ),
            )
          }
        >
          {t('calculator.manual.support.addInfusion')}
        </Button>
      </Group>
      <Group gap="sm">
        {(['ondansetron', 'omeprazole'] as DrugPreset[]).map((preset) => (
          <Button
            key={preset}
            variant="light"
            disabled={days === null || days.length === 0}
            onClick={() => onAdd(presetRow(nextId(), preset, days ?? [1]))}
          >
            {t(`calculator.manual.support.${preset}`)}
          </Button>
        ))}
      </Group>
      <Text size="xs" c="dimmed">
        {t('calculator.manual.support.hint')}
      </Text>
    </Stack>
  )
}
