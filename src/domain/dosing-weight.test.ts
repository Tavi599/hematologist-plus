import { describe, expect, it } from 'vitest'

import { calculateCourse } from './course'
import { dosingWeight, idealBodyWeightKg } from './dosing-weight'
import { DomainInputError } from './types'

describe('idealBodyWeightKg', () => {
  it('is 50 or 45.5 kg at five feet plus 2.3 kg an inch', () => {
    expect(idealBodyWeightKg(152.4, 'male')).toBeCloseTo(50)
    expect(idealBodyWeightKg(152.4, 'female')).toBeCloseTo(45.5)
    expect(idealBodyWeightKg(175, 'male')).toBeCloseTo(70.46, 1)
  })
})

describe('dosingWeight', () => {
  it('keeps the actual weight for the actual rule, needing nothing else', () => {
    expect(dosingWeight('actual', { weightKg: 110 })).toEqual({
      weightKg: 110,
      basis: 'actual',
      steps: [],
    })
  })

  it('picks the actual, ideal or adjusted weight for an aminoglycoside', () => {
    const at = (weightKg: number) =>
      dosingWeight('aminoglycoside', { weightKg, heightCm: 175, sex: 'male' })
    expect(at(60)).toMatchObject({ basis: 'actual', weightKg: 60 })
    expect(at(80).basis).toBe('ideal')
    expect(at(80).weightKg).toBeCloseTo(70.46, 1)
    const obese = at(110)
    expect(obese.basis).toBe('adjusted')
    expect(obese.weightKg).toBeCloseTo(70.46 + 0.4 * (110 - 70.46), 1)
    expect(obese.steps[0]!.key).toBe('dose.weight.adjusted')
  })

  it('stops without the height or the sex rather than using the actual weight', () => {
    expect(() => dosingWeight('aminoglycoside', { weightKg: 110, heightCm: 175 })).toThrow(
      DomainInputError,
    )
    expect(() => dosingWeight('aminoglycoside', { weightKg: 110, sex: 'male' })).toThrow(
      DomainInputError,
    )
  })
})

describe('dosing weight and rounding step in a course', () => {
  const amikacin = {
    id: 'amikacin',
    dose: { value: 7.5, unit: 'mg_kg' as const },
    days: [1],
    dosingWeight: 'aminoglycoside' as const,
  }
  const adjustments = { startDateIso: '2026-10-12' }

  it('gives an obese patient the dose on the adjusted weight and shows it', () => {
    const course = calculateCourse(
      { heightCm: 175, weightKg: 110, sex: 'male' },
      [amikacin],
      adjustments,
    )
    const drug = course.drugs[0]!
    expect(drug.variants.actual.baseAmount).toBeCloseTo(7.5 * (70.46 + 0.4 * 39.54), 0)
    expect(drug.steps.some((step) => step.key === 'dose.weight.adjusted')).toBe(true)
  })

  it('refuses to calculate an aminoglycoside without the sex', () => {
    expect(() =>
      calculateCourse({ heightCm: 175, weightKg: 110 }, [amikacin], adjustments),
    ).toThrow(DomainInputError)
  })

  it('rounds vancomycin to 250 mg', () => {
    const course = calculateCourse(
      { heightCm: 175, weightKg: 77, sex: 'male' },
      [{ id: 'vanco', dose: { value: 15, unit: 'mg_kg' }, days: [1], roundingStep: 250 }],
      adjustments,
    )
    // 15 × 77 = 1155 mg → 1250 mg
    expect(course.drugs[0]!.doseAmount).toBe(1250)
  })
})
