import { describe, expect, it } from 'vitest'

import { calculateNeed, monthsCovered } from './need'
import { DomainInputError } from './types'

describe('calculateNeed', () => {
  it('multiplies the packs of one course out over the courses and the patients', () => {
    expect(calculateNeed({ patients: 3, packsPerCourse: 4, courses: 6, monthlyUse: 0 })).toEqual({
      total: 72,
      monthsCovered: null,
    })
  })

  // The two distribution forms the department has filled in, counted their way: the months are
  // the whole months the 100 % need covers at the average monthly use.
  it('counts the months as the department’s own forms do', () => {
    expect(monthsCovered(51, 4)).toBe(12)
    expect(monthsCovered(308, 60)).toBe(5)
    expect(monthsCovered(168, 60)).toBe(2)
  })

  it('leaves the months empty when there is no average to divide by', () => {
    expect(monthsCovered(51, 0)).toBeNull()
  })

  it('needs nothing for nobody', () => {
    expect(calculateNeed({ patients: 0, packsPerCourse: 4, courses: 6, monthlyUse: 2 })).toEqual({
      total: 0,
      monthsCovered: 0,
    })
  })

  it('refuses half a patient and half a pack', () => {
    expect(() =>
      calculateNeed({ patients: 1.5, packsPerCourse: 4, courses: 6, monthlyUse: 0 }),
    ).toThrow(DomainInputError)
    expect(() =>
      calculateNeed({ patients: 1, packsPerCourse: 4.5, courses: 6, monthlyUse: 0 }),
    ).toThrow(DomainInputError)
    expect(() =>
      calculateNeed({ patients: 1, packsPerCourse: 4, courses: 6.5, monthlyUse: 0 }),
    ).toThrow(DomainInputError)
  })

  it('refuses a negative count', () => {
    expect(() =>
      calculateNeed({ patients: -1, packsPerCourse: 4, courses: 6, monthlyUse: 0 }),
    ).toThrow(DomainInputError)
    expect(() => monthsCovered(10, -1)).toThrow(DomainInputError)
  })
})
