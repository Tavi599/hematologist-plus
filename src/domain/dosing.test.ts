import { describe, expect, it } from 'vitest'

import { calculateBsa } from './bsa'
import { calculateDose, calculateDoseVariants, effectiveReductionPercent } from './dosing'
import { DomainInputError } from './types'

// BSA 170 cm / 70 kg (Mosteller) = 1.81812 m²
const context = { bsaM2: 1.81812, weightKg: 70 }

describe('calculateDose — R-CHOP example', () => {
  it('calculates mg/m² doses', () => {
    // rituximab 375 × 1.81812 = 681.80
    expect(calculateDose({ value: 375, unit: 'mg_m2' }, context).doseMg).toBeCloseTo(681.8, 1)
    // cyclophosphamide 750 × 1.81812 = 1363.59
    expect(calculateDose({ value: 750, unit: 'mg_m2' }, context).doseMg).toBeCloseTo(1363.59, 2)
    // doxorubicin 50 × 1.81812 = 90.906
    expect(calculateDose({ value: 50, unit: 'mg_m2' }, context).doseMg).toBeCloseTo(90.906, 3)
  })

  it('caps vincristine at 2 mg', () => {
    // 1.4 × 1.81812 = 2.545 → 2
    const result = calculateDose({ value: 1.4, unit: 'mg_m2', capMg: 2 }, context)
    expect(result.baseMg).toBeCloseTo(2.545, 3)
    expect(result.doseMg).toBe(2)
    expect(result.isCapped).toBe(true)
    expect(result.steps.map((s) => s.key)).toEqual(['dose.perBsa', 'dose.cap'])
  })

  it('does not cap when below the limit', () => {
    const result = calculateDose(
      { value: 1.4, unit: 'mg_m2', capMg: 2 },
      { ...context, bsaM2: 1.2 },
    )
    expect(result.isCapped).toBe(false)
    expect(result.doseMg).toBeCloseTo(1.68, 10)
  })
})

describe('calculateDose — other units', () => {
  it('calculates mg/kg', () => {
    expect(calculateDose({ value: 10, unit: 'mg_kg' }, context).doseMg).toBe(700)
  })

  it('keeps flat doses', () => {
    const result = calculateDose({ value: 1400, unit: 'mg_flat' }, context)
    expect(result.doseMg).toBe(1400)
    expect(result.steps[0]?.key).toBe('dose.flat')
  })

  it('uses Calvert for AUC doses', () => {
    const result = calculateDose({ value: 5, unit: 'auc' }, { ...context, gfrMlMin: 77.778 })
    expect(result.doseMg).toBeCloseTo(513.89, 2)
    expect(result.steps[0]?.key).toBe('renal.calvert')
  })

  it('requires GFR for AUC doses', () => {
    expect(() => calculateDose({ value: 5, unit: 'auc' }, context)).toThrow(DomainInputError)
  })

  it('validates dose values', () => {
    expect(() => calculateDose({ value: 0, unit: 'mg_flat' }, context)).toThrow(DomainInputError)
    expect(() => calculateDose({ value: 1, unit: 'mg_flat', capMg: 0 }, context)).toThrow(
      DomainInputError,
    )
    expect(() => calculateDose({ value: 1, unit: 'mg_m2' }, { ...context, bsaM2: 0 })).toThrow(
      DomainInputError,
    )
  })
})

describe('dose reduction', () => {
  it('applies the course reduction', () => {
    // 90.906 × 0.75 = 68.18
    const result = calculateDose({ value: 50, unit: 'mg_m2' }, context, { coursePercent: 25 })
    expect(result.doseMg).toBeCloseTo(68.18, 2)
    expect(result.reductionPercent).toBe(25)
    expect(result.steps.at(-1)?.key).toBe('dose.reduction')
  })

  it('lets a per-drug reduction replace the course reduction', () => {
    // 90.906 × 0.5 = 45.45
    const result = calculateDose({ value: 50, unit: 'mg_m2' }, context, {
      coursePercent: 25,
      drugPercent: 50,
    })
    expect(result.doseMg).toBeCloseTo(45.45, 2)
    expect(effectiveReductionPercent({ coursePercent: 25, drugPercent: 0 })).toBe(0)
  })

  it('applies the cap before the reduction', () => {
    // 2.545 → cap 2 → × 0.5 = 1
    const result = calculateDose({ value: 1.4, unit: 'mg_m2', capMg: 2 }, context, {
      drugPercent: 50,
    })
    expect(result.doseMg).toBe(1)
  })

  it('rejects percentages outside 0–100', () => {
    expect(() => effectiveReductionPercent({ coursePercent: 120 })).toThrow(DomainInputError)
    expect(() => effectiveReductionPercent({ drugPercent: -5 })).toThrow(DomainInputError)
    expect(effectiveReductionPercent()).toBe(0)
  })
})

describe('calculateDoseVariants', () => {
  it('differs only for mg/m² doses in patients above the BSA cap', () => {
    // BSA 2.40947 vs 2.0: cyclophosphamide 1807.10 vs 1500
    const bsa = calculateBsa(190, 110)
    const cyclo = calculateDoseVariants({ value: 750, unit: 'mg_m2' }, bsa, { weightKg: 110 })
    expect(cyclo.actual.doseMg).toBeCloseTo(1807.1, 1)
    expect(cyclo.capped.doseMg).toBe(1500)
    expect(cyclo.differs).toBe(true)

    const flat = calculateDoseVariants({ value: 1400, unit: 'mg_flat' }, bsa, { weightKg: 110 })
    expect(flat.differs).toBe(false)
  })

  it('returns the same result for patients below the cap', () => {
    const bsa = calculateBsa(170, 70)
    const variants = calculateDoseVariants({ value: 375, unit: 'mg_m2' }, bsa, { weightKg: 70 })
    expect(variants.capped).toBe(variants.actual)
    expect(variants.differs).toBe(false)
  })
})
