import { describe, expect, it } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import { indexCatalog } from '../../lib/catalog-index'
import { buildSearchIndex, normalize, searchCatalog } from './search-index'

function index() {
  return buildSearchIndex(indexCatalog(demoCatalog()), 'uk')
}

describe('buildSearchIndex', () => {
  it('finds a regimen by its short name and opens it in the calculator', () => {
    const found = searchCatalog(index(), 'r-chop')
    expect(found.regimen.shown.map((entry) => entry.title)).toContain('R-CHOP-21')
    expect(found.regimen.shown[0]?.to).toBe('/calculator?regimen=r-chop-21')
  })

  it('finds a regimen by a drug inside it', () => {
    const found = searchCatalog(index(), 'ритуксимаб')
    expect(found.regimen.shown.map((entry) => entry.title)).toContain('R-CHOP-21')
  })

  it('finds a regimen by the English name of a drug while the UI is Ukrainian', () => {
    const found = searchCatalog(index(), 'doxorubicin')
    expect(found.regimen.shown.map((entry) => entry.title)).toContain('R-CHOP-21')
  })

  it('finds a disease by name and by its ICD-10 code', () => {
    const byName = searchCatalog(index(), 'лімфома')
    expect(byName.disease.shown[0]?.to).toBe('/diseases/dlbcl')
    const byCode = searchCatalog(index(), 'c83.3')
    expect(byCode.disease.shown[0]?.to).toBe('/diseases/dlbcl')
    expect(byCode.disease.shown[0]?.subtitle).toBe('C83.3')
  })

  it('opens a drug on the disease page with the drug filter already on', () => {
    const found = searchCatalog(index(), 'ритуксимаб')
    const hit = found.drug.shown.find((entry) => entry.subtitle.includes('лімфома'))
    expect(hit?.to).toBe('/diseases/dlbcl?drug=rituximab')
  })

  it('answers nothing under two letters, and nothing for a word the catalog has not got', () => {
    const empty = searchCatalog(index(), 'r')
    expect(empty.regimen.total).toBe(0)
    expect(searchCatalog(index(), 'карфілзоміб').drug.total).toBe(0)
  })

  it('ranks the name a query starts above a name that merely holds it', () => {
    const entries = [
      { name: 'r-chop-21', haystack: 'r-chop-21', kind: 'regimen' as const, key: 'a' },
      { name: 'mini-r-chop', haystack: 'mini-r-chop', kind: 'regimen' as const, key: 'b' },
    ].map((entry) => ({ ...entry, title: entry.name, subtitle: '', to: '/' }))
    expect(searchCatalog(entries, 'r-chop').regimen.shown.map((e) => e.key)).toEqual(['a', 'b'])
  })

  it('counts the results it does not show', () => {
    const entries = Array.from({ length: 11 }, (_, i) => ({
      key: `k${i}`,
      kind: 'disease' as const,
      title: `Хвороба ${i}`,
      subtitle: '',
      to: '/',
      name: `хвороба ${i}`,
      haystack: `хвороба ${i}`,
    }))
    const found = searchCatalog(entries, 'хвороба', 8)
    expect(found.disease.shown).toHaveLength(8)
    expect(found.disease.total).toBe(11)
  })
})

describe('normalize', () => {
  it('lowercases and collapses the spaces', () => {
    expect(normalize('  R-CHOP   21 ')).toBe('r-chop 21')
  })
})
