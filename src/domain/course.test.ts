import { describe, expect, it } from 'vitest'

import { calculateCourse, type CourseDrug, type CoursePatient } from './course'
import { DomainInputError } from './types'

// 180 cm × 80 kg → BSA = √(180 × 80 / 3600) = 2.0 m² exactly, so doses stay round.
const patient: CoursePatient = {
  ageYears: 60,
  sex: 'male',
  heightCm: 180,
  weightKg: 80,
  serumCreatinine: 88.4, // = 1.0 mg/dL → CrCl = (140 − 60) × 80 / (72 × 1) = 88.89 mL/min
  creatinineUnit: 'umol_l',
}

const rituximab: CourseDrug = {
  id: 'r.rituximab',
  dose: { value: 375, unit: 'mg_m2' },
  days: [1],
  durationMin: 240,
  presentations: [
    { id: 'v100', strengthMg: 100 },
    { id: 'v500', strengthMg: 500 },
  ],
  infusion: {
    concentrationMinMgMl: 1,
    concentrationMaxMgMl: 4,
    stockConcentrationMgMl: 10,
    bagVolumesMl: [100, 250, 500],
  },
}

const prednisolone: CourseDrug = {
  id: 'r.prednisolone',
  dose: { value: 100, unit: 'mg_flat' },
  days: [1, 2, 3],
  presentations: [{ id: 't5', strengthMg: 5 }],
}

const adjustments = { startDateIso: '2026-09-21' }

describe('calculateCourse', () => {
  it('calculates doses, vials, infusion and the day calendar', () => {
    const course = calculateCourse(patient, [rituximab, prednisolone], adjustments)

    expect(course.bsa.actualM2).toBe(2)
    expect(course.bsa.isCapped).toBe(false)
    expect(course.creatinineClearanceMlMin).toBeCloseTo(88.889, 3)

    const [rtx, pred] = course.drugs
    // 375 mg/m² × 2.0 m² = 750 mg.
    expect(rtx?.doseMg).toBe(750)
    expect(rtx?.variants.differs).toBe(false)
    // Least waste covering 750 mg: 500 + 3 × 100 = 800 mg.
    expect(rtx?.pack).toMatchObject({ totalMg: 800, wasteMg: 50, unitCount: 4 })
    // 750 mg of a 10 mg/mL concentrate = 75 mL; the 100 mL bag would exceed 4 mg/mL.
    expect(rtx?.infusion).toMatchObject({ bagVolumeMl: 250, drugVolumeMl: 75, totalVolumeMl: 325 })
    expect(rtx?.infusion?.concentrationMgMl).toBeCloseTo(2.308, 3)
    expect(rtx?.infusion?.rateMlH).toBeCloseTo(81.25, 2)
    expect(rtx?.administrationsInCourse).toBe(1)

    expect(pred?.doseMg).toBe(100)
    expect(pred?.administrationsInCourse).toBe(3)
    expect(pred?.packTotals).toEqual([{ presentation: { id: 't5', strengthMg: 5 }, count: 60 }])

    expect(course.days.map((day) => `${day.day}:${day.date}`)).toEqual([
      '1:2026-09-21',
      '2:2026-09-22',
      '3:2026-09-23',
    ])
    expect(course.days[0]?.administrations).toEqual([
      expect.objectContaining({ drugId: 'r.rituximab', start: '09:00', end: '13:00' }),
      expect.objectContaining({ drugId: 'r.prednisolone', start: '13:00', end: '13:00' }),
    ])
    expect(course.days[1]?.administrations.map((a) => a.drugId)).toEqual(['r.prednisolone'])
    expect(course.presentationTotals).toEqual([
      { presentation: { id: 'v500', strengthMg: 500 }, count: 1 },
      { presentation: { id: 'v100', strengthMg: 100 }, count: 3 },
      { presentation: { id: 't5', strengthMg: 5 }, count: 60 },
    ])
    expect(course.warnings).toEqual([])
    expect(rtx?.steps.map((step) => step.key)).toEqual([
      'bsa.mosteller',
      'bsa.cap',
      'dose.perBsa',
      'rounding.step',
      'infusion.volume',
      'infusion.concentration',
      'infusion.rate',
    ])
  })

  it('keeps both BSA variants and uses the selected one for vials and infusion', () => {
    // 190 cm × 95 kg → BSA 2.239 m², above the 2.0 m² cap.
    const big = { ...patient, heightCm: 190, weightKg: 95 }
    const actual = calculateCourse(big, [rituximab], { ...adjustments })
    const capped = calculateCourse(big, [rituximab], { ...adjustments, bsaVariant: 'capped' })

    expect(actual.bsa.isCapped).toBe(true)
    expect(actual.warnings).toEqual([expect.objectContaining({ code: 'bsa.capped' })])
    expect(actual.drugs[0]?.variants.differs).toBe(true)
    expect(actual.drugs[0]?.doseMg).toBe(840) // 375 × 2.2392 = 839.7 → 840 mg
    expect(actual.drugs[0]?.rounded.capped.roundedMg).toBe(750)
    expect(capped.drugs[0]?.doseMg).toBe(750)
    expect(capped.drugs[0]?.pack?.totalMg).toBe(800)
    expect(actual.drugs[0]?.pack?.totalMg).toBe(900)
  })

  it('applies course and per-drug reductions', () => {
    const course = calculateCourse(patient, [rituximab, prednisolone], {
      ...adjustments,
      coursePercent: 25,
      drugPercent: { 'r.prednisolone': 50 },
    })
    expect(course.drugs[0]?.doseMg).toBe(563) // 750 − 25% = 562.5 → 563 mg
    expect(course.drugs[0]?.variants.actual.reductionPercent).toBe(25)
    expect(course.drugs[1]?.doseMg).toBe(50) // per-drug 50% replaces the course 25%
  })

  it('leaves switched-off drugs out of doses, days and totals', () => {
    const course = calculateCourse(patient, [rituximab, prednisolone], {
      ...adjustments,
      disabledIds: ['r.rituximab'],
    })
    expect(course.drugs.map((drug) => drug.id)).toEqual(['r.prednisolone'])
    expect(course.days[0]?.administrations.map((a) => a.drugId)).toEqual(['r.prednisolone'])
    expect(course.presentationTotals).toEqual([
      { presentation: { id: 't5', strengthMg: 5 }, count: 60 },
    ])
  })

  it('warns when the absolute cap or a review rule applies', () => {
    const vincristine: CourseDrug = {
      id: 'r.vincristine',
      dose: { value: 1.4, unit: 'mg_m2', capMg: 2 },
      days: [1],
      reviewRules: { renal: true, elderly: { fromAgeYears: 60 } },
    }
    const course = calculateCourse({ ...patient, serumCreatinine: 200 }, [vincristine], adjustments)

    expect(course.drugs[0]?.doseMg).toBe(2) // 1.4 × 2.0 = 2.8 mg → capped at 2 mg
    expect(course.drugs[0]?.warnings.map((warning) => warning.code)).toEqual([
      'review.lowCreatinineClearance',
      'review.elderly',
      'dose.capped',
    ])
    expect(course.drugs[0]?.pack).toBeNull()
    expect(course.drugs[0]?.packTotals).toEqual([])
  })

  it('needs creatinine for AUC doses and then uses Calvert', () => {
    const carboplatin: CourseDrug = {
      id: 'r.carboplatin',
      dose: { value: 5, unit: 'auc' },
      days: [1],
    }
    const { serumCreatinine: _omitted, ...withoutCreatinine } = patient

    expect(() => calculateCourse(withoutCreatinine, [carboplatin], adjustments)).toThrow(
      DomainInputError,
    )
    const course = calculateCourse(patient, [carboplatin], adjustments)
    // AUC 5 × (88.89 + 25) = 569.4 mg → 569 mg.
    expect(course.drugs[0]?.doseMg).toBe(569)
  })

  it('schedules several administrations a day and shifts the rest of the day with them', () => {
    const twiceDaily: CourseDrug = { ...prednisolone, administrationsPerDay: 2, durationMin: 30 }
    const course = calculateCourse(patient, [rituximab, twiceDaily], {
      ...adjustments,
      dayStart: '08:00',
      shiftMin: { 'r.rituximab': 60 },
    })

    expect(course.days[0]?.administrations).toEqual([
      expect.objectContaining({ id: 'r.rituximab', start: '09:00', end: '13:00' }),
      expect.objectContaining({ id: 'r.prednisolone#1', start: '13:00', end: '13:30' }),
      expect.objectContaining({ id: 'r.prednisolone#2', start: '13:30', end: '14:00' }),
    ])
    expect(course.drugs[1]?.administrationsInCourse).toBe(6)
    expect(course.days[0]?.presentations).toEqual([
      { presentation: { id: 'v500', strengthMg: 500 }, count: 1 },
      { presentation: { id: 'v100', strengthMg: 100 }, count: 3 },
      { presentation: { id: 't5', strengthMg: 5 }, count: 40 },
    ])
  })

  it('passes implausible patient values through as warnings, not errors', () => {
    const course = calculateCourse({ ...patient, weightKg: 17 }, [prednisolone], adjustments)
    expect(course.warnings).toEqual([
      expect.objectContaining({
        code: 'input.outOfRange',
        params: expect.objectContaining({ field: 'weightKg' }),
      }),
    ])
  })

  it('rejects malformed course input', () => {
    expect(() => calculateCourse(patient, [rituximab, rituximab], adjustments)).toThrow(
      /duplicate drug id/,
    )
    expect(() => calculateCourse(patient, [{ ...prednisolone, days: [] }], adjustments)).toThrow(
      DomainInputError,
    )
    expect(() =>
      calculateCourse(patient, [{ ...prednisolone, administrationsPerDay: 0 }], adjustments),
    ).toThrow(DomainInputError)
  })

  it('works without creatinine and without presentations', () => {
    const { serumCreatinine: _omitted, ...withoutCreatinine } = patient
    const bare: CourseDrug = { id: 'x', dose: { value: 10, unit: 'mg_kg' }, days: [1] }
    const course = calculateCourse(withoutCreatinine, [bare], adjustments)

    expect(course.creatinineClearanceMlMin).toBeNull()
    expect(course.drugs[0]?.doseMg).toBe(800)
    expect(course.drugs[0]?.infusion).toBeNull()
    expect(course.presentationTotals).toEqual([])
  })
})
