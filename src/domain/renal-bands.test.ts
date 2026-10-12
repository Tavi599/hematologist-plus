import { describe, expect, it } from 'vitest'

import { calculateCourse, type CourseDrug } from './course'
import { applyRenalBand } from './renal-bands'

// Cefepime 2 g every 8 h with the FDA ranges (table 2).
const cefepime: CourseDrug = {
  id: 'cefepime',
  dose: { value: 2000, unit: 'mg_flat' },
  days: [1, 2],
  administrationsPerDay: 3,
  intervalMin: 480,
  durationMin: 30,
  renalBands: [
    { minMlMin: 30, maxMlMin: 60, doseValue: 2000, administrationsPerDay: 2, intervalMin: 720 },
    { minMlMin: 11, maxMlMin: 29, doseValue: 2000, administrationsPerDay: 1 },
    { minMlMin: 0, maxMlMin: 10, doseValue: 1000, administrationsPerDay: 1 },
  ],
}

describe('applyRenalBand', () => {
  it('puts the dose and interval of the range in place of the regimen ones', () => {
    const { drug, adjustment, steps } = applyRenalBand(cefepime, 8.4, false)
    expect(drug.dose.value).toBe(1000)
    expect(drug.administrationsPerDay).toBe(1)
    expect(drug.intervalMin).toBeUndefined()
    expect(adjustment).toMatchObject({ status: 'applied', clearanceMlMin: 8 })
    expect(steps[0]).toMatchObject({ key: 'renal.band', value: 1000 })
  })

  it('rounds the clearance to whole mL/min, as the ranges are written', () => {
    expect(applyRenalBand(cefepime, 29.6, false).drug.administrationsPerDay).toBe(2)
    expect(applyRenalBand(cefepime, 29.4, false).drug.administrationsPerDay).toBe(1)
    expect(applyRenalBand(cefepime, 60.4, false).drug.administrationsPerDay).toBe(2)
  })

  it('keeps the regimen dose above every range', () => {
    const { drug, adjustment } = applyRenalBand(cefepime, 61, false)
    expect(drug).toBe(cefepime)
    expect(adjustment).toEqual({ status: 'above', clearanceMlMin: 61, aboveMlMin: 60 })
  })

  it('says the correction is unchecked without a clearance, never assuming normal kidneys', () => {
    const { drug, adjustment, warnings } = applyRenalBand(cefepime, undefined, false)
    expect(drug).toBe(cefepime)
    expect(adjustment).toEqual({ status: 'unchecked' })
    expect(warnings).toEqual([{ code: 'renal.bandUnchecked', params: { belowMlMin: 61 } }])
  })

  it('keeps the regimen dose when the physician switches the correction off, and says so', () => {
    const { drug, adjustment, warnings } = applyRenalBand(cefepime, 20, true)
    expect(drug).toBe(cefepime)
    expect(adjustment?.status).toBe('off')
    expect(warnings[0]?.code).toBe('renal.bandOff')
  })

  it('applies nothing to a dose the ranges were not written for', () => {
    const other = { ...cefepime, renalBands: undefined, renalBandsNotForDose: true }
    const { drug, adjustment, warnings } = applyRenalBand(other, 20, false)
    expect(drug).toBe(other)
    expect(adjustment).toEqual({ status: 'notForDose' })
    expect(warnings[0]?.code).toBe('renal.bandNotForDose')
  })
})

describe('renal ranges in a course', () => {
  const adjustments = { startDateIso: '2026-10-12' }
  // 70 years, 70 kg, male, creatinine 300 µmol/L: CrCl ≈ 19 mL/min.
  const patient = {
    ageYears: 70,
    weightKg: 70,
    heightCm: 175,
    sex: 'male' as const,
    serumCreatinine: 300,
    creatinineUnit: 'umol_l' as const,
  }

  it('gives the corrected dose once a day and schedules it so', () => {
    const course = calculateCourse(patient, [cefepime], adjustments)
    const drug = course.drugs[0]!
    expect(drug.doseAmount).toBe(2000)
    expect(drug.administrationsPerDay).toBe(1)
    expect(drug.administrationsInCourse).toBe(2)
    expect(course.days[0]!.administrations).toHaveLength(1)
    expect(drug.renal?.status).toBe('applied')
    expect(drug.steps[0]!.key).toBe('renal.band')
  })

  it('keeps the regimen schedule when switched off', () => {
    const course = calculateCourse(patient, [cefepime], {
      ...adjustments,
      renalBandOffIds: ['cefepime'],
    })
    expect(course.drugs[0]!.administrationsPerDay).toBe(3)
    expect(course.days[0]!.administrations).toHaveLength(3)
  })

  it('does not also ask to consider a reduction for a corrected drug', () => {
    const course = calculateCourse(
      patient,
      [{ ...cefepime, reviewRules: { renal: { belowMlMin: 60 } } }],
      adjustments,
    )
    expect(course.drugs[0]!.warnings.map((warning) => warning.code)).not.toContain(
      'review.lowCreatinineClearance',
    )
  })
})

describe('a range that gives no dose', () => {
  const vancomycin: CourseDrug = {
    id: 'vancomycin',
    dose: { value: 15, unit: 'mg_kg' },
    days: [1, 2],
    administrationsPerDay: 2,
    intervalMin: 720,
    renalBands: [
      { minMlMin: 20, maxMlMin: 49, doseValue: 15, administrationsPerDay: 1 },
      { minMlMin: 0, maxMlMin: 19, withhold: 'levels' },
    ],
  }
  const other: CourseDrug = { id: 'other', dose: { value: 100, unit: 'mg_flat' }, days: [1] }
  // CrCl ≈ 10 mL/min.
  const patient = {
    ageYears: 70,
    weightKg: 70,
    heightCm: 175,
    sex: 'male' as const,
    serumCreatinine: 600,
    creatinineUnit: 'umol_l' as const,
  }
  const adjustments = { startDateIso: '2026-10-12' }

  it('leaves the drug out of the course and says why', () => {
    const course = calculateCourse(patient, [vancomycin, other], adjustments)
    expect(course.drugs.map((drug) => drug.id)).toEqual(['other'])
    expect(course.days[0]!.administrations.map((entry) => entry.drugId)).toEqual(['other'])
    expect(course.renal.vancomycin).toMatchObject({ status: 'withheld', clearanceMlMin: 10 })
  })

  it('calculates the regimen dose when the physician switches the correction off', () => {
    const course = calculateCourse(patient, [vancomycin], {
      ...adjustments,
      renalBandOffIds: ['vancomycin'],
    })
    expect(course.drugs[0]!.administrationsPerDay).toBe(2)
    expect(course.drugs[0]!.warnings[0]?.code).toBe('renal.withheldOff.levels')
  })
})

describe('a range of doses within one band', () => {
  const colistin: CourseDrug = {
    id: 'colistin',
    dose: { value: 4.5, unit: 'miu_flat' },
    days: [1],
    administrationsPerDay: 2,
    intervalMin: 720,
    renalBands: [
      {
        minMlMin: 10,
        maxMlMin: 29,
        doseValue: 2.75,
        administrationsPerDay: 2,
        intervalMin: 720,
        doseRange: { min: 2.25, max: 2.75 },
      },
    ],
  }

  it('starts from the end the data gives and moves to the level the physician picks', () => {
    expect(applyRenalBand(colistin, 20, false).drug.dose.value).toBe(2.75)
    expect(applyRenalBand(colistin, 20, false, 'low').drug.dose.value).toBe(2.25)
    expect(applyRenalBand(colistin, 20, false, 'mid').drug.dose.value).toBe(2.5)
    const { adjustment, steps } = applyRenalBand(colistin, 20, false, 'low')
    expect(adjustment).toMatchObject({ status: 'applied', doseValue: 2.25 })
    expect(steps.map((step) => step.key)).toEqual(['renal.band', 'renal.bandRange'])
  })
})
