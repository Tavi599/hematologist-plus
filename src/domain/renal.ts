import { DOMAIN_DEFAULTS } from './config'
import { idealBodyWeightKg } from './dosing-weight'
import { assertNonNegative, assertPositive } from './math'
import { DomainInputError, type CalculationStep, type CreatinineUnit, type Sex } from './types'

export function creatinineToMgDl(value: number, unit: CreatinineUnit): number {
  assertPositive('serumCreatinine', value)
  return unit === 'mg_dl' ? value : value / DOMAIN_DEFAULTS.creatinineUmolPerMgDl
}

export function creatinineToUmolL(value: number, unit: CreatinineUnit): number {
  assertPositive('serumCreatinine', value)
  return unit === 'umol_l' ? value : value * DOMAIN_DEFAULTS.creatinineUmolPerMgDl
}

export interface CockcroftGaultInput {
  ageYears: number
  weightKg: number
  sex: Sex
  serumCreatinine: number
  creatinineUnit: CreatinineUnit
}

export interface CreatinineClearanceResult {
  mlMin: number
  steps: CalculationStep[]
}

/**
 * Which weight the Cockcroft-Gault clearance is worked out on. UpToDate («Dosing of anticancer
 * agents in adults», carboplatin) calls it unresolved, with institutional practice varying:
 * most use the actual weight; the GOG uses it only below a BMI of 25 and the adjusted weight
 * IBW + 0.4 × (actual − IBW) above. The actual weight stays the default; the physician chooses.
 */
export type ClearanceWeight = 'actual' | 'adjusted'

/** The BMI from which the GOG works the clearance out on the adjusted weight. */
export const CLEARANCE_ADJUSTED_FROM_BMI = 25
const ADJUSTMENT_FACTOR = 0.4

export interface ClearanceWeightResult {
  weightKg: number
  basis: ClearanceWeight
  /** The adjusted weight, where it applies at all: a height to know it by and a BMI of 25+. */
  adjustedKg: number | null
  idealKg: number | null
  bmi: number | null
  steps: CalculationStep[]
}

/**
 * The weight for the clearance. The adjusted one is offered only where it means something —
 * a known height, a BMI of 25 or more and a weight above the ideal one; elsewhere the actual
 * weight stands whatever was chosen.
 */
export function clearanceWeightOf(
  patient: { weightKg: number; heightCm?: number; sex: Sex },
  choice: ClearanceWeight,
): ClearanceWeightResult {
  const actualKg = patient.weightKg
  assertPositive('weightKg', actualKg)
  if (patient.heightCm === undefined) {
    return {
      weightKg: actualKg,
      basis: 'actual',
      adjustedKg: null,
      idealKg: null,
      bmi: null,
      steps: [],
    }
  }
  const bmi = actualKg / (patient.heightCm / 100) ** 2
  const idealKg = idealBodyWeightKg(patient.heightCm, patient.sex)
  const adjustedKg =
    bmi >= CLEARANCE_ADJUSTED_FROM_BMI && actualKg > idealKg
      ? idealKg + ADJUSTMENT_FACTOR * (actualKg - idealKg)
      : null
  if (choice === 'actual' || adjustedKg === null) {
    return { weightKg: actualKg, basis: 'actual', adjustedKg, idealKg, bmi, steps: [] }
  }
  return {
    weightKg: adjustedKg,
    basis: 'adjusted',
    adjustedKg,
    idealKg,
    bmi,
    steps: [
      {
        key: 'renal.clearanceWeightAdjusted',
        value: adjustedKg,
        unit: 'kg',
        params: { actualKg, idealKg, bmi, heightCm: patient.heightCm },
      },
    ],
  }
}

/**
 * Cockcroft-Gault: CrCl (mL/min) = (140 − age) × weight / (72 × SCr mg/dL) × 0.85 if female.
 * The weight is the one `clearanceWeightOf` gives: the actual weight unless the physician chose
 * the adjusted one for a patient with obesity.
 */
export function cockcroftGault(input: CockcroftGaultInput): CreatinineClearanceResult {
  const { ageYears, weightKg, sex, serumCreatinine, creatinineUnit } = input
  assertPositive('ageYears', ageYears)
  assertPositive('weightKg', weightKg)
  if (ageYears >= 140) throw new DomainInputError('ageYears', 'must be below 140')

  const scrMgDl = creatinineToMgDl(serumCreatinine, creatinineUnit)
  const sexFactor = sex === 'female' ? DOMAIN_DEFAULTS.cockcroftGaultFemaleFactor : 1
  const mlMin = (((140 - ageYears) * weightKg) / (72 * scrMgDl)) * sexFactor

  return {
    mlMin,
    steps: [
      {
        key: 'renal.cockcroftGault',
        value: mlMin,
        unit: 'ml_min',
        params: { ageYears, weightKg, sex, serumCreatinineMgDl: scrMgDl, sexFactor },
      },
    ],
  }
}

export interface CalvertResult {
  doseMg: number
  gfrUsedMlMin: number
  isGfrCapped: boolean
  steps: CalculationStep[]
}

/**
 * Calvert: carboplatin dose (mg) = target AUC × (GFR + 25).
 * GFR is limited to `gfrCapMlMin` (default 125 mL/min).
 */
export function calvertDose(
  targetAuc: number,
  gfrMlMin: number,
  gfrCapMlMin: number = DOMAIN_DEFAULTS.carboplatinGfrCapMlMin,
): CalvertResult {
  assertPositive('targetAuc', targetAuc)
  assertNonNegative('gfrMlMin', gfrMlMin)
  assertPositive('gfrCapMlMin', gfrCapMlMin)

  const isGfrCapped = gfrMlMin > gfrCapMlMin
  const gfrUsedMlMin = isGfrCapped ? gfrCapMlMin : gfrMlMin
  const doseMg = targetAuc * (gfrUsedMlMin + 25)

  return {
    doseMg,
    gfrUsedMlMin,
    isGfrCapped,
    steps: [
      {
        key: 'renal.calvert',
        value: doseMg,
        unit: 'mg',
        params: { targetAuc, gfrMlMin, gfrUsedMlMin, isGfrCapped },
      },
    ],
  }
}
