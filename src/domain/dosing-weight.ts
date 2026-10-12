import { assertPositive } from './math'
import { DomainInputError, type CalculationStep, type Sex } from './types'

/**
 * Which weight a dose per kilogram is given on. `actual` is the patient's weight as entered.
 * `aminoglycoside` is the rule of UpToDate («Dosing and administration of parenteral
 * aminoglycosides», Dosing weight): the actual weight when it is below the ideal one, the ideal
 * weight up to 1.2 times it, above that the adjusted weight IBW + 0.4 × (actual − IBW).
 */
export type DosingWeightRule = 'actual' | 'aminoglycoside'

export type DosingWeightBasis = 'actual' | 'ideal' | 'adjusted'

export interface DosingWeightResult {
  weightKg: number
  basis: DosingWeightBasis
  steps: CalculationStep[]
}

const CM_PER_INCH = 2.54
/** Above this ratio of actual to ideal weight the adjusted weight is used. */
const ADJUSTED_FROM_RATIO = 1.2
const ADJUSTMENT_FACTOR = 0.4

/** Ideal body weight (Devine): 50 kg (men) or 45.5 kg (women) + 2.3 kg per inch above 5 feet. */
export function idealBodyWeightKg(heightCm: number, sex: Sex): number {
  assertPositive('heightCm', heightCm)
  const inchesAbove5Feet = heightCm / CM_PER_INCH - 60
  return (sex === 'male' ? 50 : 45.5) + 2.3 * inchesAbove5Feet
}

/**
 * The weight a dose per kilogram is worked out on. The aminoglycoside rule needs the height and
 * the sex; without them it stops rather than falls back to the actual weight, which overdoses an
 * obese patient.
 */
export function dosingWeight(
  rule: DosingWeightRule,
  patient: { weightKg: number; heightCm?: number; sex?: Sex },
): DosingWeightResult {
  const actualKg = patient.weightKg
  assertPositive('weightKg', actualKg)
  if (rule === 'actual') return { weightKg: actualKg, basis: 'actual', steps: [] }
  if (patient.heightCm === undefined) {
    throw new DomainInputError('heightCm', 'is required for the dosing weight of an aminoglycoside')
  }
  if (patient.sex === undefined) {
    throw new DomainInputError('sex', 'is required for the dosing weight of an aminoglycoside')
  }
  const idealKg = idealBodyWeightKg(patient.heightCm, patient.sex)
  const basis: DosingWeightBasis =
    actualKg < idealKg ? 'actual' : actualKg <= idealKg * ADJUSTED_FROM_RATIO ? 'ideal' : 'adjusted'
  const weightKg =
    basis === 'actual'
      ? actualKg
      : basis === 'ideal'
        ? idealKg
        : idealKg + ADJUSTMENT_FACTOR * (actualKg - idealKg)
  return {
    weightKg,
    basis,
    steps: [
      {
        key: `dose.weight.${basis}`,
        value: weightKg,
        unit: 'kg',
        params: { actualKg, idealKg, heightCm: patient.heightCm },
      },
    ],
  }
}
