import { Alert, Card, Group, SegmentedControl, Stack, Tabs, Text, Title } from '@mantine/core'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import {
  calculateCourse,
  DomainInputError,
  type CourseResult,
  type ClearanceWeight,
} from '../../domain'
import { AddDrugForm } from '../../features/calculator/AddDrugForm'
import { CourseExport } from '../../features/calculator/CourseExport'
import { CourseDraft } from '../../features/calculator/CourseDraft'
import { SaveFolderCard } from '../../features/calculator/SaveFolder'
import { CourseSettings, type CourseSettingsValue } from '../../features/calculator/CourseSettings'
import { DeviationSummary } from '../../features/calculator/DeviationSummary'
import { collectDeviations, revertAll, revertDeviation } from '../../features/calculator/deviations'
import { PrintCheck } from '../../features/calculator/PrintCheck'
import {
  courseCard,
  COURSE_CARD_MEDIA_TYPE,
  loadDraft,
  parseCourseCard,
  personalInDraft,
  saveDraft,
  setPersonalInDraft,
} from '../../lib/course-draft'
import { initialCourseState, useCourseState } from '../../features/calculator/course-state'
import { courseFileTarget } from '../../lib/course-file-name'
import type { SaveOutcome } from '../../lib/save-folder'
import { useSaveFolder } from '../../lib/use-save-folder'
import { DoseTable } from '../../features/calculator/DoseTable'
import { HospitalHeader } from '../../features/calculator/HospitalHeader'
import { MANUAL_ROWS_ANCHOR, ManualRows } from '../../features/calculator/ManualRows'
import { withFirstFullDose } from '../../lib/renal-first-dose'
import {
  infusionTherapyRows,
  IVIG_DRUG_ID,
  ivigSupportRows,
  NO_INFUSION_THERAPY,
} from '../../features/calculator/supportive-rows'
import { InfusionTherapyControls } from '../../features/calculator/InfusionTherapyControls'
import { PatientForm } from '../../features/calculator/PatientForm'
import { ScheduleTable } from '../../features/calculator/ScheduleTable'
import { PreparationTable } from '../../features/calculator/PreparationTable'
import { SupplyTable } from '../../features/calculator/SupplyTable'
import { WarningList } from '../../features/calculator/WarningList'
import { MissingDataAlert, UnadjustedSupportAlert } from '../../features/calculator/MissingData'
import { missingRequirements } from '../../lib/course-requirements'
import { InteractionList } from '../../features/calculator/InteractionList'
import { courseInteractions } from '../../lib/course-interactions'
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
} from '../../lib/standard-support'
import {
  applyBagChoices,
  applyBlockChoices,
  applyDurationChoices,
  buildCourseItemsFrom,
  type CourseItem,
} from '../../lib/course-input'
import {
  applyPlans,
  isVariant,
  nextVariantId,
  overlappingDays,
  variantBase,
  withVariants,
} from '../../lib/row-plan'
import { formatNumber } from '../../lib/format'
import {
  ALWAYS_PREMEDICATED,
  premedicationOnByDefault,
  unpremedicated,
} from '../../lib/premedication'
import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import type { RegimenItem } from '../../schemas/catalog'
import { patientFormIssues, patientFormSchema, type PatientInput } from '../../schemas/patient'
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

  // The course left on this device, read once: a draft of the same regimen — or of none, when the
  // calculator is opened from the menu — is the course the physician was laying out.
  const [draft] = useState(() => loadDraft())
  const urlRegimen = searchParams.get('regimen')
  const restored = draft !== null && (urlRegimen === null || urlRegimen === draft.regimenId)
  // Its regimen goes back into the address, so the course on screen is the course the link opens.
  const [pendingRegimen, setPendingRegimen] = useState(
    restored && urlRegimen === null ? draft.regimenId : null,
  )
  const { state, setState, set } = useCourseState(restored ? draft.state : initialCourseState())
  const [personal, setPersonal] = useState(() => personalInDraft())
  const [cardNote, setCardNote] = useState<'opened' | 'invalid' | null>(null)
  const [cardSaved, setCardSaved] = useState<SaveOutcome | null>(null)
  const folder = useSaveFolder()
  // Bumped when a course card is opened: the patient form is filled from its defaults, so only a
  // remount brings the values of the card into its fields.
  const [formKey, setFormKey] = useState(0)
  // Bumped to open the hand-written lines when a row asks to show its own (immunoglobulin).
  const [manualOpenRequest, setManualOpenRequest] = useState(0)

  const {
    patientForm,
    courseSettings,
    customItems,
    disabledIds,
    drugPercent,
    doseOverrideAmount,
    // Where and when each row is given, as the physician set it: the hours on the sheet, how many
    // times a day, the days of the support.
    plans,
    // Copies of rows: the same drug again with settings of its own (ondansetron before the
    // cytostatic on day 1, then three times a day on the inpatient sheet).
    variants,
    infusionTherapy,
    chosenDoses,
    // Empty until the physician touches a tick: an item with no entry here uses the modifiers its
    // own protocol assumes.
    chosenModifiers,
    administrationModes,
    // Which infusion of an antibody the course opens with, by drug (1, 2, 3 = later); untouched,
    // cycle 1 opens with the first.
    infusionStart,
    header,
    manualRows,
    support,
    // NSSG's standard with an immunomodulatory drug; aspirin is for a patient with no other risk.
    thromboAgent,
    antiviralAgent,
    gastroAgent,
    // Cyclophosphamide items the physician has added mesna to; the protocol's own mesna is apart.
    mesnaFor,
    // Rows the physician gives by another route the label allows at the same dose.
    chosenRoutes,
    // The sheet each row is printed on, where the physician moved it off the regimen's own.
    sheetChoices,
    // Bags and infusion durations the physician picked for antimicrobials, by row.
    chosenBags,
    chosenDurations,
    // Rows whose correction by creatinine clearance the physician switched off, those given the
    // full dose every other day, and where in the label's range a corrected dose was put.
    renalBandOffIds,
    renalBandEveryOtherDayIds,
    renalBandLevel,
    // The weight the creatinine clearance is worked out on, for a patient with obesity.
    clearanceWeight,
  } = state
  const {
    courseSettings: setCourseSettings,
    customItems: setCustomItems,
    disabledIds: setDisabledIds,
    drugPercent: setDrugPercent,
    doseOverrideAmount: setDoseOverrideAmount,
    plans: setPlans,
    variants: setVariants,
    infusionTherapy: setInfusionTherapy,
    chosenDoses: setChosenDoses,
    chosenModifiers: setChosenModifiers,
    administrationModes: setAdministrationModes,
    infusionStart: setInfusionStart,
    header: setHeader,
    manualRows: setManualRows,
    support: setSupport,
    thromboAgent: setThromboAgent,
    antiviralAgent: setAntiviralAgent,
    gastroAgent: setGastroAgent,
    mesnaFor: setMesnaFor,
    chosenRoutes: setChosenRoutes,
    sheetChoices: setSheetChoices,
    chosenBags: setChosenBags,
    chosenDurations: setChosenDurations,
    renalBandOffIds: setRenalBandOffIds,
    renalBandEveryOtherDayIds: setRenalBandEveryOtherDayIds,
    renalBandLevel: setRenalBandLevel,
    clearanceWeight: setClearanceWeight,
  } = set

  // The measurements as the form holds them: parsed here, so the fields themselves are what the
  // draft and the course card keep.
  const patient = useMemo<PatientInput | null>(() => {
    const parsed = patientFormSchema.safeParse(patientForm)
    return parsed.success ? parsed.data : null
  }, [patientForm])

  const patientIssues = useMemo(() => patientFormIssues(patientForm), [patientForm])

  // The regimen lives in the URL, so a link from the disease page (and a shared link) works.
  // The menu link is the calculator with no regimen in it: followed from the calculator itself, it
  // must not drop the course on screen. Only the physician's own choice takes the regimen away.
  const [keptRegimen, setKeptRegimen] = useState<string | null>(
    urlRegimen ?? (restored ? draft.regimenId : null),
  )
  if (urlRegimen !== null && urlRegimen !== keptRegimen) setKeptRegimen(urlRegimen)
  if (urlRegimen === null && pendingRegimen === null && keptRegimen !== null) {
    setPendingRegimen(keptRegimen)
  }
  const regimenId = urlRegimen ?? pendingRegimen ?? keptRegimen

  // A restored course puts its regimen back into the address, and is let go of only once the
  // address carries it: in between, the course must not be left standing with no regimen at all.
  useEffect(() => {
    if (pendingRegimen === null) return
    if (urlRegimen === pendingRegimen) {
      setPendingRegimen(null)
      return
    }
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        params.set('regimen', pendingRegimen)
        return params
      },
      { replace: true },
    )
  }, [pendingRegimen, urlRegimen, setSearchParams])

  // Everything the physician sets is kept on this device as it is set: leaving for the disease
  // pages unmounts this page, and accepting an update of the app reloads the tab — a sheet laid
  // out over four days would otherwise go with either.
  useEffect(() => {
    saveDraft(regimenId, state, personal)
  }, [regimenId, state, personal])

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
    setKeptRegimen(nextRegimenId)
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
        ? buildCourseItemsFrom(
            catalog,
            withVariants(catalog.itemsByRegimen.get(regimenId) ?? [], variants),
            chosenDoses,
            chosenModifiers,
            administrationModes,
            chosenRoutes,
          )
        : []),
      ...buildCourseItemsFrom(
        catalog,
        withVariants(customItems, variants),
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
      variants,
      chosenDoses,
      chosenModifiers,
      administrationModes,
      chosenRoutes,
    ],
  )
  const customIds = useMemo(() => customItems.map((item) => item.id), [customItems])

  // The standard supportive care the physician has switched on and the regimen does not write
  // itself: antiemetics and prophylaxis, added as ordinary rows so they are calculated, scheduled
  // and printed like the rest.
  const baseItems = useMemo(
    () =>
      applyPlans(
        applyBlockChoices(
          applyDurationChoices(
            applyBagChoices(
              [
                ...ownItems,
                ...buildCourseItemsFrom(
                  catalog,
                  withVariants(
                    standardSupportRows(
                      catalog,
                      ownItems,
                      regimenId === null
                        ? null
                        : (catalog.regimens.get(regimenId)?.cycle_length_days ?? null),
                      courseSettings.startDate,
                      support,
                      thromboAgent,
                      antiviralAgent,
                      gastroAgent,
                    ),
                    variants,
                  ),
                  chosenDoses,
                  chosenModifiers,
                  administrationModes,
                  chosenRoutes,
                ),
              ],
              chosenBags,
            ),
            chosenDurations,
          ),
          sheetChoices,
        ),
        plans,
        customIds,
      ),
    [
      catalog,
      ownItems,
      variants,
      sheetChoices,
      plans,
      customIds,
      chosenRoutes,
      chosenBags,
      chosenDurations,
      regimenId,
      courseSettings.startDate,
      support,
      thromboAgent,
      antiviralAgent,
      gastroAgent,
      chosenDoses,
      chosenModifiers,
      administrationModes,
    ],
  )

  // Days a drug is given on by two of its rows at once: said under both, not forbidden.
  const overlaps = useMemo(() => overlappingDays(baseItems, disabledIds), [baseItems, disabledIds])

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
  // A course restored from the draft opens as the physician left it: its switches are already
  // the ones they set, so the regimen does not count as newly chosen.
  const [toggledRegimen, setToggledRegimen] = useState<string | null | undefined>(
    restored ? draft.regimenId : undefined,
  )
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
    setAntiviralAgent('aciclovir')
    setGastroAgent('tablet')
    setMesnaFor([])
    // Immunoglobulin opens with the department's standard support written out above it: lines
    // a colleague edits as text. Those proposed for the previous regimen go with it.
    setManualRows((current) => [
      ...current.filter((row) => row.supportFor === undefined),
      ...ownItems
        .filter((entry) => entry.item.drug_id === IVIG_DRUG_ID && entry.item.role === 'main')
        .flatMap((entry) => ivigSupportRows(entry.item.id, entry.item.days)),
    ])
    setChosenRoutes({})
    setSheetChoices({})
    setPlans({})
    setVariants([])
    setInfusionTherapy(NO_INFUSION_THERAPY)
    const premedicationOn = premedicationOnByDefault(baseItems)
    const supportOn = new Set(indicated.flatMap((category) => categoryItemIds(ownItems, category)))
    setDisabledIds(
      optionalIds(baseItems, customItems).filter(
        (id) => !premedicationOn.has(id) && !supportOn.has(id),
      ),
    )
  }

  /** The course as a file: saved by hand, so it holds the patient as the physician typed them. */
  const saveCard = () => {
    const text = JSON.stringify(courseCard(regimenId, state), null, 2)
    // Beside the sheet: the patient's subfolder of this device's folder, the same name.
    const target = courseFileTarget(state.patientForm.fullName, new Date(), (date) =>
      t('calculator.saveFolder.fileNameFallback', { date }),
    )
    void folder
      .save(target, 'json', new TextEncoder().encode(text), COURSE_CARD_MEDIA_TYPE)
      .then(setCardSaved)
  }

  /** A course card opened from a file replaces the course on screen, regimen and all. */
  const openCard = (file: File) => {
    void file.text().then((text) => {
      const card = parseCourseCard(text)
      if (card === null) {
        setCardNote('invalid')
        return
      }
      setState(card.state)
      // The patient form reads its values at mount, and the switches are the card's own.
      setFormKey((current) => current + 1)
      setPendingRegimen(null)
      setKeptRegimen(card.regimenId)
      setToggledRegimen(card.regimenId)
      setPhaseNote(null)
      setCardNote('opened')
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          if (card.regimenId) params.set('regimen', card.regimenId)
          else params.delete('regimen')
          return params
        },
        { replace: true },
      )
    })
  }

  /**
   * A BSA typed in by hand is enough to calculate on its own: it is what every dose per square
   * metre is taken from. Height and weight are then no longer asked for — what still genuinely
   * needs them (a dose per kilogram, a creatinine clearance) says so by name when it is missing.
   */
  const enteredBsaM2 = courseSettings.bsaVariant === 'entered' ? courseSettings.bsaM2 : null
  // Only what a drug switched on actually needs holds the calculation (and the printing) up: a
  // course of flat-dose antibiotics needs no height and weight.
  const missing = useMemo(
    () =>
      missingRequirements(baseItems, {
        patient,
        disabledIds,
        bsaEntered: enteredBsaM2 !== null,
        renalBandOffIds,
      }),
    [baseItems, patient, disabledIds, enteredBsaM2, renalBandOffIds],
  )
  const measured = patient !== null && missing.length === 0

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
          infusionStart,
          renalBandOffIds,
          renalBandEveryOtherDayIds,
          renalBandLevel,
          clearanceWeight,
        },
      )
    try {
      const first = calculate(baseItems)
      const offered = cyclophosphamideMesna(catalog, baseItems, first)
      const mesnaOffered = offered.map((entry) => entry.courseDrug.anchorDrugId!)
      const mesna = offered.filter((entry) => mesnaFor.includes(entry.courseDrug.anchorDrugId!))
      const withMesna = mesna.length === 0 ? baseItems : [...baseItems, ...mesna]
      const course = mesna.length === 0 ? first : calculate(withMesna)
      // A kidney correction whose label keeps the first dose in full: day 1 becomes its own row.
      const split = withFirstFullDose(withMesna, course)
      if (split.length === withMesna.length) {
        return { items: withMesna, course, error: null, mesnaOffered }
      }
      return { items: split, course: calculate(split), error: null, mesnaOffered }
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
    infusionStart,
    renalBandOffIds,
    renalBandEveryOtherDayIds,
    renalBandLevel,
    clearanceWeight,
    mesnaFor,
  ])

  // What the labels say of the drugs switched on in this course given together.
  const interactions = useMemo(
    () =>
      courseInteractions(
        items.filter((entry) => !disabledIds.includes(entry.item.id)).map((entry) => entry.drug),
      ),
    [items, disabledIds],
  )

  const regimen = regimenId === null ? undefined : catalog.regimens.get(regimenId)
  /** «BSA 1.85 m²», or that there is none: a course of flat doses is calculated without it. */
  const bsaSummary = (result: CourseResult) =>
    result.bsa === null
      ? t('calculator.patient.bsaNone')
      : t('calculator.patient.bsaValue', { bsa: formatNumber(result.bsa.actualM2, language, 2) })
  /** Another phase picked by hand: the cycle number moves into it when it counts cycles. */
  // Phases that carry cycle numbers follow the cycle; the rest are alternatives to pick between.
  const byCycle = phases.some((phase) => phase.course?.cycles != null)
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
  // The days of the cytostatics switched on: the standard infusion is given on them by default.
  const chemoDays = useMemo(
    () => [
      ...new Set(
        items
          .filter((entry) => entry.item.role === 'main' && !disabledIds.includes(entry.item.id))
          .flatMap((entry) => entry.item.days),
      ),
    ],
    [items, disabledIds],
  )
  // The support written out for an immunoglobulin follows the drug onto the sheet it is moved to;
  // the standard infusion stands above the course's own drugs, as it is given before them.
  const sheetManualRows = useMemo(
    () => [
      ...infusionTherapyRows(
        infusionTherapy,
        [...chemoDays].sort((a, b) => a - b),
        Number(courseSettings.dayStart.split(':')[0]) || 0,
      ),
      ...manualRows.map((row) =>
        row.supportFor !== undefined && sheetChoices[row.supportFor] === 'ward'
          ? { ...row, block: 'ward' as const }
          : row,
      ),
    ],
    [manualRows, sheetChoices, infusionTherapy, chemoDays, courseSettings.dayStart],
  )
  /** Hand-written lines that actually say something; an empty one is not a sheet. */
  const written = sheetManualRows.filter((row) => row.what.trim() !== '')

  const sheetReady = course !== null || written.length > 0

  // Drugs that ask for premedication and get none on one of their days.
  const premedicationMissing = unpremedicated(items, disabledIds)
  /** What the physician set against the protocol: shown as a list, and taken back from it. */
  const deviations = useMemo(
    () => collectDeviations(items, state, language),
    [items, state, language],
  )
  // The same drugs, written out for the check before printing: name and the days without it.
  const premedicationLines = items
    .filter((entry) => premedicationMissing.has(entry.item.id))
    .map(
      (entry) =>
        `${localize(entry.drug.name, language)} — ${t('calculator.doses.premedMissing', {
          days: premedicationMissing.get(entry.item.id)!.join(', '),
        })}`,
    )
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
          <PatientForm key={formKey} initialValues={patientForm} onChange={set.patientForm} />
          <CourseSettings catalog={catalog} value={settings} onChange={updateSettings} />
          <CourseDraft
            personal={personal}
            onPersonal={(allowed) => {
              setPersonal(allowed)
              setPersonalInDraft(allowed)
            }}
            onSave={saveCard}
            onOpen={openCard}
            note={cardNote}
            saved={cardSaved}
          />
          <SaveFolderCard />
          {ownItems.length > 0 && (
            <StandardSupport
              items={ownItems}
              value={support}
              onChange={onSupport}
              thromboAgent={thromboAgent}
              onThromboAgent={setThromboAgent}
              antiviralAgent={antiviralAgent}
              onAntiviralAgent={setAntiviralAgent}
              gastroAgent={gastroAgent}
              onGastroAgent={setGastroAgent}
            >
              <InfusionTherapyControls
                value={infusionTherapy}
                onChange={setInfusionTherapy}
                chemoDays={chemoDays}
                dayStart={courseSettings.dayStart}
              />
            </StandardSupport>
          )}
        </Stack>
      </aside>

      <Stack gap="sm" className={classes.results}>
        {phases.length > 1 && (
          <Card withBorder>
            <Stack gap={6}>
              <Text fw={600}>
                {t(byCycle ? 'calculator.course.phases' : 'calculator.course.modes', {
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
                  : t(byCycle ? 'calculator.course.phasesHint' : 'calculator.course.modesHint')}
              </Text>
            </Stack>
          </Card>
        )}
        {regimen && <RegimenEvidence regimen={regimen} />}

        {!measured && items.length > 0 && (
          <MissingDataAlert items={items} missing={missing} invalid={patientIssues} />
        )}
        {measured && course && (
          <UnadjustedSupportAlert items={items} patient={patient} disabledIds={disabledIds} />
        )}

        {error !== null && (
          <Alert color="red" title={t('calculator.error.title')}>
            {error instanceof DomainInputError && /aminoglycoside/.test(error.message) ? (
              <Text size="sm">{t('calculator.error.dosingWeight')}</Text>
            ) : (
              <>
                <Text size="sm">{(error as Error).message}</Text>
                {error instanceof DomainInputError && (
                  <Text size="sm">{t('calculator.error.field', { field: error.field })}</Text>
                )}
              </>
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
                        bsa: bsaSummary(course),
                      })
                    : t('calculator.patient.summary', {
                        bsa: bsaSummary(course),
                        crcl: `${formatNumber(course.creatinineClearanceMlMin, language, 1)} ${t('units.ml_min')}`,
                      })}
                </Text>
                <Text size="xs" c="dimmed">
                  {t('warning.noDoseChange')}
                </Text>
              </Group>
              {course.clearanceWeights && (
                <Stack gap={4} mt="xs">
                  <Group gap="sm" wrap="wrap">
                    <Text size="sm">{t('calculator.patient.clearanceWeight.label')}</Text>
                    <SegmentedControl
                      size="xs"
                      value={course.clearanceWeights.basis}
                      onChange={(value) => setClearanceWeight(value as ClearanceWeight)}
                      data={[
                        {
                          value: 'actual',
                          label: t('calculator.patient.clearanceWeight.actual', {
                            crcl: formatNumber(course.clearanceWeights.actualMlMin, language, 0),
                          }),
                        },
                        {
                          value: 'adjusted',
                          label: t('calculator.patient.clearanceWeight.adjusted', {
                            kg: formatNumber(course.clearanceWeights.adjustedKg, language, 1),
                            crcl: formatNumber(course.clearanceWeights.adjustedMlMin, language, 0),
                          }),
                        },
                      ]}
                    />
                  </Group>
                  <Text size="xs" c="dimmed">
                    {t('calculator.patient.clearanceWeight.hint', {
                      bmi: formatNumber(course.clearanceWeights.bmi, language, 1),
                    })}
                  </Text>
                </Stack>
              )}
            </Card>
            <WarningList warnings={course.warnings} />
            <InteractionList interactions={interactions} />
          </>
        )}

        <DeviationSummary
          deviations={deviations}
          onRevert={(deviation) => setState((current) => revertDeviation(current, deviation))}
          onRevertAll={() => setState((current) => revertAll(current, deviations))}
        />

        {/* Every block stays mounted while its tab is hidden, so nothing typed is lost by
            switching tabs; only one of them is on screen at a time. */}
        <Tabs defaultValue="doses" keepMountedMode="display-none">
          <Tabs.List>
            <Tabs.Tab value="doses">{t('calculator.tabs.doses')}</Tabs.Tab>
            <Tabs.Tab value="schedule">{t('calculator.tabs.schedule')}</Tabs.Tab>
            <Tabs.Tab value="supply">{t('calculator.tabs.supply')}</Tabs.Tab>
            <Tabs.Tab value="preparation">{t('calculator.tabs.preparation')}</Tabs.Tab>
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
                  plans={plans}
                  onPlan={(id, patch) =>
                    setPlans((current) => {
                      const { [id]: own, ...rest } = current
                      return patch === null ? rest : { ...rest, [id]: { ...own, ...patch } }
                    })
                  }
                  onVariant={(id) =>
                    setVariants((current) => [...current, nextVariantId(variantBase(id), current)])
                  }
                  overlaps={overlaps}
                  sheetChoices={sheetChoices}
                  onSheet={(id, sheet) =>
                    setSheetChoices((current) => ({ ...current, [id]: sheet }))
                  }
                  mesnaAdded={mesnaFor}
                  ivigSupportAdded={[
                    ...new Set(
                      manualRows.flatMap((row) => (row.supportFor ? [row.supportFor] : [])),
                    ),
                  ]}
                  onIvigSupport={(id, on) => {
                    const item = items.find((entry) => entry.item.id === id)
                    setManualRows((current) => [
                      ...current.filter((row) => row.supportFor !== id),
                      ...(on && item ? ivigSupportRows(id, item.item.days) : []),
                    ])
                  }}
                  onIvigSupportEdit={() => {
                    setManualOpenRequest((current) => current + 1)
                    document
                      .getElementById(MANUAL_ROWS_ANCHOR)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
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
                  customIds={customIds}
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
                  chosenDurations={chosenDurations}
                  renalBandOffIds={renalBandOffIds}
                  onRenalBandLevel={(id, level) =>
                    setRenalBandLevel((current) => ({ ...current, [id]: level }))
                  }
                  onRenalBandEveryOtherDay={(id, on) =>
                    setRenalBandEveryOtherDayIds((current) =>
                      on
                        ? [...current.filter((entry) => entry !== id), id]
                        : current.filter((entry) => entry !== id),
                    )
                  }
                  onRenalBandOff={(id, off) =>
                    setRenalBandOffIds((current) =>
                      off
                        ? [...current.filter((entry) => entry !== id), id]
                        : current.filter((entry) => entry !== id),
                    )
                  }
                  onDurationChoice={(id, minutes) =>
                    setChosenDurations((current) => {
                      const { [id]: _removed, ...rest } = current
                      return minutes === null ? rest : { ...rest, [id]: minutes }
                    })
                  }
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
                    isVariant(id)
                      ? setVariants((current) => current.filter((entry) => entry !== id))
                      : setCustomItems((current) => current.filter((item) => item.id !== id))
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
                  manualRows={sheetManualRows}
                  startDateIso={courseSettings.startDate}
                />
              ) : (
                <Text size="sm" c="dimmed">
                  {t('calculator.tabs.empty')}
                </Text>
              )}
              <ManualRows
                rows={manualRows}
                onChange={setManualRows}
                openRequest={manualOpenRequest}
              />
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

          <Tabs.Panel value="preparation" pt="sm">
            {/* The label text needs no patient: it is there as soon as a regimen is. */}
            {items.length > 0 ? (
              <PreparationTable catalog={catalog} items={items} disabledIds={disabledIds} />
            ) : (
              <Text size="sm" c="dimmed">
                {t('calculator.tabs.empty')}
              </Text>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="print" pt="sm">
            <Stack gap="sm">
              {/* Read before the file is made, not after: the alerts of the course stand on the
                  doses tab, and the physician prints from here. */}
              {sheetReady && (
                <PrintCheck
                  deviations={deviations}
                  premedication={premedicationLines}
                  irradiated={irradiation.length > 0}
                />
              )}
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
                  manualRows={sheetManualRows}
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
