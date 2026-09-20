import { DOMAIN_DEFAULTS } from './config'
import { assertPositive } from './math'
import type { CalculationStep } from './types'

/** Mosteller: BSA (m²) = √(height cm × weight kg / 3600). */
export function mostellerBsa(heightCm: number, weightKg: number): number {
  assertPositive('heightCm', heightCm)
  assertPositive('weightKg', weightKg)
  return Math.sqrt((heightCm * weightKg) / 3600)
}

export interface BsaResult {
  /** BSA from actual height and weight. */
  actualM2: number
  /** BSA limited to `capM2`; equals `actualM2` when below the cap. */
  cappedM2: number
  capM2: number
  isCapped: boolean
  /** True when the physician typed the BSA in instead of letting Mosteller compute it. */
  entered: boolean
  steps: CalculationStep[]
}

/**
 * BSA the physician typed in instead of letting Mosteller compute it — an amputee, an oedematous
 * patient, or a value carried over from the previous cycle's sheet. It is used exactly as given;
 * the capped variant is still derived so the second column keeps its meaning.
 */
export function enteredBsa(actualM2: number, capM2: number = DOMAIN_DEFAULTS.bsaCapM2): BsaResult {
  assertPositive('bsaM2', actualM2)
  assertPositive('capM2', capM2)
  const isCapped = actualM2 > capM2
  const cappedM2 = isCapped ? capM2 : actualM2

  return {
    actualM2,
    cappedM2,
    capM2,
    isCapped,
    entered: true,
    steps: [
      { key: 'bsa.entered', value: actualM2, unit: 'm2', params: {} },
      { key: 'bsa.cap', value: cappedM2, unit: 'm2', params: { capM2, isCapped } },
    ],
  }
}

/** Both BSA variants required by the calculator: actual and capped (default 2.0 m²). */
export function calculateBsa(
  heightCm: number,
  weightKg: number,
  capM2: number = DOMAIN_DEFAULTS.bsaCapM2,
): BsaResult {
  assertPositive('capM2', capM2)
  const actualM2 = mostellerBsa(heightCm, weightKg)
  const isCapped = actualM2 > capM2
  const cappedM2 = isCapped ? capM2 : actualM2

  return {
    actualM2,
    cappedM2,
    capM2,
    isCapped,
    entered: false,
    steps: [
      { key: 'bsa.mosteller', value: actualM2, unit: 'm2', params: { heightCm, weightKg } },
      { key: 'bsa.cap', value: cappedM2, unit: 'm2', params: { capM2, isCapped } },
    ],
  }
}
