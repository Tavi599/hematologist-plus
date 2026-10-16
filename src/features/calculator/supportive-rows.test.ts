import { describe, expect, it } from 'vitest'

import {
  infusionHow,
  infusionRow,
  infusionTherapyRows,
  NO_INFUSION_THERAPY,
  infusionWhat,
  ivigSupportRows,
  presetRow,
  standardAdditives,
} from './supportive-rows'

describe('ivigSupportRows', () => {
  it('writes the department support of immunoglobulin above it, on its days', () => {
    const rows = ivigSupportRows('ivig', [1])
    expect(rows.map((row) => row.what.split('\n')[0])).toEqual([
      'Р-н Натрію хлориду 0,9% - 500 мл',
      'Парацетамол 1000 мг',
      'Дексаметазон 8 мг',
    ])
    expect(rows.every((row) => row.before && row.supportFor === 'ivig')).toBe(true)
    expect(rows.every((row) => row.days.join() === '1' && row.block === 'infusion')).toBe(true)
    // 500 mL carries the department's standard additives: 20 mL of KCl 4%, 2 mL of MgSO4 25%.
    expect(rows[0]!.what).toContain('4% - 20 мл')
    expect(rows[0]!.what).toContain('25% - 2 мл')
  })
})

describe('standardAdditives', () => {
  it('carries potassium and magnesium in proportion to the bag', () => {
    expect(standardAdditives(1000)).toEqual({ kclMl: 40, mgso4Ml: 4 })
    expect(standardAdditives(500)).toEqual({ kclMl: 20, mgso4Ml: 2 })
    expect(standardAdditives(3000)).toEqual({ kclMl: 120, mgso4Ml: 12 })
    // 7.5% KCl is the alternative at 20 mL a litre.
    expect(standardAdditives(1000, '7.5')).toEqual({ kclMl: 20, mgso4Ml: 4 })
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

describe('the standard infusion therapy', () => {
  const therapy = { ...NO_INFUSION_THERAPY, on: true }

  it('is saline 1000 mL with 4% KCl and MgSO4, on the days of the cytostatics, before them', () => {
    const rows = infusionTherapyRows(therapy, [1, 2, 3], 11)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      what: 'NaCl 0,9% 1000 мл + KCl 4% 40 мл + MgSO4 25% 4 мл',
      how: 'в/в крап.',
      days: [1, 2, 3],
      hour: 11,
      block: 'infusion',
      before: true,
    })
  })

  it('takes 7.5% KCl at 20 mL a litre, and carries the additives in proportion to the bag', () => {
    const rows = infusionTherapyRows(
      {
        ...therapy,
        nacl: { on: true, volumeMl: 3000, kcl: '7.5', mgso4: true },
        glucose: { on: true, volumeMl: 500, kcl: '4', mgso4: false },
      },
      [1],
      11,
    )
    expect(rows.map((row) => row.what)).toEqual([
      'NaCl 0,9% 3000 мл + KCl 7,5% 60 мл + MgSO4 25% 12 мл',
      'Глюкоза 5% 500 мл + KCl 4% 20 мл',
    ])
  })

  it('gives a small bag or a bag without additives clean, on the days and hour chosen', () => {
    const rows = infusionTherapyRows(
      {
        ...therapy,
        nacl: { on: true, volumeMl: 250, kcl: '4', mgso4: true },
        glucose: { on: true, volumeMl: 1000, kcl: 'none', mgso4: false },
        days: [2, 4],
        hour: 14,
      },
      [1],
      11,
    )
    expect(rows.map((row) => [row.what, row.days, row.hour])).toEqual([
      ['NaCl 0,9% 250 мл', [2, 4], 14],
      ['Глюкоза 5% 1000 мл', [2, 4], 14],
    ])
  })

  it('writes nothing while switched off', () => {
    expect(infusionTherapyRows(NO_INFUSION_THERAPY, [1], 11)).toEqual([])
  })
})
