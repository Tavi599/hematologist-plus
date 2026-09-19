import { describe, expect, it } from 'vitest'

import { calculateInfusion, rampSchedule } from './infusion'
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
    const result = calculateInfusion({ doseAmount: 682, params: rituximab, durationMin: 240 })
    expect(result.bagVolumeMl).toBe(250)
    expect(result.drugVolumeMl).toBeCloseTo(68.2, 10)
    expect(result.totalVolumeMl).toBeCloseTo(318.2, 10)
    expect(result.concentrationPerMl).toBeCloseTo(2.1433, 4)
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
    const result = calculateInfusion({ doseAmount: 200, params: { bagVolumesMl: [100] } })
    expect(result.totalVolumeMl).toBe(100)
    expect(result.rateMlH).toBeNull()
    expect(result.rateGttMin).toBeNull()
    expect(result.steps).toHaveLength(2)
  })

  it('flags under-concentration but keeps a bag that respects the maximum', () => {
    const result = calculateInfusion({
      doseAmount: 5,
      params: { concentrationMinMgMl: 1, concentrationMaxMgMl: 4, bagVolumesMl: [100, 250] },
    })
    expect(result.issue).toBe('concentration_out_of_range')
    expect(result.bagVolumeMl).toBe(100)
  })

  it('uses the largest bag when even it is too concentrated', () => {
    const result = calculateInfusion({
      doseAmount: 2000,
      params: { concentrationMaxMgMl: 1, bagVolumesMl: [100, 500] },
    })
    expect(result.issue).toBe('concentration_out_of_range')
    expect(result.bagVolumeMl).toBe(500)
  })

  it('supports a custom drop factor', () => {
    // 100 mL over 60 min = 100 mL/h; × 60 / 60 = 100 gtt/min
    const result = calculateInfusion({
      doseAmount: 10,
      params: { bagVolumesMl: [100] },
      durationMin: 60,
      dropFactorGttPerMl: 60,
    })
    expect(result.rateGttMin).toBe(100)
  })

  it('validates input', () => {
    expect(() => calculateInfusion({ doseAmount: 10, params: { bagVolumesMl: [] } })).toThrow(
      DomainInputError,
    )
    expect(() => calculateInfusion({ doseAmount: 0, params: { bagVolumesMl: [100] } })).toThrow(
      DomainInputError,
    )
    expect(() =>
      calculateInfusion({ doseAmount: 10, params: { bagVolumesMl: [100] }, durationMin: 0 }),
    ).toThrow(DomainInputError)
    expect(() =>
      calculateInfusion({
        doseAmount: 10,
        params: { bagVolumesMl: [100], stockConcentrationMgMl: -1 },
      }),
    ).toThrow(DomainInputError)
  })
})
describe('rate raised in steps', () => {
  // The department gives rituximab at 25 mL/h the first time, 50 mL/h afterwards, raising the
  // rate by the same amount every 30 min up to 200 mL/h.
  const first = { startMlH: 25, stepMlH: 25, everyMin: 30, maxMlH: 200 }
  const next = { startMlH: 50, stepMlH: 50, everyMin: 30, maxMlH: 200 }

  it('derives the duration of a 500 mL bag from the steps', () => {
    // 12.5 + 25 + 37.5 + 50 + 62.5 + 75 + 87.5 + 100 = 450 mL in eight half-hours,
    // then the last 50 mL at the top rate of 200 mL/h = 15 min.
    expect(rampSchedule(500, first).durationMin).toBe(255)
    // 25 + 50 + 75 + 100 + 100 + 100 = 450 mL in six half-hours, then 15 min more.
    expect(rampSchedule(500, next).durationMin).toBe(195)
  })

  it('lists every step with its rate and volume', () => {
    const steps = rampSchedule(100, next).steps
    expect(steps).toEqual([
      { fromMin: 0, toMin: 30, rateMlH: 50, volumeMl: 25 },
      { fromMin: 30, toMin: 60, rateMlH: 100, volumeMl: 50 },
      { fromMin: 60, toMin: 70, rateMlH: 150, volumeMl: 25 },
    ])
    expect(steps.reduce((sum, step) => sum + step.volumeMl, 0)).toBe(100)
  })

  it('never exceeds the maximum rate', () => {
    const rates = rampSchedule(2000, next).steps.map((step) => step.rateMlH)
    expect(Math.max(...rates)).toBe(200)
  })

  it('takes the duration from the ramp instead of the regimen', () => {
    const result = calculateInfusion({
      doseAmount: 500,
      params: { bagVolumesMl: [500], rateRamp: { first, next } },
      durationMin: 60,
    })
    expect(result.ramp?.first.durationMin).toBe(255)
    expect(result.ramp?.next.durationMin).toBe(195)
    // One rate for the whole infusion would be a lie here.
    expect(result.rateMlH).toBeNull()
  })

  it('rejects a ramp that cannot finish', () => {
    expect(() => rampSchedule(100, { ...first, maxMlH: 10 })).toThrow(DomainInputError)
    expect(() => rampSchedule(100, { ...first, startMlH: 0 })).toThrow(DomainInputError)
  })
})
