import { describe, expect, it } from 'vitest'

import { indexCatalog } from './catalog-index'
import { demoCatalog } from './catalog.fixture'
import { diseasesByRegimen, filterRegimens, NO_REGIMEN_FILTER } from './regimen-filter'

const catalog = () => indexCatalog(demoCatalog())

describe('filterRegimens', () => {
  it('offers every regimen without a filter', () => {
    expect(filterRegimens(catalog(), NO_REGIMEN_FILTER).map((r) => r.id)).toEqual(['r-chop-21'])
  })

  it('keeps only the regimens of one disease', () => {
    const index = catalog()
    expect(diseasesByRegimen(index).get('r-chop-21')).toEqual(new Set(['dlbcl']))
    expect(
      filterRegimens(index, { ...NO_REGIMEN_FILTER, diseaseId: 'dlbcl' }).map((r) => r.id),
    ).toEqual(['r-chop-21'])
    expect(filterRegimens(index, { ...NO_REGIMEN_FILTER, diseaseId: 'other' })).toEqual([])
  })

  it('hides a regimen with an unobtainable drug only when asked', () => {
    const rows = demoCatalog()
    rows.drugs.find((drug) => drug.id === 'rituximab')!.availability = 'unavailable'
    const index = indexCatalog(rows)

    expect(filterRegimens(index, NO_REGIMEN_FILTER)).toHaveLength(1)
    expect(filterRegimens(index, { diseaseId: null, onlyObtainable: true })).toEqual([])
  })
})
