import { Alert, Card, Group, Stack, Text, Title } from '@mantine/core'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { calculateCourse, DomainInputError, type CourseResult } from '../../domain'
import { AddDrugForm } from '../../features/calculator/AddDrugForm'
import { CourseSettings, type CourseSettingsValue } from '../../features/calculator/CourseSettings'
import { DoseTable } from '../../features/calculator/DoseTable'
import { emptyHeader } from '../../features/calculator/header'
import { HospitalHeader } from '../../features/calculator/HospitalHeader'
import { PatientForm } from '../../features/calculator/PatientForm'
import { ScheduleTable } from '../../features/calculator/ScheduleTable'
import { SupplyTable } from '../../features/calculator/SupplyTable'
import { WarningList } from '../../features/calculator/WarningList'
import { CatalogGate } from '../../features/catalog/CatalogGate'
import type { CatalogIndex } from '../../lib/catalog-index'
import { buildCourseItems, buildCourseItemsFrom } from '../../lib/course-input'
import { formatNumber } from '../../lib/format'
import { currentLanguage } from '../../lib/i18n'
import type { RegimenItem } from '../../schemas/catalog'
import { todayIso, type PatientInput } from '../../schemas/patient'

export function CalculatorPage() {
  const { t } = useTranslation()

  return (
    <Stack>
      <Title order={1}>{t('calculator.title')}</Title>
      <CatalogGate>{(catalog) => <Calculator catalog={catalog} />}</CatalogGate>
    </Stack>
  )
}

function Calculator({ catalog }: { catalog: CatalogIndex }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [searchParams, setSearchParams] = useSearchParams()

  const [patient, setPatient] = useState<PatientInput | null>(null)
  const [courseSettings, setCourseSettings] = useState({
    startDate: todayIso(),
    dayStart: '09:00',
    bsaVariant: 'actual' as CourseSettingsValue['bsaVariant'],
  })
  const [customItems, setCustomItems] = useState<RegimenItem[]>([])
  const [disabledIds, setDisabledIds] = useState<string[]>([])
  const [drugPercent, setDrugPercent] = useState<Record<string, number>>({})
  const [doseOverrideAmount, setDoseOverrideAmount] = useState<Record<string, number>>({})
  const [chosenDoses, setChosenDoses] = useState<Record<string, string>>({})
  const [shiftMin, setShiftMin] = useState<Record<string, number>>({})
  const [header, setHeader] = useState(emptyHeader)

  // The regimen lives in the URL, so a link from the disease page (and a shared link) works.
  const regimenId = searchParams.get('regimen')
  const settings: CourseSettingsValue = { ...courseSettings, regimenId }
  const updateSettings = (next: CourseSettingsValue) => {
    const { regimenId: nextRegimenId, ...rest } = next
    setCourseSettings(rest)
    if (nextRegimenId === regimenId) return
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (nextRegimenId) params.set('regimen', nextRegimenId)
        else params.delete('regimen')
        return params
      },
      { replace: true },
    )
  }

  const items = useMemo(
    () => [
      ...(regimenId ? buildCourseItems(catalog, regimenId, chosenDoses) : []),
      ...buildCourseItemsFrom(catalog, customItems, chosenDoses),
    ],
    [catalog, regimenId, customItems, chosenDoses],
  )

  const { course, error } = useMemo<{ course: CourseResult | null; error: unknown }>(() => {
    if (!patient || items.length === 0) return { course: null, error: null }
    try {
      return {
        course: calculateCourse(
          {
            ageYears: patient.ageYears,
            sex: patient.sex,
            heightCm: patient.heightCm,
            weightKg: patient.weightKg,
            serumCreatinine: patient.serumCreatinine ?? undefined,
            creatinineUnit: patient.creatinineUnit,
            bilirubinUmolL: patient.bilirubinUmolL ?? undefined,
          },
          items.map((item) => item.courseDrug),
          {
            startDateIso: courseSettings.startDate,
            dayStart: courseSettings.dayStart,
            bsaVariant: courseSettings.bsaVariant,
            drugPercent,
            doseOverrideAmount,
            disabledIds,
            shiftMin,
          },
        ),
        error: null,
      }
    } catch (thrown) {
      return { course: null, error: thrown }
    }
  }, [patient, items, courseSettings, drugPercent, doseOverrideAmount, disabledIds, shiftMin])

  return (
    <Stack>
      <PatientForm onChange={setPatient} />
      <CourseSettings catalog={catalog} value={settings} onChange={updateSettings} />

      {!patient && items.length > 0 && (
        <Alert color="blue" variant="light">
          {t('calculator.patient.incomplete')}
        </Alert>
      )}
      {!patient && items.length === 0 && (
        <Text c="dimmed">{t('calculator.patient.incomplete')}</Text>
      )}

      {error !== null && (
        <Alert color="red" title={t('calculator.error.title')}>
          <Text size="sm">{(error as Error).message}</Text>
          {error instanceof DomainInputError && (
            <Text size="sm">{t('calculator.error.field', { field: error.field })}</Text>
          )}
        </Alert>
      )}

      {course && (
        <>
          <Card withBorder>
            <Group justify="space-between" wrap="wrap">
              <Text fw={500}>
                {course.creatinineClearanceMlMin === null
                  ? t('calculator.patient.summaryNoCrcl', {
                      bsa: formatNumber(course.bsa.actualM2, language, 2),
                    })
                  : t('calculator.patient.summary', {
                      bsa: formatNumber(course.bsa.actualM2, language, 2),
                      crcl: `${formatNumber(course.creatinineClearanceMlMin, language, 1)} ${t('units.ml_min')}`,
                    })}
              </Text>
              <Text size="xs" c="dimmed">
                {t('warning.noDoseChange')}
              </Text>
            </Group>
          </Card>
          <WarningList warnings={course.warnings} />
        </>
      )}

      {items.length > 0 && (
        <DoseTable
          items={items}
          course={course}
          disabledIds={disabledIds}
          drugPercent={drugPercent}
          doseOverrideAmount={doseOverrideAmount}
          customIds={customItems.map((item) => item.id)}
          onToggle={(id, enabled) =>
            setDisabledIds((current) =>
              enabled ? current.filter((entry) => entry !== id) : [...current, id],
            )
          }
          onReduction={(id, percent) =>
            setDrugPercent((current) => {
              const { [id]: _removed, ...rest } = current
              return percent === null ? rest : { ...rest, [id]: percent }
            })
          }
          onDoseChoice={(id, choiceId) =>
            setChosenDoses((current) => ({ ...current, [id]: choiceId }))
          }
          onDoseOverride={(id, doseMg) =>
            setDoseOverrideAmount((current) => {
              const { [id]: _removed, ...rest } = current
              return doseMg === null ? rest : { ...rest, [id]: doseMg }
            })
          }
          onRemove={(id) => setCustomItems((current) => current.filter((item) => item.id !== id))}
        />
      )}

      <AddDrugForm
        catalog={catalog}
        sortOrder={items.length}
        onAdd={(item) => setCustomItems((current) => [...current, item])}
      />

      {course && (
        <>
          <ScheduleTable
            items={items}
            course={course}
            shiftMin={shiftMin}
            onShift={(id, minutes) => setShiftMin((current) => ({ ...current, [id]: minutes }))}
          />
          <SupplyTable catalog={catalog} course={course} />
        </>
      )}

      <HospitalHeader catalog={catalog} value={header} onChange={setHeader} />
    </Stack>
  )
}
