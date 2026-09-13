import { describe, expect, it } from 'vitest'

import { checkPatientInputs, suggestDoseReview } from './warnings'

describe('checkPatientInputs', () => {
  it('accepts plausible adult values', () => {
    expect(
      checkPatientInputs({ ageYears: 55, heightCm: 170, weightKg: 70, creatinineUmolL: 90 }),
    ).toEqual([])
  })

  it('flags values outside adult ranges', () => {
    expect(checkPatientInputs({ weightKg: 17, heightCm: 1700 })).toEqual([
      { code: 'input.outOfRange', params: { field: 'heightCm', value: 1700, min: 120, max: 230 } },
      { code: 'input.outOfRange', params: { field: 'weightKg', value: 17, min: 30, max: 250 } },
    ])
  })
})

describe('suggestDoseReview', () => {
  it('suggests review for low creatinine clearance with the default threshold', () => {
    expect(suggestDoseReview({ creatinineClearanceMlMin: 45 }, { renal: true })).toEqual([
      { code: 'review.lowCreatinineClearance', params: { value: 45, threshold: 60 } },
    ])
  })

  it('uses drug-specific thresholds', () => {
    expect(
      suggestDoseReview({ creatinineClearanceMlMin: 45 }, { renal: { belowMlMin: 30 } }),
    ).toEqual([])
    expect(
      suggestDoseReview({ bilirubinUmolL: 25 }, { hepatic: { aboveUmolL: 20 } })[0]?.code,
    ).toBe('review.highBilirubin')
    expect(suggestDoseReview({ ageYears: 65 }, { elderly: { fromAgeYears: 60 } })[0]?.code).toBe(
      'review.elderly',
    )
  })

  it('checks bilirubin and age with default thresholds', () => {
    const warnings = suggestDoseReview(
      { bilirubinUmolL: 40, ageYears: 72 },
      { hepatic: true, elderly: true },
    )
    expect(warnings.map((w) => w.code)).toEqual(['review.highBilirubin', 'review.elderly'])
  })

  it('skips checks the drug does not require or data that is missing', () => {
    expect(suggestDoseReview({ creatinineClearanceMlMin: 10, ageYears: 90 }, {})).toEqual([])
    expect(suggestDoseReview({}, { renal: true, hepatic: true, elderly: true })).toEqual([])
  })
})
