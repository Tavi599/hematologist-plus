import { Button, Card, Group, NumberInput, Select, TextInput, Title } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CatalogIndex } from '../../lib/catalog-index'
import { customCourseItem } from '../../lib/course-input'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import { DOSE_UNITS } from '../../schemas/common'
import type { RegimenItem } from '../../schemas/catalog'
import { parseDays } from './parse-days'

/** Adds a drug that is not part of the regimen (supportive therapy, a substitution). */
export function AddDrugForm({
  catalog,
  onAdd,
  sortOrder,
}: {
  catalog: CatalogIndex
  onAdd: (item: RegimenItem) => void
  sortOrder: number
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [drugId, setDrugId] = useState<string | null>(null)
  const [doseValue, setDoseValue] = useState<number | string>('')
  const [doseUnit, setDoseUnit] = useState<RegimenItem['dose_unit']>('mg_flat')
  const [days, setDays] = useState('1')
  const [durationMin, setDurationMin] = useState<number | string>('')

  const parsedDays = parseDays(days)
  const dose = Number(doseValue)
  const canAdd = drugId !== null && parsedDays !== null && dose > 0

  const submit = () => {
    if (!canAdd) return
    // Infusion when the drug has dilution parameters, otherwise an oral/bolus line.
    const hasInfusion = (catalog.infusionParamsByDrug.get(drugId) ?? []).length > 0
    onAdd(
      customCourseItem({
        id: `custom.${drugId}.${sortOrder}`,
        drugId,
        doseValue: dose,
        doseUnit,
        days: parsedDays,
        route: hasInfusion ? 'iv_infusion' : 'oral',
        durationMin: Number(durationMin) || null,
        sortOrder,
      }),
    )
    setDrugId(null)
    setDoseValue('')
    setDays('1')
    setDurationMin('')
  }

  return (
    <Card withBorder component="section">
      <Title order={2} size="h4" mb="sm">
        {t('calculator.doses.addTitle')}
      </Title>
      <Group align="flex-end" wrap="wrap" gap="sm">
        <Select
          label={t('calculator.doses.addDrug')}
          searchable
          value={drugId}
          onChange={setDrugId}
          data={[...catalog.drugs.values()]
            .map((drug) => ({ value: drug.id, label: localize(drug.name, language) }))
            .sort((a, b) => a.label.localeCompare(b.label))}
          style={{ minWidth: 220 }}
        />
        <NumberInput
          label={t('calculator.doses.addDose')}
          min={0}
          value={doseValue}
          onChange={setDoseValue}
          w={120}
        />
        <Select
          label={t('calculator.doses.addUnit')}
          allowDeselect={false}
          value={doseUnit}
          onChange={(unit) => setDoseUnit((unit as RegimenItem['dose_unit'] | null) ?? 'mg_flat')}
          data={DOSE_UNITS.map((unit) => ({ value: unit, label: t(`units.${unit}`) }))}
          w={120}
        />
        <TextInput
          label={t('calculator.doses.addDays')}
          placeholder={t('calculator.doses.addDaysPlaceholder')}
          value={days}
          onChange={(event) => setDays(event.currentTarget.value)}
          error={parsedDays === null ? t('calculator.doses.addInvalidDays') : null}
          w={140}
        />
        <NumberInput
          label={t('calculator.doses.addDuration')}
          min={0}
          value={durationMin}
          onChange={setDurationMin}
          w={140}
        />
        <Button onClick={submit} disabled={!canAdd}>
          {t('calculator.doses.addSubmit')}
        </Button>
      </Group>
    </Card>
  )
}
