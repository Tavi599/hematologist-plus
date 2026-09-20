import type { BsaResult } from './bsa'
import { assertPercent, assertPositive } from './math'
import { calvertDose } from './renal'
import { amountUnitOf, doseBasisOf } from './units'
import { DomainInputError, type AmountUnit, type CalculationStep, type DoseUnit } from './types'

/** Dose as written in a regimen item. */
export interface DoseSpec {
  value: number
  unit: DoseUnit
  /**
   * Maximum absolute dose per administration, in the same amount unit as the dose
   * (e.g. vincristine 2 mg, bleomycin 30 000 IU).
   */
  capAmount?: number
}

export interface DoseContext {
  bsaM2: number
  /** Required for `<unit>_kg` doses; a course of m²-dosed drugs is calculated without it. */
  weightKg?: number
  /** Required for `auc` doses. */
  gfrMlMin?: number
}

export interface DoseReduction {
  /** Reduction applied to the whole course, %. */
  coursePercent?: number
  /** Per-drug reduction, %; when set it replaces the course reduction for this drug. */
  drugPercent?: number
}

export interface DoseResult {
  /** The unit every amount in this result is in. */
  unit: AmountUnit
  /** Full dose from the regimen before any cap or reduction. */
  baseAmount: number
  /** Dose after the absolute cap. */
  cappedAmount: number
  isCapped: boolean
  reductionPercent: number
  /** Final unrounded dose — printed as a note next to the rounded value. */
  doseAmount: number
  steps: CalculationStep[]
}

export function effectiveReductionPercent(reduction: DoseReduction = {}): number {
  const percent = reduction.drugPercent ?? reduction.coursePercent ?? 0
  assertPercent('reductionPercent', percent)
  return percent
}

/**
 * base dose → absolute cap → reduction.
 * CALIBRATION: order of cap vs reduction and whether per-drug reduction replaces or
 * multiplies the course reduction are unconfirmed; current rule: cap first, drug % replaces course %.
 */
export function calculateDose(
  spec: DoseSpec,
  context: DoseContext,
  reduction?: DoseReduction,
): DoseResult {
  assertPositive('dose.value', spec.value)
  if (spec.capAmount !== undefined) assertPositive('dose.capAmount', spec.capAmount)

  const unit = amountUnitOf(spec.unit)
  const steps: CalculationStep[] = []
  let baseAmount: number

  switch (doseBasisOf(spec.unit)) {
    case 'm2':
      assertPositive('bsaM2', context.bsaM2)
      baseAmount = spec.value * context.bsaM2
      steps.push({
        key: 'dose.perBsa',
        value: baseAmount,
        unit,
        params: { doseValue: spec.value, doseUnit: spec.unit, bsaM2: context.bsaM2 },
      })
      break
    case 'kg':
      if (context.weightKg === undefined) {
        throw new DomainInputError('weightKg', 'is required for a dose per kilogram')
      }
      assertPositive('weightKg', context.weightKg)
      baseAmount = spec.value * context.weightKg
      steps.push({
        key: 'dose.perWeight',
        value: baseAmount,
        unit,
        params: { doseValue: spec.value, doseUnit: spec.unit, weightKg: context.weightKg },
      })
      break
    case 'flat':
      baseAmount = spec.value
      steps.push({ key: 'dose.flat', value: baseAmount, unit })
      break
    case 'auc': {
      if (context.gfrMlMin === undefined) {
        throw new DomainInputError('gfrMlMin', 'is required for AUC-based doses')
      }
      const calvert = calvertDose(spec.value, context.gfrMlMin)
      baseAmount = calvert.doseMg
      steps.push(...calvert.steps)
      break
    }
  }

  const isCapped = spec.capAmount !== undefined && baseAmount > spec.capAmount
  const cappedAmount = isCapped ? spec.capAmount! : baseAmount
  if (spec.capAmount !== undefined) {
    steps.push({
      key: 'dose.cap',
      value: cappedAmount,
      unit,
      params: { capAmount: spec.capAmount, unit, isCapped },
    })
  }

  const reductionPercent = effectiveReductionPercent(reduction)
  const doseAmount = cappedAmount * (1 - reductionPercent / 100)
  if (reductionPercent > 0) {
    steps.push({ key: 'dose.reduction', value: doseAmount, unit, params: { reductionPercent } })
  }

  return { unit, baseAmount, cappedAmount, isCapped, reductionPercent, doseAmount, steps }
}

export interface DoseVariants {
  /** Dose on actual BSA. */
  actual: DoseResult
  /** Dose on BSA capped at `bsa.capM2`; same as `actual` for non-BSA doses or small patients. */
  capped: DoseResult
  /** True when the two variants differ. */
  differs: boolean
}

/** Calculates the dose for both BSA variants the calculator displays side by side. */
export function calculateDoseVariants(
  spec: DoseSpec,
  bsa: BsaResult,
  context: Omit<DoseContext, 'bsaM2'>,
  reduction?: DoseReduction,
): DoseVariants {
  const actual = calculateDose(spec, { ...context, bsaM2: bsa.actualM2 }, reduction)
  const capped =
    doseBasisOf(spec.unit) === 'm2' && bsa.isCapped
      ? calculateDose(spec, { ...context, bsaM2: bsa.cappedM2 }, reduction)
      : actual
  return { actual, capped, differs: actual.doseAmount !== capped.doseAmount }
}
