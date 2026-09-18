import { describe, expect, it } from 'vitest'

import { indexCatalog } from './catalog-index'
import { demoCatalog } from './catalog.fixture'
import { collectSources, itemSources } from './sources'

describe('collectSources', () => {
  it('lists every document once with everything that rests on it', () => {
    const catalog = demoCatalog()
    const protocol = { name: 'DEMO protocol', version: '1.0', checkedOn: '2026-09-19' }
    catalog.regimens[0]!.sources = [protocol]
    catalog.drugs[0]!.sources = [protocol]
    catalog.drug_infusion_params[0]!.sources = [{ name: 'SmPC', checkedOn: '2026-09-18' }]

    const entries = collectSources(indexCatalog(catalog), 'uk')
    const byName = new Map(entries.map((entry) => [entry.source.name, entry]))
    expect([...byName.keys()].sort()).toEqual(
      ['DEMO protocol', 'SmPC', 'ДЕМО: інший протокол'].sort(),
    )
    // One document, both places that rest on it.
    expect(
      byName
        .get('DEMO protocol')
        ?.uses.map((use) => use.kind)
        .sort(),
    ).toEqual(['drug', 'regimen'])
    // The alternative dose of the demo regimen names its own document.
    expect(byName.get('ДЕМО: інший протокол')?.uses[0]?.kind).toBe('dose')
  })

  it('is empty when nothing names a source', () => {
    const catalog = demoCatalog()
    for (const item of catalog.regimen_items) item.dose_options = []
    expect(collectSources(indexCatalog(catalog), 'uk')).toEqual([])
  })
})

describe('itemSources', () => {
  it('collects the regimen, drug and dilution documents without repeating one', () => {
    const catalog = demoCatalog()
    const shared = { name: 'Same document', checkedOn: '2026-09-19' }
    catalog.regimens[0]!.sources = [shared]
    catalog.drugs.find((drug) => drug.id === 'rituximab')!.sources = [shared]
    catalog.drug_infusion_params[0]!.sources = [{ name: 'SmPC', checkedOn: '2026-09-18' }]

    const sources = itemSources(indexCatalog(catalog), 'r-chop-21', 'rituximab', 'rituximab.nacl')
    expect(sources.map((source) => source.name)).toEqual(['Same document', 'SmPC'])
  })
})
