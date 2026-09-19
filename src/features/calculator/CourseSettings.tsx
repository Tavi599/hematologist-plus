import { Badge, Card, Checkbox, Group, Select, Stack, Text, TextInput, Title } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { BsaVariant } from '../../domain'
import { regimenAvailability } from '../../lib/availability'
import type { CatalogIndex } from '../../lib/catalog-index'
import { filterRegimens, NO_REGIMEN_FILTER, type RegimenFilter } from '../../lib/regimen-filter'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'

export interface CourseSettingsValue {
  regimenId: string | null
  startDate: string
  dayStart: string
  bsaVariant: BsaVariant
}

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
  const [filter, setFilter] = useState<RegimenFilter>(NO_REGIMEN_FILTER)

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
      <Stack gap="sm">
        <Title order={2} size="h4">
          {t('calculator.course.title')}
        </Title>

        <Group align="flex-end" wrap="wrap" gap="sm">
          <Select
            label={t('calculator.course.disease')}
            placeholder={t('calculator.course.diseaseAll')}
            data={diseases}
            value={filter.diseaseId}
            onChange={(diseaseId) => setFilter({ ...filter, diseaseId })}
            searchable
            clearable
            style={{ minWidth: 240 }}
          />
          <Checkbox
            mb={8}
            label={t('calculator.course.onlyObtainable')}
            checked={filter.onlyObtainable}
            onChange={(event) =>
              setFilter({ ...filter, onlyObtainable: event.currentTarget.checked })
            }
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
              {availability.get(option.value) !== 'department' && (
                <Badge
                  size="xs"
                  variant="light"
                  color={availability.get(option.value) === 'unavailable' ? 'red' : 'yellow'}
                >
                  {t(`availability.${availability.get(option.value)!}`)}
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

        <Group grow align="flex-start" wrap="wrap">
          <TextInput
            type="date"
            label={t('calculator.course.startDate')}
            value={value.startDate}
            onChange={(event) => patch({ startDate: event.currentTarget.value })}
          />
          <TextInput
            type="time"
            label={t('calculator.course.dayStart')}
            value={value.dayStart}
            onChange={(event) => patch({ dayStart: event.currentTarget.value })}
          />
          <Select
            label={t('calculator.course.bsaVariant')}
            allowDeselect={false}
            data={[
              { value: 'actual', label: t('calculator.course.bsaActual') },
              { value: 'capped', label: t('calculator.course.bsaCapped') },
            ]}
            value={value.bsaVariant}
            onChange={(variant) =>
              patch({ bsaVariant: (variant as BsaVariant | null) ?? 'actual' })
            }
          />
        </Group>
      </Stack>
    </Card>
  )
}
