import { describe, expect, it } from 'vitest'
import { rampKinds, type CourseDrug } from './course'

const steps = { startMlH: 50, stepMlH: 50, everyMin: 60, maxMlH: 200 }
const dara = (id: string, days: number[]): CourseDrug => ({
  id,
  dose: { value: 16, unit: 'mg_kg' },
  days,
  infusion: { bagVolumesMl: [500], rateRamp: { first: steps } },
  infusionSeries: { key: 'daratumumab', splitFirst: true },
})

describe('rampKinds', () => {
  it('counts a split first dose as one infusion and the rows of one drug together', () => {
    // Dara-VCd cycle 1: 8 mg/kg on days 1 and 2, then 16 mg/kg on days 8, 15, 22.
    const kinds = rampKinds([dara('split', [1, 2]), dara('weekly', [8, 15, 22])], {
      cycleNumber: 1,
    })
    expect(kinds.split).toEqual({ 1: 'first_split', 2: 'first_split' })
    expect(kinds.weekly).toEqual({ 8: 'second', 15: 'next', 22: 'next' })
  })

  it('gives an undivided first dose, then the second and the later ones', () => {
    expect(rampKinds([dara('weekly', [1, 8, 15, 22])], { cycleNumber: 1 }).weekly).toEqual({
      1: 'first',
      8: 'second',
      15: 'next',
      22: 'next',
    })
  })

  it('opens a later cycle with a later infusion unless the physician says otherwise', () => {
    expect(rampKinds([dara('weekly', [1, 8])], { cycleNumber: 2 }).weekly).toEqual({
      1: 'next',
      8: 'next',
    })
    expect(
      rampKinds([dara('weekly', [1, 8])], { cycleNumber: 2, infusionStart: { daratumumab: 2 } })
        .weekly,
    ).toEqual({ 1: 'second', 8: 'next' })
  })

  it('does not join consecutive days of a drug whose first dose is not split', () => {
    const drug = { ...dara('obi', [1, 2, 8]), infusionSeries: { key: 'obi', splitFirst: false } }
    expect(rampKinds([drug], { cycleNumber: 1 }).obi).toEqual({
      1: 'first',
      2: 'second',
      8: 'next',
    })
  })
})
