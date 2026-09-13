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
  steps: CalculationStep[]
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
    steps: [
      { key: 'bsa.mosteller', value: actualM2, unit: 'm2', params: { heightCm, weightKg } },
      { key: 'bsa.cap', value: cappedM2, unit: 'm2', params: { capM2, isCapped } },
    ],
  }
}
