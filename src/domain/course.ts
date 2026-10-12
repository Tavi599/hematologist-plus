import { calculateBsa, enteredBsa, mostellerBsa, type BsaResult } from './bsa'
import { DOMAIN_DEFAULTS } from './config'
import { calculateDoseVariants, type DoseSpec, type DoseVariants } from './dosing'
import { dosingWeight, type DosingWeightRule } from './dosing-weight'
import {
  calculateInfusion,
  type InfusionParams,
  type InfusionResult,
  type RampDurations,
} from './infusion'
import {
  selectPresentations,
  sumSelections,
  type PackSelection,
  type Presentation,
  type PresentationCount,
} from './presentations'
import { clearanceWeightOf, cockcroftGault, type ClearanceWeight } from './renal'
import {
  applyRenalBand,
  type RenalAdjustment,
  type RenalBand,
  type RenalBandLevel,
} from './renal-bands'
import { roundDose, type RoundingResult } from './rounding'
import {
  courseDayDates,
  scheduleAdministrations,
  untimedIds,
  type ScheduledAdministration,
} from './schedule'
import { amountUnitOf, convertAmount, doseBasisOf, type UnitEquivalence } from './units'
import {
  DomainInputError,
  type AmountUnit,
  type CalculationStep,
  type CreatinineUnit,
  type ScheduleBlock,
  type Sex,
} from './types'
import {
  checkPatientInputs,
  suggestDoseReview,
  type DomainWarning,
  type ReviewRules,
} from './warnings'

/** Which BSA the doses for vials, infusions and printing are taken from. */
export type BsaVariant = 'actual' | 'capped'

export interface CoursePatient {
  /** Needed for the creatinine clearance and for the age-based review hints. */
  ageYears?: number
  /** Needed for the creatinine clearance; never assumed. */
  sex?: Sex
  /** Needed for the Mosteller BSA; not needed at all when the BSA is entered by hand. */
  heightCm?: number
  /** Needed for the Mosteller BSA, for doses per kilogram and for the creatinine clearance. */
  weightKg?: number
  serumCreatinine?: number
  creatinineUnit?: CreatinineUnit
  bilirubinUmolL?: number
}

/** One drug of the course: regimen item joined with what the drug catalog knows about it. */
export interface CourseDrug {
  /** Regimen item id; unique within the course. */
  id: string
  dose: DoseSpec
  /** Course days this drug is given on. */
  days: number[]
  administrationsPerDay?: number
  durationMin?: number
  gapBeforeMin?: number
  /** Which sheet this row belongs to and how its time is set; `infusion` by default. */
  block?: ScheduleBlock
  /** `day_support`: minutes from the day's first chained drug; negative is before it. */
  anchorOffsetMin?: number
  /** `day_support`: minutes between the repeats within one day (q8h = 480). */
  intervalMin?: number
  /** `day_support`: id of the course drug whose start this row is timed from on its days. */
  anchorDrugId?: string
  /** A drug of the regimen itself: the support of the day is timed from the first of these. */
  isMain?: boolean
  /** Set only for infusions; without it no solvent volume is calculated. */
  infusion?: InfusionParams
  /**
   * Infusions of one drug at a rising rate are counted together across the regimen's rows
   * (daratumumab's split first dose and its later weeks are two rows): `key` is the drug.
   * `splitFirst`: doses on consecutive days of the first infusion are halves of it.
   */
  infusionSeries?: { key: string; splitFirst: boolean }
  presentations?: Presentation[]
  /** Never split a pack: the rounded dose goes up to whole packs of the smallest strength. */
  roundUpToWholePack?: boolean
  reviewRules?: ReviewRules
  /** What this drug's label says its mass is worth in activity; the only bridge between them. */
  unitEquivalence?: UnitEquivalence | null
  /** Which weight a dose per kilogram is given on; the actual one unless the drug says otherwise. */
  dosingWeight?: DosingWeightRule
  /** Rounding step of the dose, in its own unit (vancomycin 250 mg); the default step otherwise. */
  roundingStep?: number
  /** The label's dose and interval by creatinine clearance, for the regimen's own dose. */
  renalBands?: RenalBand[]
  /** The item has such ranges, but another dose is in force they were not written for. */
  renalBandsNotForDose?: boolean
}

export interface CourseAdjustments {
  /** Day 1 of the course, YYYY-MM-DD. */
  startDateIso: string
  /** Start of the treatment day, HH:MM. */
  dayStart?: string
  /**
   * Which cycle of the regimen this is. Only the first infusion of a drug given at a rising
   * rate is slower; from cycle 2 the faster restart applies.
   */
  cycleNumber?: number
  bsaVariant?: BsaVariant
  /** BSA entered by the physician, m²; replaces Mosteller for the whole course. */
  bsaM2?: number
  /** Reduction applied to every drug, %. */
  coursePercent?: number
  /** Per-drug reduction by item id, %; replaces the course reduction for that drug. */
  drugPercent?: Record<string, number>
  /**
   * Dose the physician typed by hand, in the drug's own unit, by item id. It replaces the
   * calculated dose entirely — vials, solvent and rate follow it — and the chain shows what
   * was calculated.
   */
  doseOverrideAmount?: Record<string, number>
  /** Item ids the physician switched off. */
  disabledIds?: string[]
  /** Manual time shift by item id, min; later administrations of the day move with it. */
  shiftMin?: Record<string, number>
  /**
   * Which infusion of the drug the course opens with, by series key (the drug): 1 the first,
   * 2 the second, 3 any later one. Absent: cycle 1 opens with the first, a later cycle with a
   * later one. A course edited by hand need not start at cycle 1.
   */
  infusionStart?: Record<string, number>
  /** Item ids whose correction by creatinine clearance the physician switched off. */
  renalBandOffIds?: string[]
  /** Which weight the creatinine clearance is worked out on; the actual one when absent. */
  clearanceWeight?: ClearanceWeight
  /** Item ids given the regimen's full dose every other day instead of a lower daily one. */
  renalBandEveryOtherDayIds?: string[]
  /** Where in the label's range of a corrected dose the physician put it, by item id. */
  renalBandLevel?: Record<string, RenalBandLevel>
}

/**
 * Which rate a dose of a drug at a rising rate runs at: the first infusion (its undivided dose
 * in the larger bag where the drug has one), a half of a split first dose, the second, a later.
 */
export type RampKind = 'first' | 'first_split' | 'second' | 'next'

/** The infusion a course opens with when the physician has not said: 1 in cycle 1, else later. */
export function defaultInfusionStart(cycleNumber: number | undefined): number {
  return (cycleNumber ?? 1) === 1 ? 1 : 3
}

/**
 * The kind of every dose of the drugs given at a rising rate, by item id and day. The doses of
 * one drug are counted together in day order; consecutive days of a split first dose count as
 * one infusion.
 */
export function rampKinds(
  drugs: readonly CourseDrug[],
  adjustments: Pick<CourseAdjustments, 'cycleNumber' | 'infusionStart'>,
): Record<string, Record<number, RampKind>> {
  const series = new Map<string, CourseDrug[]>()
  for (const drug of drugs) {
    if (!drug.infusionSeries || !drug.infusion?.rateRamp) continue
    const key = drug.infusionSeries.key
    series.set(key, [...(series.get(key) ?? []), drug])
  }
  const kinds: Record<string, Record<number, RampKind>> = {}
  for (const [key, members] of series) {
    const start = adjustments.infusionStart?.[key] ?? defaultInfusionStart(adjustments.cycleNumber)
    const splitFirst = members.some((drug) => drug.infusionSeries!.splitFirst)
    const days = [...new Set(members.flatMap((drug) => drug.days))].sort((a, b) => a - b)
    // Infusion number of each day: a split first dose shares the number of the day before.
    const ordinal = new Map<number, number>()
    let current = start - 1
    days.forEach((day, index) => {
      const joined = splitFirst && index > 0 && current === 1 && day === days[index - 1]! + 1
      if (!joined) current += 1
      ordinal.set(day, current)
    })
    const halves = new Set(
      days.filter(
        (day) =>
          ordinal.get(day) === 1 && days.some((other) => other !== day && ordinal.get(other) === 1),
      ),
    )
    for (const drug of members) {
      kinds[drug.id] = Object.fromEntries(
        drug.days.map((day) => {
          const n = ordinal.get(day)!
          const kind: RampKind =
            n === 1 ? (halves.has(day) ? 'first_split' : 'first') : n === 2 ? 'second' : 'next'
          return [day, kind]
        }),
      )
    }
  }
  return kinds
}

/** Minutes a dose of the given kind takes: an undivided first dose runs in its larger bag. */
export function rampDurationMin(ramp: RampDurations, kind: RampKind): number {
  if (kind === 'first') return (ramp.firstWhole?.ramp ?? ramp.first).durationMin
  if (kind === 'first_split') return ramp.first.durationMin
  return ramp[kind].durationMin
}

export interface CourseDrugResult {
  id: string
  /** Doses on actual BSA and on BSA capped at 2.0 m², both shown to the physician. */
  variants: DoseVariants
  rounded: Record<BsaVariant, RoundingResult>
  /** Unit every amount of this drug is in (from its dose unit). */
  amountUnit: AmountUnit
  /** Rounded dose of the selected BSA variant — the one used below and for printing. */
  doseAmount: number
  administrationsPerDay: number
  administrationsInCourse: number
  /** Whole vials/tablets for one administration; null without presentations. */
  pack: PackSelection | null
  /** Need for the whole course. */
  packTotals: PresentationCount[]
  infusion: InfusionResult | null
  warnings: DomainWarning[]
  /** What the creatinine clearance did to the dose and interval; null for a drug without ranges. */
  renal: RenalAdjustment | null
  /** BSA → dose → cap → reduction → rounding, for the selected variant. */
  steps: CalculationStep[]
}

export interface CourseAdministrationResult extends ScheduledAdministration {
  /** Regimen item id (the schedule id also carries the administration number). */
  drugId: string
}

export interface CourseDayResult {
  day: number
  date: string
  administrations: CourseAdministrationResult[]
  /** Drugs of this day that carry no clock time: the inpatient sheet. */
  untimed: string[]
  presentations: PresentationCount[]
}

export interface CourseResult {
  /** What the creatinine clearance did to each drug that has ranges for it, by item id. */
  renal: Record<string, RenalAdjustment>
  bsa: BsaResult
  creatinineClearanceMlMin: number | null
  /**
   * The clearance on either weight, for a patient with obesity whose adjusted weight differs:
   * the physician sees both and chooses. Null where only the actual weight applies.
   */
  clearanceWeights: {
    basis: ClearanceWeight
    bmi: number
    adjustedKg: number
    actualMlMin: number
    adjustedMlMin: number
  } | null
  drugs: CourseDrugResult[]
  days: CourseDayResult[]
  /** Vials and tablets needed for the whole course. */
  presentationTotals: PresentationCount[]
  /** Patient-level warnings (implausible input, capped BSA). */
  warnings: DomainWarning[]
  steps: CalculationStep[]
  /** Which rate each dose of a drug at a rising rate runs at, by item id and day. */
  rampKinds: Record<string, Record<number, RampKind>>
}

/**
 * Calculates a whole course: BSA and renal function once, then every enabled drug
 * (both BSA variants, vials, infusion), the day calendar with the hourly schedule
 * and the need for the course. Pure: no patient data leaves this function.
 */
export function calculateCourse(
  patient: CoursePatient,
  drugs: CourseDrug[],
  adjustments: CourseAdjustments,
): CourseResult {
  const variant: BsaVariant = adjustments.bsaVariant ?? 'actual'
  const disabled = new Set(adjustments.disabledIds ?? [])
  const enabled = drugs.filter((drug) => !disabled.has(drug.id))
  assertUniqueIds(enabled)

  const bsa =
    adjustments.bsaM2 === undefined ? mostellerFor(patient) : enteredBsa(adjustments.bsaM2)
  // Cockcroft-Gault needs an age and a weight. Without them there is no clearance to check
  // against — said out loud below, never passed off as «no concern».
  const clearanceOn = (weightKg: number) =>
    patient.serumCreatinine === undefined ||
    patient.ageYears === undefined ||
    patient.sex === undefined
      ? null
      : cockcroftGault({
          ageYears: patient.ageYears,
          weightKg,
          sex: patient.sex,
          serumCreatinine: patient.serumCreatinine,
          creatinineUnit: patient.creatinineUnit ?? 'umol_l',
        })
  const clearanceWeight =
    patient.weightKg === undefined || patient.sex === undefined
      ? null
      : clearanceWeightOf(
          {
            weightKg: patient.weightKg,
            sex: patient.sex,
            ...(patient.heightCm === undefined ? {} : { heightCm: patient.heightCm }),
          },
          adjustments.clearanceWeight ?? 'actual',
        )
  const renalOn = clearanceWeight === null ? null : clearanceOn(clearanceWeight.weightKg)
  const renal =
    renalOn === null || clearanceWeight === null
      ? null
      : { mlMin: renalOn.mlMin, steps: [...clearanceWeight.steps, ...renalOn.steps] }
  const clearanceWeights =
    renal === null ||
    clearanceWeight === null ||
    clearanceWeight.adjustedKg === null ||
    clearanceWeight.bmi === null
      ? null
      : {
          basis: clearanceWeight.basis,
          bmi: clearanceWeight.bmi,
          adjustedKg: clearanceWeight.adjustedKg,
          actualMlMin: clearanceOn(patient.weightKg!)!.mlMin,
          adjustedMlMin: clearanceOn(clearanceWeight.adjustedKg)!.mlMin,
        }

  const warnings = checkPatientInputs({
    ageYears: patient.ageYears,
    heightCm: patient.heightCm,
    weightKg: patient.weightKg,
    creatinineUmolL:
      patient.creatinineUnit === 'mg_dl' || patient.serumCreatinine === undefined
        ? undefined
        : patient.serumCreatinine,
  })
  if (bsa.isCapped) {
    warnings.push({
      code: 'bsa.capped',
      params: { actualM2: bsa.actualM2, capM2: bsa.capM2 },
    })
  }
  if (patient.serumCreatinine !== undefined && renal === null) {
    warnings.push({
      code: 'review.clearanceUnknown',
      params: {
        field:
          patient.ageYears === undefined
            ? 'ageYears'
            : patient.weightKg === undefined
              ? 'weightKg'
              : 'sex',
      },
    })
  }
  if (patient.ageYears === undefined && enabled.some((drug) => drug.reviewRules?.elderly)) {
    warnings.push({ code: 'review.ageUnknown', params: {} })
  }
  // A hand-entered BSA is used as given, but a typed digit is worth catching: say so when it
  // disagrees with the height and weight on the same form.
  if (
    adjustments.bsaM2 !== undefined &&
    patient.heightCm !== undefined &&
    patient.weightKg !== undefined
  ) {
    const mosteller = mostellerBsa(patient.heightCm, patient.weightKg)
    const differencePercent = Math.abs((adjustments.bsaM2 - mosteller) / mosteller) * 100
    if (differencePercent > DOMAIN_DEFAULTS.enteredBsaDifferencePercent) {
      warnings.push({
        code: 'bsa.enteredDiffers',
        params: {
          enteredM2: adjustments.bsaM2,
          calculatedM2: mosteller,
          differencePercent,
        },
      })
    }
  }

  const reviewContext = {
    ...(patient.ageYears === undefined ? {} : { ageYears: patient.ageYears }),
    ...(renal ? { creatinineClearanceMlMin: renal.mlMin } : {}),
    ...(patient.bilirubinUmolL === undefined ? {} : { bilirubinUmolL: patient.bilirubinUmolL }),
  }

  // The label's dose and interval for the clearance replace the regimen's before anything else:
  // vials, solvent and the hourly schedule all follow the corrected drug.
  const renalOff = new Set(adjustments.renalBandOffIds ?? [])
  const allBanded = enabled.map((drug) =>
    applyRenalBand(
      drug,
      renal?.mlMin,
      renalOff.has(drug.id),
      adjustments.renalBandLevel?.[drug.id],
      adjustments.renalBandEveryOtherDayIds?.includes(drug.id) ?? false,
    ),
  )
  // A range that gives no dose leaves the drug out, as if switched off; its row says why.
  const banded = allBanded.filter((entry) => !entry.withheld)
  const adjusted = banded.map((entry) => entry.drug)
  const renalById = Object.fromEntries(
    allBanded.flatMap((entry) => (entry.adjustment ? [[entry.drug.id, entry.adjustment]] : [])),
  ) as Record<string, RenalAdjustment>
  const results = banded.map(({ drug, adjustment, steps, warnings: renalWarnings }) => ({
    ...calculateDrug(drug, {
      patient,
      bsa,
      variant,
      gfrMlMin: renal?.mlMin,
      reviewContext,
      ...(adjustments.doseOverrideAmount?.[drug.id] === undefined
        ? {}
        : { overrideAmount: adjustments.doseOverrideAmount[drug.id] }),
      reduction: {
        ...(adjustments.coursePercent === undefined
          ? {}
          : { coursePercent: adjustments.coursePercent }),
        ...(adjustments.drugPercent?.[drug.id] === undefined
          ? {}
          : { drugPercent: adjustments.drugPercent[drug.id] }),
      },
      renalSteps: steps,
      renalWarnings,
      renal: adjustment,
    }),
  }))
  const resultById = new Map(results.map((result) => [result.id, result]))
  const kinds = rampKinds(adjusted, adjustments)

  return {
    rampKinds: kinds,
    renal: renalById,
    bsa,
    creatinineClearanceMlMin: renal?.mlMin ?? null,
    clearanceWeights,
    drugs: results,
    days: buildDays(adjusted, resultById, adjustments, kinds),
    presentationTotals: sumSelections(
      results.flatMap((result) =>
        result.pack ? [scaleSelection(result.pack, result.administrationsInCourse)] : [],
      ),
    ),
    warnings,
    steps: [...bsa.steps, ...(renal?.steps ?? [])],
  }
}

/**
 * BSA from height and weight. Both are needed here and nowhere else in the course: a physician
 * who has the BSA on the previous cycle's sheet types it in instead, and the calculation runs
 * without them.
 */
function mostellerFor(patient: CoursePatient): BsaResult {
  if (patient.heightCm === undefined || patient.weightKg === undefined) {
    throw new DomainInputError(
      patient.heightCm === undefined ? 'heightCm' : 'weightKg',
      'is required unless the BSA is entered by hand',
    )
  }
  return calculateBsa(patient.heightCm, patient.weightKg)
}

interface DrugContext {
  patient: CoursePatient
  bsa: BsaResult
  variant: BsaVariant
  gfrMlMin: number | undefined
  reviewContext: { ageYears?: number; creatinineClearanceMlMin?: number; bilirubinUmolL?: number }
  reduction: { coursePercent?: number; drugPercent?: number }
  /** Dose typed by the physician for this drug, in the drug's own unit. */
  overrideAmount?: number
  /** The correction by creatinine clearance already applied to the drug, and what it said. */
  renalSteps: CalculationStep[]
  renalWarnings: DomainWarning[]
  renal: RenalAdjustment | null
}

function calculateDrug(drug: CourseDrug, context: DrugContext): CourseDrugResult {
  const { bsa, variant } = context
  if (drug.days.length === 0) throw new DomainInputError(`${drug.id}.days`, 'at least one day')
  const administrationsPerDay = drug.administrationsPerDay ?? 1
  if (!Number.isInteger(administrationsPerDay) || administrationsPerDay < 1) {
    throw new DomainInputError(`${drug.id}.administrationsPerDay`, 'must be a positive integer')
  }
  if (drug.dose.unit === 'auc' && context.gfrMlMin === undefined) {
    throw new DomainInputError('serumCreatinine', 'required for AUC doses (Calvert)')
  }

  // A dose per kilogram of an aminoglycoside goes on the ideal or adjusted weight, not the actual.
  const weight =
    doseBasisOf(drug.dose.unit) === 'kg' &&
    drug.dosingWeight !== undefined &&
    drug.dosingWeight !== 'actual' &&
    context.patient.weightKg !== undefined
      ? dosingWeight(drug.dosingWeight, {
          weightKg: context.patient.weightKg,
          ...(context.patient.heightCm === undefined ? {} : { heightCm: context.patient.heightCm }),
          ...(context.patient.sex === undefined ? {} : { sex: context.patient.sex }),
        })
      : null
  const variants = calculateDoseVariants(
    drug.dose,
    bsa,
    {
      weightKg: weight?.weightKg ?? context.patient.weightKg,
      ...(context.gfrMlMin === undefined ? {} : { gfrMlMin: context.gfrMlMin }),
    },
    context.reduction,
  )
  // Pack strengths are stored in the unit of the drug, the dose in the unit the regimen writes.
  // They are almost always the same; when they are not, only an exact conversion is allowed.
  const amountUnit = amountUnitOf(drug.dose.unit)
  const presentations = drug.presentations?.map((presentation) => ({
    ...presentation,
    strengthAmount: convertAmount(
      presentation.strengthAmount,
      presentation.unit ?? amountUnit,
      amountUnit,
      drug.unitEquivalence,
    ),
    unit: amountUnit,
  }))
  const roundingOptions = {
    unit: amountUnit,
    ...(drug.roundingStep === undefined ? {} : { step: drug.roundingStep }),
    ...(presentations ? { presentations } : {}),
    ...(drug.roundUpToWholePack ? { roundUpToWholePack: true } : {}),
  }
  const rounded: Record<BsaVariant, RoundingResult> = {
    actual: roundDose(variants.actual.doseAmount, roundingOptions),
    capped: roundDose(variants.capped.doseAmount, roundingOptions),
  }
  const calculatedAmount = rounded[variant].roundedAmount
  const overrideAmount = context.overrideAmount
  if (overrideAmount !== undefined && (!Number.isFinite(overrideAmount) || overrideAmount <= 0)) {
    throw new DomainInputError(
      `${drug.id}.doseOverrideAmount`,
      `must be a positive number of ${amountUnit}`,
    )
  }
  const doseAmount = overrideAmount ?? calculatedAmount

  const pack =
    presentations && presentations.length > 0
      ? selectPresentations(doseAmount, presentations)
      : null
  const infusion = drug.infusion
    ? calculateInfusion({
        doseAmount,
        amountUnit,
        params: drug.infusion,
        ...(drug.durationMin === undefined ? {} : { durationMin: drug.durationMin }),
      })
    : null

  // A drug corrected by the label's ranges needs no «consider a reduction» on the same clearance.
  const warnings = [
    ...context.renalWarnings,
    ...suggestDoseReview(context.reviewContext, drug.reviewRules ?? {}).filter(
      (warning) =>
        warning.code !== 'review.lowCreatinineClearance' ||
        context.renal === null ||
        context.renal.status === 'unchecked' ||
        context.renal.status === 'notForDose',
    ),
  ]
  if (variants[variant].isCapped) {
    warnings.push({
      code: 'dose.capped',
      params: {
        capAmount: drug.dose.capAmount ?? 0,
        baseAmount: variants[variant].baseAmount,
        unit: amountUnit,
      },
    })
  }
  if (infusion?.issue === 'concentration_out_of_range') {
    warnings.push({
      code: 'infusion.concentrationOutOfRange',
      params: {
        concentration: infusion.concentrationPerMl,
        unit: `${infusion.concentrationUnit}_ml`,
      },
    })
  }

  return {
    id: drug.id,
    variants,
    rounded,
    amountUnit,
    doseAmount,
    administrationsPerDay,
    administrationsInCourse: drug.days.length * administrationsPerDay,
    pack,
    packTotals: pack ? scaleSelection(pack, drug.days.length * administrationsPerDay).items : [],
    infusion,
    warnings,
    renal: context.renal,
    steps: [
      ...context.renalSteps,
      ...bsa.steps,
      ...(weight?.steps ?? []),
      ...variants[variant].steps,
      ...rounded[variant].steps,
      ...(overrideAmount === undefined
        ? []
        : [
            {
              key: 'dose.manual' as const,
              value: overrideAmount,
              unit: amountUnit,
              params: { calculated: calculatedAmount, unit: amountUnit },
            },
          ]),
      ...(infusion?.steps ?? []),
    ],
  }
}

function buildDays(
  drugs: CourseDrug[],
  results: Map<string, CourseDrugResult>,
  adjustments: CourseAdjustments,
  kinds: Record<string, Record<number, RampKind>>,
): CourseDayResult[] {
  const dayNumbers = [...new Set(drugs.flatMap((drug) => drug.days))]
  const dayStart = adjustments.dayStart ?? DEFAULT_DAY_START

  return courseDayDates(adjustments.startDateIso, dayNumbers).map(({ day, date }) => {
    const onDay = drugs.filter((drug) => drug.days.includes(day))
    const drugOfInput = new Map<string, string>()
    const inputs = onDay.flatMap((drug) => {
      const result = results.get(drug.id)!
      return Array.from({ length: result.administrationsPerDay }, (_, index) => {
        const id = result.administrationsPerDay === 1 ? drug.id : `${drug.id}#${index + 1}`
        drugOfInput.set(id, drug.id)
        const ramp = result.infusion?.ramp
        const kind = index === 0 ? (kinds[drug.id]?.[day] ?? 'next') : 'next'
        return {
          id,
          block: drug.block ?? 'infusion',
          ...(drug.isMain === undefined ? {} : { isMain: drug.isMain }),
          durationMin: ramp
            ? rampDurationMin(ramp, kind)
            : (result.infusion?.durationMin ?? drug.durationMin ?? 0),
          occurrence: index,
          ...(drug.gapBeforeMin === undefined ? {} : { gapBeforeMin: drug.gapBeforeMin }),
          ...(drug.anchorOffsetMin === undefined ? {} : { anchorOffsetMin: drug.anchorOffsetMin }),
          ...(drug.intervalMin === undefined ? {} : { intervalMin: drug.intervalMin }),
          ...(drug.anchorDrugId === undefined ? {} : { anchorId: drug.anchorDrugId }),
          ...(adjustments.shiftMin?.[drug.id] === undefined
            ? {}
            : { shiftMin: adjustments.shiftMin[drug.id] }),
        }
      })
    })

    return {
      day,
      date,
      administrations: scheduleAdministrations(dayStart, inputs).map((item) => ({
        ...item,
        drugId: drugOfInput.get(item.id)!,
      })),
      // Tablets and everything else on the inpatient sheet: a count for the day, no clock time.
      untimed: [...new Set(untimedIds(inputs).map((id) => drugOfInput.get(id)!))],
      presentations: sumSelections(
        onDay.flatMap((drug) => {
          const result = results.get(drug.id)!
          return result.pack ? [scaleSelection(result.pack, result.administrationsPerDay)] : []
        }),
      ),
    }
  })
}

/** Default start of the first infusion of the day (not earlier than 11:00); corrected by hand in the settings. */
export const DEFAULT_DAY_START = '11:00'

function scaleSelection(selection: PackSelection, factor: number): PackSelection {
  return {
    items: selection.items.map((item) => ({ ...item, count: item.count * factor })),
    totalAmount: selection.totalAmount * factor,
    wasteAmount: selection.wasteAmount * factor,
    unitCount: selection.unitCount * factor,
  }
}

function assertUniqueIds(drugs: CourseDrug[]): void {
  const seen = new Set<string>()
  for (const drug of drugs) {
    if (seen.has(drug.id)) throw new DomainInputError('drugs', `duplicate drug id "${drug.id}"`)
    seen.add(drug.id)
  }
}
