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
  it('crosses between mass and activity only by the number on the label of that drug', () => {
    // Filgrastim: the same syringe is labelled 300 mcg and 30 million IU.
    const filgrastim = {
      amount: 300,
      amount_unit: 'mcg' as const,
      activity: 30,
      activity_unit: 'miu' as const,
    }
    expect(convertAmount(480, 'mcg', 'miu', filgrastim)).toBe(48)
    expect(convertAmount(48, 'miu', 'mcg', filgrastim)).toBe(480)
    expect(convertAmount(0.3, 'mg', 'miu', filgrastim)).toBe(30)
    expect(convertAmount(30_000_000, 'iu', 'mcg', filgrastim)).toBe(300)
    // The same drug still converts inside a family exactly as before.
    expect(convertAmount(480, 'mcg', 'mg', filgrastim)).toBe(0.48)
  })

  it('refuses an equivalence that is not a mass on one side and an activity on the other', () => {
    const wrong = {
      amount: 1,
      amount_unit: 'iu' as const,
      activity: 1,
      activity_unit: 'miu' as const,
    }
    expect(() => convertAmount(1, 'mg', 'iu', wrong)).toThrow(/mass unit and an activity unit/)
    const zero = {
      amount: 0,
      amount_unit: 'mcg' as const,
      activity: 30,
      activity_unit: 'miu' as const,
    }
    expect(() => convertAmount(1, 'mg', 'iu', zero)).toThrow(/must be positive/)
  })
})
