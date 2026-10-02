import { Group, NumberInput, Slider, Stack, Text } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { mostellerBsa } from '../../domain'
import { decimalInput } from '../../lib/decimal-input'
import { formatNumber } from '../../lib/format'
import { currentLanguage } from '../../lib/i18n'

/**
 * The body surface the need is counted on, picked without typing: a slider over the range adults
 * actually fall in, and — for a particular patient — the height and weight it follows from.
 *
 * The figure here is nobody's dose. It is how much of a drug a course takes for a body of that
 * size, which is what a form for the whole department is filled in from.
 */
export function BsaPicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (value: number | null) => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [heightCm, setHeightCm] = useState<number | null>(null)
  const [weightKg, setWeightKg] = useState<number | null>(null)

  const fromBody = (height: number | null, weight: number | null) => {
    setHeightCm(height)
    setWeightKg(weight)
    // A field clamps what is typed into it only when it is left; «0» and a half-typed «1» pass
    // through it first, and Mosteller refuses a body with no height, which would take the page
    // down with it. Nothing is counted until both numbers are numbers.
    if (height === null || weight === null || height <= 0 || weight <= 0) return
    onChange(Number(mostellerBsa(height, weight).toFixed(2)))
  }

  return (
    <Stack gap="xs">
      <Group align="flex-end" wrap="wrap" gap="sm">
        <NumberInput
          label={t('need.hint.bsa')}
          description={t('need.hint.bsaHint')}
          {...decimalInput()}
          value={value ?? ''}
          onChange={(next) => onChange(next === '' ? null : Number(next))}
          min={MIN}
          max={MAX}
          step={STEP}
          decimalScale={2}
          w={170}
        />
        <NumberInput
          label={t('need.hint.heightCm')}
          value={heightCm ?? ''}
          onChange={(next) => fromBody(next === '' ? null : Number(next), weightKg)}
          min={50}
          max={300}
          w={120}
        />
        <NumberInput
          label={t('need.hint.weightKg')}
          {...decimalInput()}
          value={weightKg ?? ''}
          onChange={(next) => fromBody(heightCm, next === '' ? null : Number(next))}
          min={1}
          max={500}
          decimalScale={1}
          w={120}
        />
        <Text size="sm" c="dimmed" pb={6}>
          {t('need.hint.mosteller')}
        </Text>
      </Group>

      <Slider
        aria-label={t('need.hint.bsaSlider')}
        min={MIN}
        max={MAX}
        step={STEP}
        value={value ?? DEFAULT}
        onChange={onChange}
        label={(picked) => `${formatNumber(picked, language, 2)} ${t('units.m2')}`}
        marks={MARKS.map((mark) => ({ value: mark, label: formatNumber(mark, language, 1) }))}
        mb="md"
        maw={520}
      />
    </Stack>
  )
}

/** The range an adult body surface falls in; the slider is for picking, not for proving. */
const MIN = 1.2
const MAX = 2.6
const STEP = 0.01
const MARKS = [1.4, 1.6, 1.8, 2, 2.2, 2.4]
/** Where the slider's handle rests before anything is picked — it counts nothing on its own. */
const DEFAULT = 1.8
