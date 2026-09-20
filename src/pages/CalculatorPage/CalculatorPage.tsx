import { Alert, Card, Group, Stack, Text, Title } from '@mantine/core'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { calculateCourse, DomainInputError, type CourseResult } from '../../domain'
import { AddDrugForm } from '../../features/calculator/AddDrugForm'
import { CourseExport } from '../../features/calculator/CourseExport'
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
import { buildCourseItems, buildCourseItemsFrom, type CourseItem } from '../../lib/course-input'
import { formatNumber } from '../../lib/format'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
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

/** Ids of the regimen's own premedication and supportive therapy — everything but the drugs. */
function optionalIds(items: CourseItem[], custom: RegimenItem[]): string[] {
  const added = new Set(custom.map((item) => item.id))
  return items
    .filter((item) => !added.has(item.item.id) && item.item.role !== 'main')
    .map((item) => item.item.id)
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
    bsaM2: null as number | null,
    cycleNumber: 1,
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

  // A regimen opens with its cytostatics on and its premedication and supportive therapy off:
  // what a patient actually gets of those is decided at the bedside, and the physician switches
  // on what this course needs. A drug added by hand is never switched off — it was added on
  // purpose — and the switches a physician has set are kept until another regimen is chosen.
  const [toggledRegimen, setToggledRegimen] = useState<string | null | undefined>(undefined)
  if (regimenId !== toggledRegimen) {
    setToggledRegimen(regimenId)
    setDisabledIds(optionalIds(items, customItems))
  }

  /**
   * A BSA typed in by hand is enough to calculate on its own: it is what every dose per square
   * metre is taken from. Height and weight are then no longer asked for — what still genuinely
   * needs them (a dose per kilogram, a creatinine clearance) says so by name when it is missing.
   */
  const enteredBsaM2 = courseSettings.bsaVariant === 'entered' ? courseSettings.bsaM2 : null
  const measured =
    patient !== null &&
    (enteredBsaM2 !== null || (patient.heightCm !== null && patient.weightKg !== null))

  const { course, error } = useMemo<{ course: CourseResult | null; error: unknown }>(() => {
    if (!patient || !measured || items.length === 0) return { course: null, error: null }
    try {
      return {
        course: calculateCourse(
          {
            ageYears: patient.ageYears ?? undefined,
            sex: patient.sex,
            heightCm: patient.heightCm ?? undefined,
            weightKg: patient.weightKg ?? undefined,
            serumCreatinine: patient.serumCreatinine ?? undefined,
            creatinineUnit: patient.creatinineUnit,
            bilirubinUmolL: patient.bilirubinUmolL ?? undefined,
          },
          items.map((item) => item.courseDrug),
          {
            startDateIso: courseSettings.startDate,
            dayStart: courseSettings.dayStart,
            // 'entered' is a source, not a third dose column: the typed BSA replaces Mosteller
            // and the two columns stay actual / capped as before.
            bsaVariant:
              courseSettings.bsaVariant === 'entered' ? 'actual' : courseSettings.bsaVariant,
            ...(courseSettings.bsaVariant === 'entered' && courseSettings.bsaM2 !== null
              ? { bsaM2: courseSettings.bsaM2 }
              : {}),
            cycleNumber: courseSettings.cycleNumber,
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
  }, [
    patient,
    measured,
    items,
    courseSettings,
    drugPercent,
    doseOverrideAmount,
    disabledIds,
    shiftMin,
  ])

  const regimen = regimenId === null ? undefined : catalog.regimens.get(regimenId)

  return (
    <Stack>
      <PatientForm onChange={setPatient} />
      <CourseSettings catalog={catalog} value={settings} onChange={updateSettings} />

      {!measured && items.length > 0 && (
        <Alert color="blue" variant="light">
          {t('calculator.patient.incomplete')}
        </Alert>
      )}
      {!measured && items.length === 0 && (
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
          {patient && (
            <CourseExport
              items={items}
              course={course}
              patient={patient}
              regimenName={regimen ? localize(regimen.name, language) : null}
              cycleNumber={courseSettings.cycleNumber}
              startDate={courseSettings.startDate}
              header={header}
            />
          )}
        </>
      )}

      <HospitalHeader catalog={catalog} value={header} onChange={setHeader} />
    </Stack>
  )
}
