import { DOMAIN_DEFAULTS } from './config'
import { assertNonNegative, assertPercent, roundToStep } from './math'
import { nearestWholeUnitAmounts, type Presentation } from './presentations'
import type { AmountUnit, CalculationStep } from './types'

export interface RoundingOptions {
  /** Unit the dose is in; decides the default rounding step. */
  unit?: AmountUnit
  /** Rounding step, in `unit`. */
  step?: number
  /** Presentations available for vial snapping, strengths in `unit`. */
  presentations?: Presentation[]
  /** Snap to whole-vial amount if within this %; `null` disables snapping. */
  vialTolerancePercent?: number | null
  /**
   * Round up to whole packs of the smallest strength: 6.5 ampoules become 7. For a drug the
   * department never splits (mesna); it overrides both the step and vial snapping.
   */
  roundUpToWholePack?: boolean
}

export type RoundingMethod = 'step' | 'vial' | 'pack'

export interface RoundingResult {
  unit: AmountUnit
  unroundedAmount: number
  roundedAmount: number
  method: RoundingMethod
  /** Signed deviation of the rounded dose from the unrounded one, %. */
  deviationPercent: number
  steps: CalculationStep[]
}

/**
 * Rounds a dose to the step of its unit (1 mg by default). When vial snapping is enabled and
 * the nearest whole-vial amount is within tolerance, that amount wins.
 * CALIBRATION: the department's vial rule is unconfirmed; snapping is off by default.
 */
export function roundDose(doseAmount: number, options: RoundingOptions = {}): RoundingResult {
  assertNonNegative('doseAmount', doseAmount)
  const unit = options.unit ?? 'mg'
  const step = options.step ?? defaultStep(doseAmount, unit)
  const tolerance = options.vialTolerancePercent ?? DOMAIN_DEFAULTS.vialRoundingTolerancePercent

  let roundedAmount = roundToStep(doseAmount, step)
  let method: RoundingMethod = 'step'
  const smallestPack = options.roundUpToWholePack
    ? Math.min(...(options.presentations ?? []).map((pack) => pack.strengthAmount))
    : Infinity

  if (Number.isFinite(smallestPack) && smallestPack > 0) {
    // The tolerance keeps an exact multiple from tipping into one more pack on a float error.
    roundedAmount = Math.ceil(doseAmount / smallestPack - 1e-9) * smallestPack
    method = 'pack'
  } else if (tolerance !== null && options.presentations?.length && doseAmount > 0) {
    assertPercent('vialTolerancePercent', tolerance)
    const candidate = nearestVialAmount(doseAmount, options.presentations)
    if (Math.abs(candidate - doseAmount) / doseAmount <= tolerance / 100) {
      roundedAmount = candidate
      method = 'vial'
    }
  }

  const deviationPercent = doseAmount === 0 ? 0 : ((roundedAmount - doseAmount) / doseAmount) * 100

  return {
    unit,
    unroundedAmount: doseAmount,
    roundedAmount,
    method,
    deviationPercent,
    steps: [
      {
        key: `rounding.${method === 'pack' ? 'packUp' : method}`,
        value: roundedAmount,
        unit,
        params: {
          unrounded: doseAmount,
          step,
          unit,
          deviationPercent,
          ...(method === 'pack'
            ? { packAmount: smallestPack, packs: Math.round(roundedAmount / smallestPack) }
            : {}),
        },
      },
    ],
  }
}

/** Closest amount to the dose that is an exact sum of whole vials; ties go up. */
function nearestVialAmount(doseAmount: number, presentations: Presentation[]): number {
  const { below, above } = nearestWholeUnitAmounts(doseAmount, presentations)
  return below !== null && doseAmount - below < above - doseAmount ? below : above
}

/** The unit's step, or the finer one for a dose small enough that whole units would distort it. */
function defaultStep(doseAmount: number, unit: AmountUnit): number {
  const small = DOMAIN_DEFAULTS.smallDoseRounding[unit]
  if (!small || doseAmount >= small.below) return DOMAIN_DEFAULTS.doseRoundingStep[unit]
  // A dose so small that even tenths move it noticeably is kept to the finer step.
  const fine = DOMAIN_DEFAULTS.fineDoseRounding[unit]
  if (fine && doseAmount > 0) {
    const deviation =
      (Math.abs(roundToStep(doseAmount, small.step) - doseAmount) / doseAmount) * 100
    if (deviation > fine.maxDeviationPercent) return fine.step
  }
  return small.step
}
