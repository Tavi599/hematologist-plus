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
import { DomainInputError, type CalculationStep, type CreatinineUnit, type Sex } from './types'
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
   * Dose the physician typed by hand, mg, by item id. It replaces the calculated dose of that
   * drug entirely — vials, solvent and rate follow it — and the chain shows what was calculated.
   */
  doseOverrideMg?: Record<string, number>
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
  /** Rounded dose of the selected BSA variant, mg — the one used below and for printing. */
  doseMg: number
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
      ...(adjustments.doseOverrideMg?.[drug.id] === undefined
        ? {}
        : { overrideMg: adjustments.doseOverrideMg[drug.id] }),
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
  /** Dose typed by the physician for this drug, mg. */
  overrideMg?: number
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
  const roundingOptions = drug.presentations ? { presentations: drug.presentations } : {}
  const rounded: Record<BsaVariant, RoundingResult> = {
    actual: roundDose(variants.actual.doseMg, roundingOptions),
    capped: roundDose(variants.capped.doseMg, roundingOptions),
  }
  const calculatedMg = rounded[variant].roundedMg
  const overrideMg = context.overrideMg
  if (overrideMg !== undefined && (!Number.isFinite(overrideMg) || overrideMg <= 0)) {
    throw new DomainInputError(`${drug.id}.doseOverrideMg`, 'must be a positive number of mg')
  }
  const doseMg = overrideMg ?? calculatedMg

  const pack =
    drug.presentations && drug.presentations.length > 0
      ? selectPresentations(doseMg, drug.presentations)
      : null
  const infusion = drug.infusion
    ? calculateInfusion({
        doseMg,
        params: drug.infusion,
        ...(drug.durationMin === undefined ? {} : { durationMin: drug.durationMin }),
      })
    : null

  const warnings = suggestDoseReview(context.reviewContext, drug.reviewRules ?? {})
  if (variants[variant].isCapped) {
    warnings.push({
      code: 'dose.capped',
      params: { capMg: drug.dose.capMg ?? 0, baseMg: variants[variant].baseMg },
    })
  }
  if (infusion?.issue === 'concentration_out_of_range') {
    warnings.push({
      code: 'infusion.concentrationOutOfRange',
      params: { concentrationMgMl: infusion.concentrationMgMl },
    })
  }

  return {
    id: drug.id,
    variants,
    rounded,
    doseMg,
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
      ...(overrideMg === undefined
        ? []
        : [
            {
              key: 'dose.manual' as const,
              value: overrideMg,
              unit: 'mg' as const,
              params: { calculatedMg },
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
    totalMg: selection.totalMg * factor,
    wasteMg: selection.wasteMg * factor,
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
