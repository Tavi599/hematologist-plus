import { describe, expect, it } from 'vitest'

import { regimenAvailability, unavailableDrugs } from './availability'
import { indexCatalog } from './catalog-index'
import { demoCatalog } from './catalog.fixture'

describe('regimenAvailability', () => {
  it('reports the least obtainable drug of the regimen', () => {
    const catalog = demoCatalog()
    for (const drug of catalog.drugs) drug.availability = 'department'
    expect(regimenAvailability(indexCatalog(catalog), 'r-chop-21')).toBe('department')

    catalog.drugs[1]!.availability = 'registered'
    expect(regimenAvailability(indexCatalog(catalog), 'r-chop-21')).toBe('registered')

    catalog.drugs[2]!.availability = 'unavailable'
    const index = indexCatalog(catalog)
    expect(regimenAvailability(index, 'r-chop-21')).toBe('unavailable')
    expect(unavailableDrugs(index, 'r-chop-21').map((drug) => drug.id)).toEqual([
      catalog.drugs[2]!.id,
    ])
  })

  it('treats a drug missing from the catalog as not obtainable', () => {
    const catalog = demoCatalog()
    for (const drug of catalog.drugs) drug.availability = 'department'
    catalog.drugs = catalog.drugs.filter((drug) => drug.id !== 'rituximab')
    expect(regimenAvailability(indexCatalog(catalog), 'r-chop-21')).toBe('unavailable')
  })

  it('calls an empty or unknown regimen obtainable', () => {
    expect(regimenAvailability(indexCatalog(demoCatalog()), 'nope')).toBe('department')
  })
})
