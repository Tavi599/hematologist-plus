import { describe, expect, it } from 'vitest'

import { nearestWholeUnitAmounts, selectPresentations, sumSelections } from './presentations'
import { DomainInputError } from './types'

const rituximab = [
  { id: 'ritux-100', strengthAmount: 100 },
  { id: 'ritux-500', strengthAmount: 500 },
]

// Strengths this small next to a dose this large blow past the lookup table (see MAX_TABLE_SIZE);
// the fallback must still cover the dose instead of throwing.
const tinyPacks = [
  { id: 'tiny-0.3', strengthAmount: 0.3 },
  { id: 'tiny-0.5', strengthAmount: 0.5 },
]

describe('selectPresentations', () => {
  it('covers the dose with least waste, then fewest vials', () => {
    // 682 mg → 700 mg = 500 + 2 × 100 (3 vials), not 7 × 100
    const selection = selectPresentations(682, rituximab)
    expect(selection.totalAmount).toBe(700)
    expect(selection.wasteAmount).toBe(18)
    expect(selection.unitCount).toBe(3)
    expect(selection.items).toEqual([
      { presentation: rituximab[1], count: 1 },
      { presentation: rituximab[0], count: 2 },
    ])
  })

  it('prefers a closer total over fewer vials', () => {
    // 7 mg with 3 mg and 5 mg → 8 mg (3 + 5), not 9 mg or 10 mg
    const selection = selectPresentations(7, [
      { id: 'a', strengthAmount: 3 },
      { id: 'b', strengthAmount: 5 },
    ])
    expect(selection.totalAmount).toBe(8)
    expect(selection.unitCount).toBe(2)
  })

  it('handles fractional strengths', () => {
    // bortezomib 2.6 mg from a 3.5 mg vial
    const selection = selectPresentations(2.6, [{ id: 'bortezomib', strengthAmount: 3.5 }])
    expect(selection.unitCount).toBe(1)
    expect(selection.wasteAmount).toBeCloseTo(0.9, 10)
  })

  it('returns an exact match without waste', () => {
    const selection = selectPresentations(100, [
      { id: 'dox-10', strengthAmount: 10 },
      { id: 'dox-50', strengthAmount: 50 },
    ])
    expect(selection).toMatchObject({ totalAmount: 100, wasteAmount: 0, unitCount: 2 })
  })

  it('returns nothing for a zero dose', () => {
    expect(selectPresentations(0, rituximab)).toEqual({
      items: [],
      totalAmount: 0,
      wasteAmount: 0,
      unitCount: 0,
    })
  })

  it('falls back to the largest strength when the lookup table would be too large', () => {
    const selection = selectPresentations(300, [
      { id: 'tiny', strengthAmount: 0.001 },
      { id: 'big', strengthAmount: 7 },
    ])
    expect(selection.items).toEqual([{ presentation: { id: 'big', strengthAmount: 7 }, count: 43 }])
    expect(selection.totalAmount).toBe(301)
  })

  it('validates input', () => {
    expect(() => selectPresentations(10, [])).toThrow(DomainInputError)
    expect(() => selectPresentations(10, [{ id: 'x', strengthAmount: 0 }])).toThrow(
      DomainInputError,
    )
    expect(() => selectPresentations(-1, rituximab)).toThrow(DomainInputError)
  })

  it('falls back to the largest pack when the combination table would be too big', () => {
    const selection = selectPresentations(25000, tinyPacks)
    expect(selection.items).toEqual([{ presentation: tinyPacks[1], count: 50000 }])
    expect(selection.totalAmount).toBe(25000)
    expect(selection.wasteAmount).toBe(0)
    expect(selection.unitCount).toBe(50000)
  })
})

describe('nearestWholeUnitAmounts', () => {
  it('finds amounts on both sides of the dose', () => {
    expect(nearestWholeUnitAmounts(487, rituximab)).toEqual({ below: 400, above: 500 })
  })

  it('returns null below when the dose is smaller than any vial', () => {
    expect(nearestWholeUnitAmounts(50, rituximab)).toEqual({ below: null, above: 100 })
  })

  it('has no lower amount when the combination table would be too big', () => {
    expect(nearestWholeUnitAmounts(25000, tinyPacks)).toEqual({ below: null, above: 25000 })
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
