import { describe, expect, it } from 'vitest'

import { calculateBsa, mostellerBsa } from './bsa'
import { DomainInputError } from './types'

describe('mostellerBsa', () => {
  it('matches √(h × w / 3600)', () => {
    // √(170 × 70 / 3600) = √3.30556 = 1.81812
    expect(mostellerBsa(170, 70)).toBeCloseTo(1.81812, 5)
    // √(160 × 55 / 3600) = √2.44444 = 1.56347
    expect(mostellerBsa(160, 55)).toBeCloseTo(1.56347, 5)
  })

  it('rejects non-positive and non-finite inputs', () => {
    expect(() => mostellerBsa(0, 70)).toThrow(DomainInputError)
    expect(() => mostellerBsa(170, -1)).toThrow(DomainInputError)
    expect(() => mostellerBsa(Number.NaN, 70)).toThrow(DomainInputError)
  })
})

describe('calculateBsa', () => {
  it('returns identical variants below the cap', () => {
    const bsa = calculateBsa(170, 70)
    expect(bsa.isCapped).toBe(false)
    expect(bsa.cappedM2).toBe(bsa.actualM2)
    expect(bsa.capM2).toBe(2)
    expect(bsa.steps.map((s) => s.key)).toEqual(['bsa.mosteller', 'bsa.cap'])
  })

  it('caps at 2.0 m² by default', () => {
    // √(190 × 110 / 3600) = 2.40947
    const bsa = calculateBsa(190, 110)
    expect(bsa.actualM2).toBeCloseTo(2.40947, 5)
    expect(bsa.cappedM2).toBe(2)
    expect(bsa.isCapped).toBe(true)
  })

  it('accepts a custom cap', () => {
    expect(calculateBsa(190, 110, 2.2).cappedM2).toBe(2.2)
    expect(() => calculateBsa(170, 70, 0)).toThrow(DomainInputError)
  })
})
