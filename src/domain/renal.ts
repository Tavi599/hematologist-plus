import { DOMAIN_DEFAULTS } from './config'
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
 * Cockcroft-Gault: CrCl (mL/min) = (140 − age) × weight / (72 × SCr mg/dL) × 0.85 if female.
 * CALIBRATION: which weight (actual / ideal / adjusted) the department uses is unconfirmed;
 * actual weight is used.
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
