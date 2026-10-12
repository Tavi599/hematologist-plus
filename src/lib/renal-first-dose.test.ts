import { describe, expect, it } from 'vitest'

import { calculateCourse, type CourseDrug } from '../domain'
import type { RegimenItem } from '../schemas/catalog'
import type { CourseItem } from './course-input'
import { withFirstFullDose } from './renal-first-dose'

const cefepime: CourseDrug = {
  id: 'cefepime',
  dose: { value: 2000, unit: 'mg_flat' },
  days: [1, 2, 3, 4],
  administrationsPerDay: 3,
  intervalMin: 480,
  renalBands: [
    { minMlMin: 30, maxMlMin: 60, doseValue: 2000, administrationsPerDay: 2, intervalMin: 720 },
    { minMlMin: 11, maxMlMin: 29, doseValue: 2000, administrationsPerDay: 1, firstDoseFull: true },
    { minMlMin: 0, maxMlMin: 10, doseValue: 1000, administrationsPerDay: 1, firstDoseFull: true },
  ],
}
const item = {
  item: { id: 'cefepime', days: [1, 2, 3, 4], administrations_per_day: 3 } as RegimenItem,
  courseDrug: cefepime,
} as CourseItem

const patient = (creatinine: number) => ({
  ageYears: 70,
  weightKg: 70,
  heightCm: 175,
  sex: 'male' as const,
  serumCreatinine: creatinine,
  creatinineUnit: 'umol_l' as const,
})
const adjustments = { startDateIso: '2026-10-13' }

describe('withFirstFullDose', () => {
  it('splits day 1 off at the full dose where the corrected one is lower', () => {
    // CrCl ≈ 7 mL/min: 1 g once a day, the first dose 2 g.
    const course = calculateCourse(patient(800), [cefepime], adjustments)
    const items = withFirstFullDose([item], course)
    expect(items.map((entry) => entry.item.id)).toEqual(['cefepime--first', 'cefepime'])
    expect(items[0]!.firstDoseOf).toBe('cefepime')

    const split = calculateCourse(
      patient(800),
      items.map((entry) => entry.courseDrug),
      adjustments,
    )
    const first = split.drugs.find((drug) => drug.id === 'cefepime--first')!
    const rest = split.drugs.find((drug) => drug.id === 'cefepime')!
    expect(first.doseAmount).toBe(2000)
    expect(first.administrationsInCourse).toBe(1)
    expect(rest.doseAmount).toBe(1000)
    expect(rest.administrationsInCourse).toBe(3)
    expect(split.days[0]!.administrations.map((entry) => entry.drugId)).toEqual(['cefepime--first'])
  })

  it('leaves the row whole where the corrected dose is the regimen one', () => {
    // CrCl ≈ 19 mL/min: 2 g once a day, the first dose the same 2 g.
    const course = calculateCourse(patient(300), [cefepime], adjustments)
    expect(withFirstFullDose([item], course)).toEqual([item])
  })
})
