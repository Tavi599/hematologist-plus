import { DomainInputError } from './types'

/**
 * Rounds half away from zero (1.005 → 1.01). Shifting via exponent notation avoids
 * binary artefacts such as 1.005 × 100 = 100.49999999999999.
 */
export function roundTo(value: number, decimals = 0): number {
  const shifted = Math.round(Number(`${Math.abs(value)}e${decimals}`))
  return Math.sign(value) * Number(`${shifted}e-${decimals}`)
}

/** Rounds to the nearest multiple of `step` (e.g. 1 mg, 5 mg, 0.1 mg). */
export function roundToStep(value: number, step: number): number {
  assertPositive('step', step)
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1)
  return roundTo(Math.round(value / step + Number.EPSILON) * step, decimals)
}

export function assertPositive(field: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DomainInputError(field, `must be a positive number, got ${value}`)
  }
}

export function assertNonNegative(field: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new DomainInputError(field, `must be a non-negative number, got ${value}`)
  }
}

export function assertPercent(field: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new DomainInputError(field, `must be between 0 and 100, got ${value}`)
  }
}
