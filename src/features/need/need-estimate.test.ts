import { describe, expect, it } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import { indexCatalog } from '../../lib/catalog-index'
import { estimateCoursePacks, packsOf, regimensWithDrug, suggestedRegimen } from './need-estimate'

const catalog = indexCatalog(demoCatalog())

describe('need estimate', () => {
  it('finds the regimens a drug is given in', () => {
    expect(regimensWithDrug(catalog, 'rituximab').map((regimen) => regimen.id)).toEqual([
      'r-chop-21',
    ])
    expect(regimensWithDrug(catalog, 'bleomycin')).toEqual([])
  })

  // 375 mg/m² × 2.0 m² = 750 mg per administration, once a cycle: a 500 and three 100 mg vials.
  it('counts the packs one course of the regimen takes', () => {
    const estimate = estimateCoursePacks(catalog, 'rituximab', 'r-chop-21', 2)
    expect(estimate.ok).toBe(true)
    if (!estimate.ok) return
    expect(estimate.packs.map((entry) => [entry.presentation.id, entry.count])).toEqual([
      ['rituximab.vial-500', 1],
      ['rituximab.vial-100', 3],
    ])
    expect(packsOf(estimate.packs, 'rituximab.vial-100')).toBe(3)
    expect(packsOf(estimate.packs, 'rituximab.vial-900')).toBe(0)
  })

  it('names the measurement it would need rather than counting without it', () => {
    // Prednisolone of the demo regimen is dosed per square metre too, so the only way a count
    // is refused is a regimen that does not give the drug at all.
    const estimate = estimateCoursePacks(catalog, 'bleomycin', 'r-chop-21', 2)
    expect(estimate).toEqual({ ok: false, missingField: 'regimen' })
  })

  it('offers the regimen that can be counted, and nothing when there is none', () => {
    expect(suggestedRegimen(catalog, 'rituximab', 2)?.id).toBe('r-chop-21')
    expect(suggestedRegimen(catalog, 'bleomycin', 2)).toBeNull()
  })
})
