import { describe, expect, it } from 'vitest'

import { nearestWholeUnitAmounts, selectPresentations, sumSelections } from './presentations'
import { DomainInputError } from './types'

const rituximab = [
  { id: 'ritux-100', strengthMg: 100 },
  { id: 'ritux-500', strengthMg: 500 },
]

describe('selectPresentations', () => {
  it('covers the dose with least waste, then fewest vials', () => {
    // 682 mg → 700 mg = 500 + 2 × 100 (3 vials), not 7 × 100
    const selection = selectPresentations(682, rituximab)
    expect(selection.totalMg).toBe(700)
    expect(selection.wasteMg).toBe(18)
    expect(selection.unitCount).toBe(3)
    expect(selection.items).toEqual([
      { presentation: rituximab[1], count: 1 },
      { presentation: rituximab[0], count: 2 },
    ])
  })

  it('prefers a closer total over fewer vials', () => {
    // 7 mg with 3 mg and 5 mg → 8 mg (3 + 5), not 9 mg or 10 mg
    const selection = selectPresentations(7, [
      { id: 'a', strengthMg: 3 },
      { id: 'b', strengthMg: 5 },
    ])
    expect(selection.totalMg).toBe(8)
    expect(selection.unitCount).toBe(2)
  })

  it('handles fractional strengths', () => {
    // bortezomib 2.6 mg from a 3.5 mg vial
    const selection = selectPresentations(2.6, [{ id: 'bortezomib', strengthMg: 3.5 }])
    expect(selection.unitCount).toBe(1)
    expect(selection.wasteMg).toBeCloseTo(0.9, 10)
  })

  it('returns an exact match without waste', () => {
    const selection = selectPresentations(100, [
      { id: 'dox-10', strengthMg: 10 },
      { id: 'dox-50', strengthMg: 50 },
    ])
    expect(selection).toMatchObject({ totalMg: 100, wasteMg: 0, unitCount: 2 })
  })

  it('returns nothing for a zero dose', () => {
    expect(selectPresentations(0, rituximab)).toEqual({
      items: [],
      totalMg: 0,
      wasteMg: 0,
      unitCount: 0,
    })
  })

  it('falls back to the largest strength when the lookup table would be too large', () => {
    const selection = selectPresentations(300, [
      { id: 'tiny', strengthMg: 0.001 },
      { id: 'big', strengthMg: 7 },
    ])
    expect(selection.items).toEqual([{ presentation: { id: 'big', strengthMg: 7 }, count: 43 }])
    expect(selection.totalMg).toBe(301)
  })

  it('validates input', () => {
    expect(() => selectPresentations(10, [])).toThrow(DomainInputError)
    expect(() => selectPresentations(10, [{ id: 'x', strengthMg: 0 }])).toThrow(DomainInputError)
    expect(() => selectPresentations(-1, rituximab)).toThrow(DomainInputError)
  })
})

describe('nearestWholeUnitAmounts', () => {
  it('finds amounts on both sides of the dose', () => {
    expect(nearestWholeUnitAmounts(487, rituximab)).toEqual({ below: 400, above: 500 })
  })

  it('returns null below when the dose is smaller than any vial', () => {
    expect(nearestWholeUnitAmounts(50, rituximab)).toEqual({ below: null, above: 100 })
  })
})

describe('sumSelections', () => {
  it('adds up vials across administrations', () => {
    // day 1: 682 mg → 500 + 2 × 100; day 8: 450 mg → 500
    const day1 = selectPresentations(682, rituximab)
    const day8 = selectPresentations(450, rituximab)
    expect(sumSelections([day1, day8])).toEqual([
      { presentation: rituximab[1], count: 2 },
      { presentation: rituximab[0], count: 2 },
    ])
  })
})
