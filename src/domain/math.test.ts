import { describe, expect, it } from 'vitest'

import { assertNonNegative, assertPercent, assertPositive, roundTo, roundToStep } from './math'
import { DomainInputError } from './types'

describe('roundTo', () => {
  it('rounds half away from zero without float artefacts', () => {
    expect(roundTo(1.005, 2)).toBe(1.01)
    expect(roundTo(2.5)).toBe(3)
    expect(roundTo(-2.5)).toBe(-3)
    expect(roundTo(90.9061, 1)).toBe(90.9)
  })
})

describe('roundToStep', () => {
  it('rounds to multiples of a step', () => {
    expect(roundToStep(2.25, 0.5)).toBe(2.5)
    expect(roundToStep(1363.59, 5)).toBe(1365)
    expect(roundToStep(0.35, 0.1)).toBe(0.4)
    expect(() => roundToStep(10, 0)).toThrow(DomainInputError)
  })
})

describe('assertions', () => {
  it('accept valid values and reject invalid ones', () => {
    expect(() => assertPositive('x', 1)).not.toThrow()
    expect(() => assertPositive('x', 0)).toThrow(DomainInputError)
    expect(() => assertNonNegative('x', 0)).not.toThrow()
    expect(() => assertNonNegative('x', -0.1)).toThrow(DomainInputError)
    expect(() => assertPercent('x', 100)).not.toThrow()
    expect(() => assertPercent('x', Number.NaN)).toThrow(DomainInputError)
  })

  it('reports the offending field', () => {
    try {
      assertPositive('weightKg', -3)
    } catch (error) {
      expect(error).toBeInstanceOf(DomainInputError)
      expect((error as DomainInputError).field).toBe('weightKg')
    }
  })
})
