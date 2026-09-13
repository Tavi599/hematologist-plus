import type { BsaResult } from './bsa'
import { assertPercent, assertPositive } from './math'
import { calvertDose } from './renal'
import { DomainInputError, type CalculationStep, type DoseUnit } from './types'

/** Dose as written in a regimen item. */
export interface DoseSpec {
  value: number
  unit: DoseUnit
  /** Maximum absolute dose per administration, mg (e.g. vincristine 2 mg). */
  capMg?: number
}

export interface DoseContext {
  bsaM2: number
  weightKg: number
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
  /** Full dose from the regimen before any cap or reduction, mg. */
  baseMg: number
  /** Dose after the absolute cap, mg. */
  cappedMg: number
  isCapped: boolean
  reductionPercent: number
  /** Final unrounded dose, mg — printed as a note next to the rounded value. */
  doseMg: number
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
  if (spec.capMg !== undefined) assertPositive('dose.capMg', spec.capMg)

  const steps: CalculationStep[] = []
  let baseMg: number

  switch (spec.unit) {
    case 'mg_m2':
      assertPositive('bsaM2', context.bsaM2)
      baseMg = spec.value * context.bsaM2
      steps.push({
        key: 'dose.perBsa',
        value: baseMg,
        unit: 'mg',
        params: { doseMgM2: spec.value, bsaM2: context.bsaM2 },
      })
      break
    case 'mg_kg':
      assertPositive('weightKg', context.weightKg)
      baseMg = spec.value * context.weightKg
      steps.push({
        key: 'dose.perWeight',
        value: baseMg,
        unit: 'mg',
        params: { doseMgKg: spec.value, weightKg: context.weightKg },
      })
      break
    case 'mg_flat':
      baseMg = spec.value
      steps.push({ key: 'dose.flat', value: baseMg, unit: 'mg' })
      break
    case 'auc': {
      if (context.gfrMlMin === undefined) {
        throw new DomainInputError('gfrMlMin', 'is required for AUC-based doses')
      }
      const calvert = calvertDose(spec.value, context.gfrMlMin)
      baseMg = calvert.doseMg
      steps.push(...calvert.steps)
      break
    }
  }

  const isCapped = spec.capMg !== undefined && baseMg > spec.capMg
  const cappedMg = isCapped ? spec.capMg! : baseMg
  if (spec.capMg !== undefined) {
    steps.push({
      key: 'dose.cap',
      value: cappedMg,
      unit: 'mg',
      params: { capMg: spec.capMg, isCapped },
    })
  }

  const reductionPercent = effectiveReductionPercent(reduction)
  const doseMg = cappedMg * (1 - reductionPercent / 100)
  if (reductionPercent > 0) {
    steps.push({ key: 'dose.reduction', value: doseMg, unit: 'mg', params: { reductionPercent } })
  }

  return { baseMg, cappedMg, isCapped, reductionPercent, doseMg, steps }
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
    spec.unit === 'mg_m2' && bsa.isCapped
      ? calculateDose(spec, { ...context, bsaM2: bsa.cappedM2 }, reduction)
      : actual
  return { actual, capped, differs: actual.doseMg !== capped.doseMg }
}
