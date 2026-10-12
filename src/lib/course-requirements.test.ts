import { describe, expect, it } from 'vitest'

import type { PatientInput } from '../schemas/patient'
import type { CourseItem } from './course-input'
import { missingRequirements, unadjustedSupport } from './course-requirements'

function entry(
  id: string,
  unit: string,
  extra: Partial<CourseItem['courseDrug']> = {},
  role: 'main' | 'supportive' = 'main',
): CourseItem {
  return {
    item: { id, role },
    courseDrug: { id, dose: { value: 1, unit }, days: [1], ...extra },
  } as unknown as CourseItem
}

const blank: PatientInput = {
  fullName: '',
  recordNumber: '',
  birthDate: null,
  ageYears: null,
  sex: null,
  heightCm: null,
  weightKg: null,
  serumCreatinine: null,
  creatinineUnit: 'umol_l',
  bilirubinUmolL: null,
} as unknown as PatientInput

const band = [{ minMlMin: 0, maxMlMin: 50, doseValue: 1, administrationsPerDay: 1 }]
const options = (patient: PatientInput | null, more: object = {}) => ({
  patient,
  disabledIds: [],
  bsaEntered: false,
  renalBandOffIds: [],
  ...more,
})

describe('missingRequirements', () => {
  it('asks nothing of a course of flat doses', () => {
    expect(missingRequirements([entry('cef', 'mg_flat')], options(blank))).toEqual([])
  })

  it('asks for height and weight only for a dose per m², unless the BSA is typed in', () => {
    const items = [entry('cyt', 'mg_m2'), entry('cef', 'mg_flat')]
    expect(missingRequirements(items, options(blank))).toEqual([
      { reason: 'bsa', fields: ['heightCm', 'weightKg'], itemIds: ['cyt'] },
    ])
    expect(missingRequirements(items, options(blank, { bsaEntered: true }))).toEqual([])
  })

  it('asks for what Cockcroft-Gault needs when the dose follows the clearance', () => {
    const items = [entry('mero', 'mg_flat', { renalBands: band } as never)]
    const partial = { ...blank, ageYears: 60, sex: 'male', weightKg: 70 } as PatientInput
    expect(missingRequirements(items, options(partial))).toEqual([
      { reason: 'clearance', fields: ['serumCreatinine'], itemIds: ['mero'] },
    ])
    // The correction switched off by the physician asks for nothing.
    expect(missingRequirements(items, options(partial, { renalBandOffIds: ['mero'] }))).toEqual([])
  })

  it('asks for sex and height for an aminoglycoside on the ideal weight, and skips rows off', () => {
    const items = [entry('ami', 'mg_kg', { dosingWeight: 'adjusted' } as never)]
    const weighed = { ...blank, weightKg: 90 } as PatientInput
    expect(missingRequirements(items, options(weighed))).toEqual([
      { reason: 'dosingWeight', fields: ['sex', 'heightCm'], itemIds: ['ami'] },
    ])
    expect(missingRequirements(items, options(weighed, { disabledIds: ['ami'] }))).toEqual([])
  })

  it('does not hold the course up for prophylaxis, but says it is not corrected', () => {
    const items = [entry('acv', 'mg_flat', { renalBands: band } as never, 'supportive')]
    expect(missingRequirements(items, options(blank))).toEqual([])
    expect(unadjustedSupport(items, { patient: blank, disabledIds: [] })).toEqual({
      fields: ['ageYears', 'sex', 'weightKg', 'serumCreatinine'],
      itemIds: ['acv'],
    })
  })
})
