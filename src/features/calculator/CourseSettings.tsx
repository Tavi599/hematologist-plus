import {
  Badge,
  Card,
  Checkbox,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { BsaVariant } from '../../domain'
import { regimenAvailability } from '../../lib/availability'
import type { CatalogIndex } from '../../lib/catalog-index'
import { useOnlyObtainable } from '../../lib/only-obtainable'
import { filterRegimens, type RegimenFilter } from '../../lib/regimen-filter'
import { formatNumber } from '../../lib/format'
import { currentLanguage } from '../../lib/i18n'
import { decimalInput } from '../../lib/decimal-input'
import { localize } from '../../lib/localized'

export interface CourseSettingsValue {
  regimenId: string | null
  startDate: string
  dayStart: string
  bsaVariant: BsaSource
  /** BSA typed by the physician, m²; used only when `bsaVariant` is `entered`. */
  bsaM2: number | null
  /** Which cycle of the regimen this is; the first infusion of an antibody is the slow one. */
  cycleNumber: number
}

/**
 * Where the BSA for the doses comes from: the two calculated variants, or a value the physician
 * types in — for a patient Mosteller does not describe (amputation, gross oedema) or to keep the
 * BSA of the previous cycle.
 */
export type BsaSource = BsaVariant | 'entered'

/**
 * The BSA values an adult course is most often written on: picked straight from the list, so the
 * usual case — keeping the BSA of the previous cycle — takes one click instead of a typed number.
 */
const PRESET_BSA_M2 = [1.6, 1.7, 1.8, 1.9, 2]

/** How a ready value is told apart from the three sources in the same list. */
const presetOption = (m2: number) => `entered:${m2}`

/** Regimen choice and the settings that apply to the whole course. */
export function CourseSettings({
  catalog,
  value,
  onChange,
}: {
  catalog: CatalogIndex
  value: CourseSettingsValue
  onChange: (value: CourseSettingsValue) => void
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const patch = (next: Partial<CourseSettingsValue>) => onChange({ ...value, ...next })
  const [diseaseId, setDiseaseId] = useState<string | null>(null)
  // Shared with the disease pages: hiding what cannot be obtained is one decision, not two.
  const [onlyObtainable, setOnlyObtainable] = useOnlyObtainable()
  const filter: RegimenFilter = { diseaseId, onlyObtainable }

  const regimens = filterRegimens(catalog, filter).map((regimen) => ({
    value: regimen.id,
    label: `${regimen.short_name} — ${localize(regimen.name, language)}`,
  }))
  const availability = new Map(
    regimens.map((option) => [option.value, regimenAvailability(catalog, option.value)]),
  )
  const diseases = [...catalog.diseases.values()]
    .map((disease) => ({ value: disease.id, label: localize(disease.name, language) }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const selected = value.regimenId ? catalog.regimens.get(value.regimenId) : undefined

  return (
    <Card withBorder component="section">
      <Stack gap="xs">
        <Title order={2} size="h4">
          {t('calculator.course.title')}
        </Title>

        <Group align="flex-end" wrap="wrap" gap="sm">
          <Select
            label={t('calculator.course.disease')}
            placeholder={t('calculator.course.diseaseAll')}
            data={diseases}
            value={filter.diseaseId}
            onChange={setDiseaseId}
            searchable
            clearable
            style={{ minWidth: 240 }}
          />
          <Checkbox
            mb={8}
            label={t('calculator.course.onlyObtainable')}
            checked={filter.onlyObtainable}
            onChange={(event) => setOnlyObtainable(event.currentTarget.checked)}
          />
        </Group>

        <Select
          label={t('calculator.course.regimen')}
          placeholder={t('calculator.course.regimenPlaceholder')}
          nothingFoundMessage={t('calculator.course.noRegimens')}
          searchable
          data={regimens}
          value={value.regimenId}
          onChange={(regimenId) => patch({ regimenId })}
          renderOption={({ option }) => (
            <Group gap="xs" wrap="nowrap" justify="space-between" w="100%">
              <span>{option.label}</span>
              {availability.get(option.value) === 'unavailable' && (
                <Badge size="xs" variant="light" color="red">
                  {t('availability.unavailable')}
                </Badge>
              )}
            </Group>
          )}
        />
        {selected?.cycle_length_days && (
          <Text size="xs" c="dimmed">
            {t('calculator.course.cycle', {
              days: selected.cycle_length_days,
              cycles: selected.default_cycles ?? '—',
            })}
          </Text>
        )}

        <SimpleGrid
          cols={{ base: 2, xs: 3, lg: 2 }}
          spacing="xs"
          verticalSpacing="xs"
          style={{ alignItems: 'end' }}
        >
          <TextInput
            type="date"
            label={t('calculator.course.startDate')}
            value={value.startDate}
            onChange={(event) => patch({ startDate: event.currentTarget.value })}
          />
          <TextInput
            type="time"
            label={t('calculator.course.dayStart')}
            description={t('calculator.course.dayStartHint')}
            value={value.dayStart}
            onChange={(event) => patch({ dayStart: event.currentTarget.value })}
          />
          <NumberInput
            label={t('calculator.course.cycleNumber')}
            description={t('calculator.course.cycleNumberHint')}
            min={1}
            max={99}
            value={value.cycleNumber}
            onChange={(next) => patch({ cycleNumber: Math.max(1, Number(next) || 1) })}
          />
          <Select
            label={t('calculator.course.bsaVariant')}
            allowDeselect={false}
            data={[
              {
                group: t('calculator.course.bsaSource'),
                items: [
                  { value: 'actual', label: t('calculator.course.bsaActual') },
                  { value: 'capped', label: t('calculator.course.bsaCapped') },
                  { value: 'entered', label: t('calculator.course.bsaEntered') },
                ],
              },
              {
                group: t('calculator.course.bsaPresets'),
                items: PRESET_BSA_M2.map((m2) => ({
                  value: presetOption(m2),
                  label: `${formatNumber(m2, language, 1, 1)} ${t('units.m2')}`,
                })),
              },
            ]}
            // A ready value is the entered BSA; typing another number over it leaves the list on
            // «введена вручну», which is what it then is.
            value={
              value.bsaVariant === 'entered' &&
              value.bsaM2 !== null &&
              PRESET_BSA_M2.includes(value.bsaM2)
                ? presetOption(value.bsaM2)
                : value.bsaVariant
            }
            onChange={(next) => {
              if (next === null) return
              const preset = next.startsWith('entered:')
                ? Number(next.slice('entered:'.length))
                : null
              if (preset !== null) patch({ bsaVariant: 'entered', bsaM2: preset })
              else patch({ bsaVariant: next as BsaSource })
            }}
          />
          {value.bsaVariant === 'entered' && (
            <NumberInput
              label={t('calculator.course.bsaM2')}
              description={t('calculator.course.bsaM2Hint')}
              min={0.1}
              max={4}
              step={0.01}
              {...decimalInput()}
              decimalScale={2}
              value={value.bsaM2 ?? ''}
              onChange={(next) => {
                const entered = Number(next)
                patch({ bsaM2: Number.isFinite(entered) && entered > 0 ? entered : null })
              }}
            />
          )}
        </SimpleGrid>
      </Stack>
    </Card>
  )
}
