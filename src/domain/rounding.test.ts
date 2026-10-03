import { describe, expect, it } from 'vitest'

import { roundDose } from './rounding'
import { DomainInputError } from './types'

const vials = [
  { id: 'v100', strengthAmount: 100 },
  { id: 'v500', strengthAmount: 500 },
]

describe('roundDose', () => {
  it('rounds to 1 mg by default and keeps the unrounded value', () => {
    const result = roundDose(681.795)
    expect(result).toMatchObject({ unroundedAmount: 681.795, roundedAmount: 682, method: 'step' })
    expect(result.deviationPercent).toBeCloseTo(0.0301, 4)
  })

  it('rounds halves up', () => {
    expect(roundDose(12.5).roundedAmount).toBe(13)
    expect(roundDose(90.5).roundedAmount).toBe(91)
  })

  it('supports custom steps', () => {
    expect(roundDose(2.545, { step: 0.1 }).roundedAmount).toBe(2.5)
    expect(roundDose(1363.59, { step: 5 }).roundedAmount).toBe(1365)
  })

  it('does not snap to vials unless a tolerance is given', () => {
    expect(roundDose(487, { presentations: vials }).roundedAmount).toBe(487)
  })

  it('snaps to the nearest whole-vial amount within tolerance', () => {
    // 487 → 500 (+2.67%)
    const result = roundDose(487, { presentations: vials, vialTolerancePercent: 5 })
    expect(result.roundedAmount).toBe(500)
    expect(result.method).toBe('vial')
    expect(result.steps[0]?.key).toBe('rounding.vial')
    // 412 → 400 (−2.9%)
    expect(roundDose(412, { presentations: vials, vialTolerancePercent: 5 }).roundedAmount).toBe(
      400,
    )
  })

  it('falls back to step rounding when vials are too far', () => {
    // 440: nearest vial amount 400 is −9.1%
    const result = roundDose(440.4, { presentations: vials, vialTolerancePercent: 5 })
    expect(result).toMatchObject({ roundedAmount: 440, method: 'step' })
  })

  it('breaks ties upwards', () => {
    expect(roundDose(450, { presentations: vials, vialTolerancePercent: 20 }).roundedAmount).toBe(
      500,
    )
  })

  it('rounds up to whole packs of the smallest strength: 6.5 ampoules become 7', () => {
    const packs = [
      { id: 'a400', strengthAmount: 400 },
      { id: 'v1000', strengthAmount: 1000 },
    ]
    const result = roundDose(2600, { presentations: packs, roundUpToWholePack: true })
    expect(result.roundedAmount).toBe(2800)
    expect(result.method).toBe('pack')
    expect(result.steps[0]).toMatchObject({
      key: 'rounding.packUp',
      params: { packAmount: 400, packs: 7, unrounded: 2600 },
    })
  })

  it('keeps an exact number of packs and wins over vial snapping', () => {
    const packs = [{ id: 'a400', strengthAmount: 400 }]
    const exact = roundDose(1200.0000001, {
      presentations: packs,
      roundUpToWholePack: true,
      vialTolerancePercent: 50,
    })
    expect(exact.roundedAmount).toBe(1200)
    expect(exact.method).toBe('pack')
  })

  it('falls back to the step when there is no pack to round up to', () => {
    const result = roundDose(858.4, { roundUpToWholePack: true })
    expect(result.roundedAmount).toBe(858)
    expect(result.method).toBe('step')
  })

  it('rounds a dose below 10 mg to tenths: bortezomib 2.34 mg is 2.3, not 2', () => {
    expect(roundDose(2.34).roundedAmount).toBe(2.3)
    expect(roundDose(2.34).steps[0]?.params).toMatchObject({ step: 0.1 })
    // Vincristine 0.4 mg a day (VAD) no longer rounds to nothing.
    expect(roundDose(0.4).roundedAmount).toBe(0.4)
    expect(roundDose(9.96).roundedAmount).toBe(10)
  })

  it('keeps whole milligrams from 10 mg up and for other units', () => {
    expect(roundDose(10.4).roundedAmount).toBe(10)
    expect(roundDose(2.34, { unit: 'mcg' }).roundedAmount).toBe(2)
  })

  it('handles zero and invalid input', () => {
    expect(roundDose(0)).toMatchObject({ roundedAmount: 0, deviationPercent: 0 })
    expect(() => roundDose(-1)).toThrow(DomainInputError)
    expect(() => roundDose(10, { presentations: vials, vialTolerancePercent: 150 })).toThrow(
      DomainInputError,
    )
  })
})
