import { calculateBsa, type BsaResult } from './bsa'
import { calculateDoseVariants, type DoseSpec, type DoseVariants } from './dosing'
import { calculateInfusion, type InfusionParams, type InfusionResult } from './infusion'
import {
  selectPresentations,
  sumSelections,
  type PackSelection,
  type Presentation,
  type PresentationCount,
} from './presentations'
import { cockcroftGault } from './renal'
import { roundDose, type RoundingResult } from './rounding'
import { courseDayDates, scheduleAdministrations, type ScheduledAdministration } from './schedule'
import { amountUnitOf, convertAmount } from './units'
import {
  DomainInputError,
  type AmountUnit,
  type CalculationStep,
  type CreatinineUnit,
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
  ageYears: number
  sex: Sex
  heightCm: number
  weightKg: number
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
  /** Set only for infusions; without it no solvent volume is calculated. */
  infusion?: InfusionParams
  presentations?: Presentation[]
  reviewRules?: ReviewRules
}

export interface CourseAdjustments {
  /** Day 1 of the course, YYYY-MM-DD. */
  startDateIso: string
  /** Start of the treatment day, HH:MM. */
  dayStart?: string
  bsaVariant?: BsaVariant
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
  presentations: PresentationCount[]
}

export interface CourseResult {
  bsa: BsaResult
  creatinineClearanceMlMin: number | null
  drugs: CourseDrugResult[]
  days: CourseDayResult[]
  /** Vials and tablets needed for the whole course. */
  presentationTotals: PresentationCount[]
  /** Patient-level warnings (implausible input, capped BSA). */
  warnings: DomainWarning[]
  steps: CalculationStep[]
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

  const bsa = calculateBsa(patient.heightCm, patient.weightKg)
  const renal =
    patient.serumCreatinine === undefined
      ? null
      : cockcroftGault({
          ageYears: patient.ageYears,
          weightKg: patient.weightKg,
          sex: patient.sex,
          serumCreatinine: patient.serumCreatinine,
          creatinineUnit: patient.creatinineUnit ?? 'umol_l',
        })

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

  const reviewContext = {
    ageYears: patient.ageYears,
    ...(renal ? { creatinineClearanceMlMin: renal.mlMin } : {}),
    ...(patient.bilirubinUmolL === undefined ? {} : { bilirubinUmolL: patient.bilirubinUmolL }),
  }

  const results = enabled.map((drug) =>
    calculateDrug(drug, {
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
    }),
  )
  const resultById = new Map(results.map((result) => [result.id, result]))

  return {
    bsa,
    creatinineClearanceMlMin: renal?.mlMin ?? null,
    drugs: results,
    days: buildDays(enabled, resultById, adjustments),
    presentationTotals: sumSelections(
      results.flatMap((result) =>
        result.pack ? [scaleSelection(result.pack, result.administrationsInCourse)] : [],
      ),
    ),
    warnings,
    steps: [...bsa.steps, ...(renal?.steps ?? [])],
  }
}

interface DrugContext {
  patient: CoursePatient
  bsa: BsaResult
  variant: BsaVariant
  gfrMlMin: number | undefined
  reviewContext: { ageYears: number; creatinineClearanceMlMin?: number; bilirubinUmolL?: number }
  reduction: { coursePercent?: number; drugPercent?: number }
  /** Dose typed by the physician for this drug, in the drug's own unit. */
  overrideAmount?: number
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

  const variants = calculateDoseVariants(
    drug.dose,
    bsa,
    {
      weightKg: context.patient.weightKg,
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
    ),
    unit: amountUnit,
  }))
  const roundingOptions = { unit: amountUnit, ...(presentations ? { presentations } : {}) }
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

  const warnings = suggestDoseReview(context.reviewContext, drug.reviewRules ?? {})
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
    steps: [
      ...bsa.steps,
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
): CourseDayResult[] {
  const dayNumbers = [...new Set(drugs.flatMap((drug) => drug.days))]
  const dayStart = adjustments.dayStart ?? DEFAULT_DAY_START

  return courseDayDates(adjustments.startDateIso, dayNumbers).map(({ day, date }) => {
    const onDay = drugs.filter((drug) => drug.days.includes(day))
    const inputs = onDay.flatMap((drug) => {
      const result = results.get(drug.id)!
      return Array.from({ length: result.administrationsPerDay }, (_, index) => ({
        drugId: drug.id,
        id: result.administrationsPerDay === 1 ? drug.id : `${drug.id}#${index + 1}`,
        durationMin: drug.durationMin ?? 0,
        ...(drug.gapBeforeMin === undefined ? {} : { gapBeforeMin: drug.gapBeforeMin }),
        ...(adjustments.shiftMin?.[drug.id] === undefined
          ? {}
          : { shiftMin: adjustments.shiftMin[drug.id] }),
      }))
    })

    const scheduled = scheduleAdministrations(dayStart, inputs)
    return {
      day,
      date,
      administrations: scheduled.map((item, index) => ({
        ...item,
        drugId: inputs[index]!.drugId,
      })),
      presentations: sumSelections(
        onDay.flatMap((drug) => {
          const result = results.get(drug.id)!
          return result.pack ? [scaleSelection(result.pack, result.administrationsPerDay)] : []
        }),
      ),
    }
  })
}

/** Default start of the treatment day; CALIBRATION: the department's real start time. */
export const DEFAULT_DAY_START = '09:00'

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
