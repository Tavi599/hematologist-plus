import { describe, expect, it } from 'vitest'

import { calculateInfusion } from './infusion'
import { DomainInputError } from './types'

describe('calculateInfusion', () => {
  const rituximab = {
    concentrationMinMgMl: 1,
    concentrationMaxMgMl: 4,
    bagVolumesMl: [500, 100, 250],
    stockConcentrationMgMl: 10,
  }

  it('chooses the smallest bag within concentration limits', () => {
    // drug volume 682 / 10 = 68.2 mL
    // 100 mL bag: 682 / 168.2 = 4.05 mg/mL > 4 → too concentrated
    // 250 mL bag: 682 / 318.2 = 2.143 mg/mL ✓
    // rate over 4 h: 318.2 / 4 = 79.55 mL/h; × 20 / 60 = 26.52 gtt/min
    const result = calculateInfusion({ doseMg: 682, params: rituximab, durationMin: 240 })
    expect(result.bagVolumeMl).toBe(250)
    expect(result.drugVolumeMl).toBeCloseTo(68.2, 10)
    expect(result.totalVolumeMl).toBeCloseTo(318.2, 10)
    expect(result.concentrationMgMl).toBeCloseTo(2.1433, 4)
    expect(result.rateMlH).toBeCloseTo(79.55, 2)
    expect(result.rateGttMin).toBeCloseTo(26.52, 2)
    expect(result.issue).toBeNull()
    expect(result.steps.map((s) => s.key)).toEqual([
      'infusion.volume',
      'infusion.concentration',
      'infusion.rate',
    ])
  })

  it('ignores drug volume when stock concentration is unknown', () => {
    const result = calculateInfusion({ doseMg: 200, params: { bagVolumesMl: [100] } })
    expect(result.totalVolumeMl).toBe(100)
    expect(result.rateMlH).toBeNull()
    expect(result.rateGttMin).toBeNull()
    expect(result.steps).toHaveLength(2)
  })

  it('flags under-concentration but keeps a bag that respects the maximum', () => {
    const result = calculateInfusion({
      doseMg: 5,
      params: { concentrationMinMgMl: 1, concentrationMaxMgMl: 4, bagVolumesMl: [100, 250] },
    })
    expect(result.issue).toBe('concentration_out_of_range')
    expect(result.bagVolumeMl).toBe(100)
  })

  it('uses the largest bag when even it is too concentrated', () => {
    const result = calculateInfusion({
      doseMg: 2000,
      params: { concentrationMaxMgMl: 1, bagVolumesMl: [100, 500] },
    })
    expect(result.issue).toBe('concentration_out_of_range')
    expect(result.bagVolumeMl).toBe(500)
  })

  it('supports a custom drop factor', () => {
    // 100 mL over 60 min = 100 mL/h; × 60 / 60 = 100 gtt/min
    const result = calculateInfusion({
      doseMg: 10,
      params: { bagVolumesMl: [100] },
      durationMin: 60,
      dropFactorGttPerMl: 60,
    })
    expect(result.rateGttMin).toBe(100)
  })

  it('validates input', () => {
    expect(() => calculateInfusion({ doseMg: 10, params: { bagVolumesMl: [] } })).toThrow(
      DomainInputError,
    )
    expect(() => calculateInfusion({ doseMg: 0, params: { bagVolumesMl: [100] } })).toThrow(
      DomainInputError,
    )
    expect(() =>
      calculateInfusion({ doseMg: 10, params: { bagVolumesMl: [100] }, durationMin: 0 }),
    ).toThrow(DomainInputError)
    expect(() =>
      calculateInfusion({
        doseMg: 10,
        params: { bagVolumesMl: [100], stockConcentrationMgMl: -1 },
      }),
    ).toThrow(DomainInputError)
  })
})
