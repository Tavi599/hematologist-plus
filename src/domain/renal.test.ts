import { describe, expect, it } from 'vitest'

import { calvertDose, cockcroftGault, creatinineToMgDl, creatinineToUmolL } from './renal'
import { DomainInputError } from './types'

describe('creatinine units', () => {
  it('converts between µmol/L and mg/dL', () => {
    expect(creatinineToMgDl(88.4, 'umol_l')).toBeCloseTo(1, 10)
    expect(creatinineToMgDl(1.2, 'mg_dl')).toBe(1.2)
    expect(creatinineToUmolL(1, 'mg_dl')).toBeCloseTo(88.4, 10)
    expect(creatinineToUmolL(100, 'umol_l')).toBe(100)
    expect(() => creatinineToMgDl(0, 'umol_l')).toThrow(DomainInputError)
  })
})

describe('cockcroftGault', () => {
  const base = { ageYears: 60, weightKg: 70, serumCreatinine: 1, creatinineUnit: 'mg_dl' } as const

  it('calculates male clearance', () => {
    // (140 − 60) × 70 / (72 × 1.0) = 77.778
    expect(cockcroftGault({ ...base, sex: 'male' }).mlMin).toBeCloseTo(77.778, 3)
  })

  it('applies the 0.85 female factor', () => {
    // 77.778 × 0.85 = 66.111
    expect(cockcroftGault({ ...base, sex: 'female' }).mlMin).toBeCloseTo(66.111, 3)
  })

  it('gives the same result for µmol/L input', () => {
    const result = cockcroftGault({
      ...base,
      sex: 'male',
      serumCreatinine: 88.4,
      creatinineUnit: 'umol_l',
    })
    expect(result.mlMin).toBeCloseTo(77.778, 3)
    expect(result.steps[0]?.params?.serumCreatinineMgDl).toBeCloseTo(1, 10)
  })

  it('rejects impossible ages', () => {
    expect(() => cockcroftGault({ ...base, sex: 'male', ageYears: 140 })).toThrow(DomainInputError)
    expect(() => cockcroftGault({ ...base, sex: 'male', ageYears: 0 })).toThrow(DomainInputError)
  })
})

describe('calvertDose', () => {
  it('calculates AUC × (GFR + 25)', () => {
    // 5 × (77.778 + 25) = 513.89
    const result = calvertDose(5, 77.778)
    expect(result.doseMg).toBeCloseTo(513.89, 2)
    expect(result.isGfrCapped).toBe(false)
  })

  it('caps GFR at 125 mL/min', () => {
    // 5 × (125 + 25) = 750
    const result = calvertDose(5, 150)
    expect(result.doseMg).toBe(750)
    expect(result.gfrUsedMlMin).toBe(125)
    expect(result.isGfrCapped).toBe(true)
  })

  it('validates inputs', () => {
    expect(() => calvertDose(0, 80)).toThrow(DomainInputError)
    expect(() => calvertDose(5, -1)).toThrow(DomainInputError)
    expect(calvertDose(5, 0).doseMg).toBe(125)
  })
})
