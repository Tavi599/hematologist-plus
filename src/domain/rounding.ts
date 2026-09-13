import { DOMAIN_DEFAULTS } from './config'
import { assertNonNegative, assertPercent, roundToStep } from './math'
import { nearestWholeUnitAmounts, type Presentation } from './presentations'
import type { CalculationStep } from './types'

export interface RoundingOptions {
  /** Rounding step, mg. */
  stepMg?: number
  /** Presentations available for vial snapping. */
  presentations?: Presentation[]
  /** Snap to whole-vial amount if within this %; `null` disables snapping. */
  vialTolerancePercent?: number | null
}

export type RoundingMethod = 'step' | 'vial'

export interface RoundingResult {
  unroundedMg: number
  roundedMg: number
  method: RoundingMethod
  /** Signed deviation of the rounded dose from the unrounded one, %. */
  deviationPercent: number
  steps: CalculationStep[]
}

/**
 * Rounds a dose to `stepMg` (default 1 mg). When vial snapping is enabled and the
 * nearest whole-vial amount is within tolerance, that amount wins.
 * CALIBRATION: the department's vial rule is unconfirmed; snapping is off by default.
 */
export function roundDose(doseMg: number, options: RoundingOptions = {}): RoundingResult {
  assertNonNegative('doseMg', doseMg)
  const stepMg = options.stepMg ?? DOMAIN_DEFAULTS.doseRoundingStepMg
  const tolerance = options.vialTolerancePercent ?? DOMAIN_DEFAULTS.vialRoundingTolerancePercent

  let roundedMg = roundToStep(doseMg, stepMg)
  let method: RoundingMethod = 'step'

  if (tolerance !== null && options.presentations?.length && doseMg > 0) {
    assertPercent('vialTolerancePercent', tolerance)
    const candidate = nearestVialAmount(doseMg, options.presentations)
    if (Math.abs(candidate - doseMg) / doseMg <= tolerance / 100) {
      roundedMg = candidate
      method = 'vial'
    }
  }

  const deviationPercent = doseMg === 0 ? 0 : ((roundedMg - doseMg) / doseMg) * 100

  return {
    unroundedMg: doseMg,
    roundedMg,
    method,
    deviationPercent,
    steps: [
      {
        key: method === 'vial' ? 'rounding.vial' : 'rounding.step',
        value: roundedMg,
        unit: 'mg',
        params: { unroundedMg: doseMg, stepMg, deviationPercent },
      },
    ],
  }
}

/** Closest amount to the dose that is an exact sum of whole vials; ties go up. */
function nearestVialAmount(doseMg: number, presentations: Presentation[]): number {
  const { below, above } = nearestWholeUnitAmounts(doseMg, presentations)
  return below !== null && doseMg - below < above - doseMg ? below : above
}
