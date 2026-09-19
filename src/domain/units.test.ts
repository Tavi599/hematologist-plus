import { describe, expect, it } from 'vitest'

import { DomainInputError } from './types'
import {
  amountFamily,
  amountUnitOf,
  convertAmount,
  doseBasisOf,
  doseUnitOf,
  isMassUnit,
  sameFamily,
} from './units'

describe('amount units', () => {
  it('splits a dose unit into its amount and its basis', () => {
    expect(amountUnitOf('mg_m2')).toBe('mg')
    expect(amountUnitOf('iu_flat')).toBe('iu')
    expect(amountUnitOf('miu_kg')).toBe('miu')
    expect(doseBasisOf('mcg_kg')).toBe('kg')
    expect(doseBasisOf('iu_m2')).toBe('m2')
    expect(doseUnitOf('iu', 'm2')).toBe('iu_m2')
  })

  it('treats the Calvert AUC as milligrams', () => {
    expect(amountUnitOf('auc')).toBe('mg')
    expect(doseBasisOf('auc')).toBe('auc')
  })

  it('knows which units measure mass', () => {
    expect(amountFamily('mcg')).toBe('mass')
    expect(amountFamily('iu')).toBe('activity')
    expect(isMassUnit('mg')).toBe(true)
    expect(isMassUnit('miu')).toBe(false)
    expect(sameFamily('iu', 'miu')).toBe(true)
    expect(sameFamily('mg', 'iu')).toBe(false)
  })

  it('converts inside a family without floating-point dust', () => {
    expect(convertAmount(350, 'mcg', 'mg')).toBe(0.35)
    expect(convertAmount(0.35, 'mg', 'mcg')).toBe(350)
    expect(convertAmount(3, 'miu', 'iu')).toBe(3_000_000)
    expect(convertAmount(15_000, 'iu', 'miu')).toBe(0.015)
    expect(convertAmount(7, 'mg', 'mg')).toBe(7)
  })

  it('refuses to turn milligrams into units of activity', () => {
    // How many IU a milligram holds is a property of the drug, printed on its label.
    expect(() => convertAmount(15, 'mg', 'iu')).toThrow(DomainInputError)
    expect(() => convertAmount(1, 'miu', 'mcg')).toThrow(/not interchangeable/)
  })
})
