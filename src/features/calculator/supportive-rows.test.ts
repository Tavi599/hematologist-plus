import { describe, expect, it } from 'vitest'

import {
  infusionHow,
  infusionRow,
  infusionWhat,
  presetRow,
  standardAdditives,
} from './supportive-rows'

describe('standardAdditives', () => {
  it('carries potassium and magnesium in proportion to the bag', () => {
    expect(standardAdditives(1000)).toEqual({ kclMl: 40, mgso4Ml: 4 })
    expect(standardAdditives(500)).toEqual({ kclMl: 20, mgso4Ml: 2 })
    expect(standardAdditives(3000)).toEqual({ kclMl: 120, mgso4Ml: 12 })
  })

  it('has no standard for a small bag', () => {
    for (const volume of [100, 150, 200, 250, 400]) {
      expect(standardAdditives(volume)).toBeNull()
    }
  })
})

describe('infusionWhat', () => {
  const base = { solvent: 'nacl', volumeMl: 1000, rateMlH: null } as const

  it('writes the department line', () => {
    expect(infusionWhat({ ...base, kclMl: 40, mgso4Ml: 4 })).toBe(
      'NaCl 0,9% 1000 мл + KCl 4% 40 мл + MgSO4 25% 4 мл',
    )
  })

  it('leaves out an additive that is switched off', () => {
    expect(infusionWhat({ ...base, kclMl: null, mgso4Ml: 4 })).toBe(
      'NaCl 0,9% 1000 мл + MgSO4 25% 4 мл',
    )
    expect(infusionWhat({ ...base, solvent: 'glucose', kclMl: 0, mgso4Ml: null })).toBe(
      'Глюкоза 5% 1000 мл',
    )
  })

  it('writes a fractional amount with a decimal comma', () => {
    expect(infusionWhat({ ...base, volumeMl: 250, kclMl: 2.5, mgso4Ml: null })).toBe(
      'NaCl 0,9% 250 мл + KCl 4% 2,5 мл',
    )
  })
})

describe('rows', () => {
  it('gives the rate when there is one', () => {
    expect(infusionHow(150)).toBe('в/в крап. 150 мл/год')
    expect(infusionHow(null)).toBe('в/в крап.')
  })

  it('makes a hand-written line that is printed on the hourly sheet', () => {
    const row = infusionRow(
      'a',
      { solvent: 'nacl', volumeMl: 100, kclMl: null, mgso4Ml: null, rateMlH: null },
      [1, 2],
    )
    expect(row).toMatchObject({ block: 'infusion', days: [1, 2], hour: null })
    expect(row.what).toBe('NaCl 0,9% 100 мл')
  })

  it('makes the antiemetic and the proton-pump inhibitor lines', () => {
    expect(presetRow('b', 'ondansetron', [1]).what).toBe('Ондансетрон 8 мг')
    expect(presetRow('c', 'omeprazole', [1]).how).toBe('в/в струминно повільно')
  })
})
