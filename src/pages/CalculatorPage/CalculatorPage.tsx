import { Alert, Card, Group, SegmentedControl, Stack, Tabs, Text, Title } from '@mantine/core'
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
import { ManualRows } from '../../features/calculator/ManualRows'
import type { ManualRow } from '../../features/calculator/manual-rows'
import { PatientForm } from '../../features/calculator/PatientForm'
import { ScheduleTable } from '../../features/calculator/ScheduleTable'
import { SupplyTable } from '../../features/calculator/SupplyTable'
import { WarningList } from '../../features/calculator/WarningList'
import { CatalogGate } from '../../features/catalog/CatalogGate'
import { RegimenEvidence } from '../../features/catalog/RegimenEvidence'
import type { CatalogIndex } from '../../lib/catalog-index'
import { StandardSupport } from '../../features/calculator/StandardSupport'
import { cyclophosphamideMesna } from '../../lib/cyclophosphamide-mesna'
import { therapyRisksFor } from '../../features/immunodeficiency/therapy-risks'
import { TherapyRiskAlert } from '../../features/immunodeficiency/TherapyRiskMarks'
import { irradiationReasons } from '../../features/irradiated/course'
import { coursePhases } from '../../lib/course-phases'
import {
  categoryItemIds,
  indicatedSupport,
  isStandardSupportId,
  NO_SUPPORT,
  standardSupportRows,
  type SupportCategory,
  type ThromboAgent,
} from '../../lib/standard-support'
import {
  applyBagChoices,
  buildCourseItems,
  buildCourseItemsFrom,
  type AdministrationMode,
  type CourseItem,
} from '../../lib/course-input'
import { formatNumber } from '../../lib/format'
import {
  ALWAYS_PREMEDICATED,
  premedicationOnByDefault,
  unpremedicated,
} from '../../lib/premedication'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import type { RegimenItem } from '../../schemas/catalog'
import { todayIso, type PatientInput } from '../../schemas/patient'
import classes from './CalculatorPage.module.css'

export function CalculatorPage() {
  const { t } = useTranslation()

  return (
    <Stack gap="sm">
      <Title order={1}>{t('calculator.title')}</Title>
      <CatalogGate>{(catalog) => <Calculator catalog={catalog} />}</CatalogGate>
    </Stack>
  )
}

/** Ids of the regimen's own premedication and supportive therapy — everything but the drugs. */
function optionalIds(items: CourseItem[], custom: RegimenItem[]): string[] {
  const added = new Set(custom.map((item) => item.id))
  return items
    .filter(
      (item) =>
        !added.has(item.item.id) &&
        item.item.role !== 'main' &&
        // A standard row exists only while its switch is on, and is on from the start.
        !isStandardSupportId(item.item.id),
    )
    .map((item) => item.item.id)
}

function Calculator({ catalog }: { catalog: CatalogIndex }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [searchParams, setSearchParams] = useSearchParams()

  const [patient, setPatient] = useState<PatientInput | null>(null)
  const [courseSettings, setCourseSettings] = useState({
    startDate: todayIso(),
    dayStart: '11:00',
    bsaVariant: 'actual' as CourseSettingsValue['bsaVariant'],
    bsaM2: null as number | null,
    cycleNumber: 1,
  })
  const [customItems, setCustomItems] = useState<RegimenItem[]>([])
  const [disabledIds, setDisabledIds] = useState<string[]>([])
  const [drugPercent, setDrugPercent] = useState<Record<string, number>>({})
  const [doseOverrideAmount, setDoseOverrideAmount] = useState<Record<string, number>>({})
  const [chosenDoses, setChosenDoses] = useState<Record<string, string>>({})
  // Empty until the physician touches a tick: an item with no entry here uses the modifiers its
  // own protocol assumes.
  const [chosenModifiers, setChosenModifiers] = useState<Record<string, string[]>>({})
  const [administrationModes, setAdministrationModes] = useState<
    Record<string, AdministrationMode>
  >({})
  const [shiftMin, setShiftMin] = useState<Record<string, number>>({})
  // Which infusion of an antibody the course opens with, by drug (1, 2, 3 = later); untouched,
  // cycle 1 opens with the first.
  const [infusionStart, setInfusionStart] = useState<Record<string, number>>({})
  const [header, setHeader] = useState(emptyHeader)
  const [manualRows, setManualRows] = useState<ManualRow[]>([])
  const [support, setSupport] = useState<Record<SupportCategory, boolean>>(NO_SUPPORT)
  // NSSG's standard with an immunomodulatory drug; aspirin is for a patient with no other risk.
  const [thromboAgent, setThromboAgent] = useState<ThromboAgent>('apixaban')
  // Cyclophosphamide items the physician has added mesna to; the protocol's own mesna is apart.
  const [mesnaFor, setMesnaFor] = useState<string[]>([])
  // Rows the physician gives by another route the label allows at the same dose.
  const [chosenRoutes, setChosenRoutes] = useState<Record<string, RegimenItem['route']>>({})
  // Bags the physician picked for antimicrobial infusions, by row.
  const [chosenBags, setChosenBags] = useState<Record<string, number>>({})

  // The regimen lives in the URL, so a link from the disease page (and a shared link) works.
  const regimenId = searchParams.get('regimen')
  const settings: CourseSettingsValue = { ...courseSettings, regimenId }
  const phases = useMemo(() => coursePhases(catalog, regimenId), [catalog, regimenId])
  // Set when the calculator itself moved to another phase of the course, to say so.
  const [phaseNote, setPhaseNote] = useState<string | null>(null)
  const updateSettings = (next: CourseSettingsValue) => {
    const { regimenId: chosenRegimenId, ...rest } = next
    // A new cycle number of a course in phases brings the phase that covers it: cycle 2 of
    // Dara-VCd is not calculated on the cycle-1 record with its split first infusion.
    const cycleChanged =
      chosenRegimenId !== null &&
      chosenRegimenId === regimenId &&
      rest.cycleNumber !== courseSettings.cycleNumber
    // Written out here rather than called: the compiler keeps the memoised values only while
    // nothing it cannot see into is handed them.
    const found = cycleChanged
      ? (phases.find((entry) => {
          const cycles = entry.course?.cycles ?? null
          return (
            cycles !== null &&
            rest.cycleNumber >= cycles.from &&
            (cycles.to === null || rest.cycleNumber <= cycles.to)
          )
        }) ?? null)
      : null
    const phase = found && found.id !== chosenRegimenId ? found : null
    const nextRegimenId = phase ? phase.id : chosenRegimenId
    if (phase) setPhaseNote(localize(phase.course!.phase, language))
    else if (chosenRegimenId !== regimenId) setPhaseNote(null)
    // Another cycle is another course: the first-infusion ticks go back to "cycle 1 has it".
    if (rest.cycleNumber !== courseSettings.cycleNumber) setInfusionStart({})
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

  const ownItems = useMemo(
    () => [
      ...(regimenId
        ? buildCourseItems(
            catalog,
            regimenId,
            chosenDoses,
            chosenModifiers,
            administrationModes,
            chosenRoutes,
          )
        : []),
      ...buildCourseItemsFrom(
        catalog,
        customItems,
        chosenDoses,
        chosenModifiers,
        administrationModes,
        chosenRoutes,
      ),
    ],
    [
      catalog,
      regimenId,
      customItems,
      chosenDoses,
      chosenModifiers,
      administrationModes,
      chosenRoutes,
    ],
  )

  // The standard supportive care the physician has switched on and the regimen does not write
  // itself: antiemetics and prophylaxis, added as ordinary rows so they are calculated, scheduled
  // and printed like the rest.
  const baseItems = useMemo(
    () =>
      applyBagChoices(
        [
          ...ownItems,
          ...buildCourseItemsFrom(
            catalog,
            standardSupportRows(
              catalog,
              ownItems,
              regimenId === null
                ? null
                : (catalog.regimens.get(regimenId)?.cycle_length_days ?? null),
              courseSettings.startDate,
              support,
              thromboAgent,
            ),
            chosenDoses,
            chosenModifiers,
            administrationModes,
          ),
        ],
        chosenBags,
      ),
    [
      catalog,
      ownItems,
      chosenBags,
      regimenId,
      courseSettings.startDate,
      support,
      thromboAgent,
      chosenDoses,
      chosenModifiers,
      administrationModes,
    ],
  )

  const onSupport = (category: SupportCategory, on: boolean) => {
    setSupport((current) => ({ ...current, [category]: on }))
    // The regimen's own rows of the kind follow the switch as a group.
    const ids = categoryItemIds(ownItems, category)
    setDisabledIds((current) =>
      on ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])],
    )
  }

  // A regimen opens with its cytostatics on and its premedication and supportive therapy off:
  // what a patient actually gets of those is decided at the bedside, and the physician switches
  // on what this course needs. The exception is the premedication of rituximab and daratumumab,
  // which the department never gives without it: that opens switched on. A drug added by hand is never switched off — it was added on
  // purpose — and the switches a physician has set are kept until another regimen is chosen.
  const [toggledRegimen, setToggledRegimen] = useState<string | null | undefined>(undefined)
  if (regimenId !== toggledRegimen) {
    setToggledRegimen(regimenId)
    // The prophylaxis the regimen's own drugs call for opens switched on — aciclovir with a
    // proteasome inhibitor or daratumumab, thromboprophylaxis with lenalidomide and its kin — with
    // the regimen's own rows of the kind, if it writes any.
    const indicated = Object.keys(indicatedSupport(ownItems)) as SupportCategory[]
    setSupport({
      ...NO_SUPPORT,
      ...Object.fromEntries(indicated.map((category) => [category, true])),
    })
    setThromboAgent('apixaban')
    setMesnaFor([])
    setChosenRoutes({})
    const premedicationOn = premedicationOnByDefault(baseItems)
    const supportOn = new Set(indicated.flatMap((category) => categoryItemIds(ownItems, category)))
    setDisabledIds(
      optionalIds(baseItems, customItems).filter(
        (id) => !premedicationOn.has(id) && !supportOn.has(id),
      ),
    )
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

  // Mesna for a high cyclophosphamide dose follows the dose as calculated, so the course is
  // calculated once, the mesna on offer is found, and the course is calculated again with the
  // mesna the physician has added.
  const { items, course, error, mesnaOffered } = useMemo<{
    items: CourseItem[]
    course: CourseResult | null
    error: unknown
    mesnaOffered: string[]
  }>(() => {
    if (!patient || !measured || baseItems.length === 0) {
      return { items: baseItems, course: null, error: null, mesnaOffered: [] }
    }
    const calculate = (courseItems: CourseItem[]) =>
      calculateCourse(
        {
          ageYears: patient.ageYears ?? undefined,
          sex: patient.sex ?? undefined,
          heightCm: patient.heightCm ?? undefined,
          weightKg: patient.weightKg ?? undefined,
          serumCreatinine: patient.serumCreatinine ?? undefined,
          creatinineUnit: patient.creatinineUnit,
          bilirubinUmolL: patient.bilirubinUmolL ?? undefined,
        },
        courseItems.map((item) => item.courseDrug),
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
          infusionStart,
        },
      )
    try {
      const first = calculate(baseItems)
      const offered = cyclophosphamideMesna(catalog, baseItems, first)
      const mesnaOffered = offered.map((entry) => entry.courseDrug.anchorDrugId!)
      const mesna = offered.filter((entry) => mesnaFor.includes(entry.courseDrug.anchorDrugId!))
      if (mesna.length === 0) return { items: baseItems, course: first, error: null, mesnaOffered }
      const withMesna = [...baseItems, ...mesna]
      return { items: withMesna, course: calculate(withMesna), error: null, mesnaOffered }
    } catch (thrown) {
      return { items: baseItems, course: null, error: thrown, mesnaOffered: [] }
    }
  }, [
    catalog,
    patient,
    measured,
    baseItems,
    courseSettings,
    drugPercent,
    doseOverrideAmount,
    disabledIds,
    shiftMin,
    infusionStart,
    mesnaFor,
  ])

  const regimen = regimenId === null ? undefined : catalog.regimens.get(regimenId)
  /** Another phase picked by hand: the cycle number moves into it when it counts cycles. */
  const choosePhase = (phaseId: string) => {
    const phase = phases.find((entry) => entry.id === phaseId)
    const cycles = phase?.course?.cycles ?? null
    const cycleNumber =
      cycles !== null &&
      (courseSettings.cycleNumber < cycles.from ||
        (cycles.to !== null && courseSettings.cycleNumber > cycles.to))
        ? cycles.from
        : courseSettings.cycleNumber
    setPhaseNote(null)
    if (cycleNumber !== courseSettings.cycleNumber) setInfusionStart({})
    setCourseSettings((current) => ({ ...current, cycleNumber }))
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        params.set('regimen', phaseId)
        return params
      },
      { replace: true },
    )
  }
  const irradiation = useMemo(
    () => irradiationReasons(catalog, items, regimenId),
    [catalog, items, regimenId],
  )
  // Drug groups of the course that bring infections: decided by its main drugs still switched on.
  const infectionRisks = useMemo(
    () =>
      therapyRisksFor(
        items
          .filter((entry) => entry.item.role === 'main' && !disabledIds.includes(entry.item.id))
          .map((entry) => entry.item.drug_id),
      ),
    [items, disabledIds],
  )
  /** Hand-written lines that actually say something; an empty one is not a sheet. */
  const written = manualRows.filter((row) => row.what.trim() !== '')

  const sheetReady = course !== null || written.length > 0

  // Drugs that ask for premedication and get none on one of their days.
  const premedicationMissing = unpremedicated(items, disabledIds)
  const alwaysWithout = [
    ...new Set(
      items
        .filter(
          (entry) =>
            premedicationMissing.has(entry.item.id) && ALWAYS_PREMEDICATED.has(entry.item.drug_id),
        )
        .map((entry) => localize(entry.drug.name, language)),
    ),
  ]

  return (
    <div className={classes.layout}>
      {/* The inputs stay in view while the results are read: change a weight or a regimen and
          the doses beside it change with it. On a narrow screen the two simply stack. */}
      <aside className={classes.inputs}>
        <Stack gap="sm">
          <PatientForm onChange={setPatient} />
          <CourseSettings catalog={catalog} value={settings} onChange={updateSettings} />
          {ownItems.length > 0 && (
            <StandardSupport
              items={ownItems}
              value={support}
              onChange={onSupport}
              thromboAgent={thromboAgent}
              onThromboAgent={setThromboAgent}
            />
          )}
        </Stack>
      </aside>

      <Stack gap="sm" className={classes.results}>
        {phases.length > 1 && (
          <Card withBorder>
            <Stack gap={6}>
              <Text fw={600}>
                {t('calculator.course.phases', {
                  course: localize(phases[0]!.course!.title, language),
                })}
              </Text>
              <SegmentedControl
                fullWidth
                size="xs"
                value={regimenId ?? ''}
                onChange={choosePhase}
                data={phases.map((phase) => ({
                  value: phase.id,
                  label: localize(phase.course!.phase, language),
                }))}
              />
              <Text size="xs" c={phaseNote ? 'blue' : 'dimmed'}>
                {phaseNote
                  ? t('calculator.course.phaseSwitched', {
                      phase: phaseNote,
                      cycle: courseSettings.cycleNumber,
                    })
                  : t('calculator.course.phasesHint')}
              </Text>
            </Stack>
          </Card>
        )}
        {regimen && <RegimenEvidence regimen={regimen} />}

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

        {/* Every block stays mounted while its tab is hidden, so nothing typed is lost by
            switching tabs; only one of them is on screen at a time. */}
        <Tabs defaultValue="doses" keepMountedMode="display-none">
          <Tabs.List>
            <Tabs.Tab value="doses">{t('calculator.tabs.doses')}</Tabs.Tab>
            <Tabs.Tab value="schedule">{t('calculator.tabs.schedule')}</Tabs.Tab>
            <Tabs.Tab value="supply">{t('calculator.tabs.supply')}</Tabs.Tab>
            <Tabs.Tab value="print">{t('calculator.tabs.print')}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="doses" pt="sm">
            <Stack gap="sm">
              {irradiation.length > 0 && (
                <Alert color="grape" title={t('calculator.doses.irradiatedTitle')}>
                  <Text size="sm">{irradiation.map((reason) => reason[language]).join('; ')}</Text>
                  <Text size="xs" c="dimmed">
                    {t('calculator.doses.irradiatedHint')}
                  </Text>
                </Alert>
              )}
              <TherapyRiskAlert entries={infectionRisks} />
              {alwaysWithout.length > 0 && (
                <Alert color="orange" title={t('calculator.doses.premedAlertTitle')}>
                  <Text size="sm">
                    {t('calculator.doses.premedAlert', { drugs: alwaysWithout.join(', ') })}
                  </Text>
                </Alert>
              )}
              {items.length > 0 && (
                <DoseTable
                  premedicationMissing={premedicationMissing}
                  mesnaOffered={mesnaOffered}
                  onRoute={(id, route) =>
                    setChosenRoutes((current) => ({ ...current, [id]: route }))
                  }
                  mesnaAdded={mesnaFor}
                  cycleNumber={courseSettings.cycleNumber}
                  infusionStart={infusionStart}
                  onInfusionStart={(key, start) =>
                    setInfusionStart((current) => ({ ...current, [key]: start }))
                  }
                  onMesna={(id, on) =>
                    setMesnaFor((current) =>
                      on ? [...new Set([...current, id])] : current.filter((entry) => entry !== id),
                    )
                  }
                  items={items}
                  course={course}
                  bsaVariant={courseSettings.bsaVariant === 'capped' ? 'capped' : 'actual'}
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
                  administrationModes={administrationModes}
                  onAdministrationMode={(id, mode) => {
                    // The doses on offer change with the split, so a dose picked before no longer exists.
                    setChosenDoses((current) => {
                      const { [id]: _removed, ...rest } = current
                      return rest
                    })
                    setDoseOverrideAmount((current) => {
                      const { [id]: _removed, ...rest } = current
                      return rest
                    })
                    setAdministrationModes((current) => ({ ...current, [id]: mode }))
                  }}
                  onBagChoice={(id, bag) => setChosenBags((current) => ({ ...current, [id]: bag }))}
                  onDoseModifiers={(id, keys) =>
                    setChosenModifiers((current) => ({ ...current, [id]: keys }))
                  }
                  onDoseOverride={(id, doseMg) =>
                    setDoseOverrideAmount((current) => {
                      const { [id]: _removed, ...rest } = current
                      return doseMg === null ? rest : { ...rest, [id]: doseMg }
                    })
                  }
                  onRemove={(id) =>
                    setCustomItems((current) => current.filter((item) => item.id !== id))
                  }
                />
              )}
              <AddDrugForm
                catalog={catalog}
                sortOrder={items.length}
                onAdd={(item) => setCustomItems((current) => [...current, item])}
              />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="schedule" pt="sm">
            <Stack gap="sm">
              {sheetReady ? (
                <ScheduleTable
                  items={items}
                  course={course}
                  manualRows={manualRows}
                  startDateIso={courseSettings.startDate}
                  shiftMin={shiftMin}
                  onShift={(id, minutes) =>
                    setShiftMin((current) => ({ ...current, [id]: minutes }))
                  }
                />
              ) : (
                <Text size="sm" c="dimmed">
                  {t('calculator.tabs.empty')}
                </Text>
              )}
              <ManualRows rows={manualRows} onChange={setManualRows} />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="supply" pt="sm">
            {course ? (
              <SupplyTable catalog={catalog} course={course} />
            ) : (
              <Text size="sm" c="dimmed">
                {t('calculator.tabs.empty')}
              </Text>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="print" pt="sm">
            <Stack gap="sm">
              {/* A sheet of hand-written lines alone is still a sheet, so the export does not
                  wait for a calculation — only for someone to put something on the paper. */}
              {patient && sheetReady ? (
                <CourseExport
                  // A new regimen starts from its own reasons for irradiated components.
                  key={regimenId ?? 'none'}
                  items={items}
                  course={course}
                  patient={patient}
                  regimenName={regimen ? localize(regimen.name, language) : null}
                  cycleNumber={courseSettings.cycleNumber}
                  startDate={courseSettings.startDate}
                  dayStart={courseSettings.dayStart}
                  header={header}
                  manualRows={manualRows}
                  irradiationReasons={irradiation}
                />
              ) : (
                <Text size="sm" c="dimmed">
                  {t('calculator.tabs.empty')}
                </Text>
              )}
              <HospitalHeader catalog={catalog} value={header} onChange={setHeader} />
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </div>
  )
}
