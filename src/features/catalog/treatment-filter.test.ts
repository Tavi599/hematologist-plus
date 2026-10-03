import { describe, expect, it } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import { indexCatalog } from '../../lib/catalog-index'
import { countRegimens, drugsInTree, filterTree, regimenHasDrugs } from './treatment-filter'

const catalog = indexCatalog(demoCatalog())
const disease = [...catalog.diseases.keys()][0] ?? ''
const allRegimens = () => countRegimens(filterTree(catalog, disease, []))

describe('treatment filter', () => {
  it('offers the drugs this disease is actually treated with', () => {
    const drugs = drugsInTree(catalog, disease, (drug) => drug.id)
    expect(drugs.length).toBeGreaterThan(0)
    // Alphabetical by what the reader sees, not by id order in the catalog.
    expect(drugs.map((entry) => entry.label)).toEqual(
      [...drugs.map((entry) => entry.label)].sort((a, b) => a.localeCompare(b)),
    )
  })

  it('gives the whole tree back when nothing is chosen', () => {
    expect(filterTree(catalog, disease, []).length).toBe(
      (catalog.rootNodesByDisease.get(disease) ?? []).length,
    )
  })

  it('keeps only the regimens that carry the drug', () => {
    const drug = drugsInTree(catalog, disease, (entry) => entry.id)[0]?.drug.id ?? ''
    const kept = filterTree(catalog, disease, [drug])
    expect(countRegimens(kept)).toBeGreaterThan(0)
    expect(countRegimens(kept)).toBeLessThanOrEqual(allRegimens())
    for (const node of kept) {
      for (const link of node.links) {
        expect(regimenHasDrugs(catalog, link.regimen_id, [drug])).toBe(true)
      }
    }
  })

  it('narrows rather than widens when a second drug is named', () => {
    const drugs = drugsInTree(catalog, disease, (entry) => entry.id).map((entry) => entry.drug.id)
    const [first = '', second = ''] = drugs
    const one = countRegimens(filterTree(catalog, disease, [first]))
    const two = countRegimens(filterTree(catalog, disease, [first, second]))
    expect(two).toBeLessThanOrEqual(one)
  })

  it('takes away a heading whose every regimen was filtered out', () => {
    // A drug no regimen has leaves nothing to head.
    expect(filterTree(catalog, disease, ['no-such-drug'])).toEqual([])
  })

  it('asks nothing of a regimen when no drug is named', () => {
    expect(regimenHasDrugs(catalog, 'no-such-regimen', [])).toBe(true)
    expect(regimenHasDrugs(catalog, 'no-such-regimen', ['anything'])).toBe(false)
  })
})
