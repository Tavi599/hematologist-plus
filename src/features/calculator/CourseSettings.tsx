import { Card, Group, Select, Stack, Text, TextInput, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { BsaVariant } from '../../domain'
import type { CatalogIndex } from '../../lib/catalog-index'
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

  const regimens = [...catalog.regimens.values()]
    .map((regimen) => ({
      value: regimen.id,
      label: `${regimen.short_name} — ${localize(regimen.name, language)}`,
      sort: regimen.sort_order,
    }))
    .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label))

  const selected = value.regimenId ? catalog.regimens.get(value.regimenId) : undefined

  return (
    <Card withBorder component="section">
      <Stack gap="sm">
        <Title order={2} size="h4">
          {t('calculator.course.title')}
        </Title>

        <Select
          label={t('calculator.course.regimen')}
          placeholder={t('calculator.course.regimenPlaceholder')}
          nothingFoundMessage={t('calculator.course.noRegimens')}
          searchable
          data={regimens}
          value={value.regimenId}
          onChange={(regimenId) => patch({ regimenId })}
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
