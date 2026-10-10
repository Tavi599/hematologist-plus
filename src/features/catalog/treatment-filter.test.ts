import { describe, expect, it } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import { indexCatalog } from '../../lib/catalog-index'
import type { TreatmentNode } from '../../schemas/catalog'
import {
  countRegimens,
  drugsInTree,
  filterTree,
  regimenHasDrugs,
  splitSituations,
  type FilteredNode,
} from './treatment-filter'

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

describe('situations over a line', () => {
  const node = (id: string, kind: TreatmentNode['kind'], regimens: string[]): FilteredNode => ({
    node: {
      id,
      disease_id: 'mm',
      parent_id: null,
      kind,
      title: { uk: id, en: id },
      description: null,
      sort_order: 0,
    } as TreatmentNode,
    links: regimens.map((regimen_id, sort_order) => ({
      id: `${id}.${regimen_id}`,
      node_id: id,
      regimen_id,
      notes: null,
      sort_order,
    })),
    children: [],
  })
  const line: FilteredNode = {
    ...node('relapse', 'line', ['kd', 'pom-dex', 'rd', 'dpd']),
    children: [
      node('bortezomib', 'situation', ['pom-dex', 'rd', 'dpd']),
      node('lenalidomide', 'situation', ['kd', 'pom-dex', 'dpd']),
      node('trials', 'trial', ['other']),
    ],
  }
  const ids = (chosen: string[]) =>
    splitSituations(line, chosen).links.map((link) => link.regimen_id)

  it('shows the whole line, in its own order, when no situation is chosen', () => {
    const split = splitSituations(line, [])
    expect(split.links.map((link) => link.regimen_id)).toEqual(['kd', 'pom-dex', 'rd', 'dpd'])
    expect(split.situations.map((entry) => entry.node.id)).toEqual(['bortezomib', 'lenalidomide'])
    expect(split.sections.map((entry) => entry.node.id)).toEqual(['trials'])
  })

  it('keeps what fits every chosen situation', () => {
    expect(ids(['bortezomib'])).toEqual(['pom-dex', 'rd', 'dpd'])
    expect(ids(['bortezomib', 'lenalidomide'])).toEqual(['pom-dex', 'dpd'])
  })

  it('ignores a chosen situation that is no longer on the page', () => {
    expect(ids(['gone', 'lenalidomide'])).toEqual(['kd', 'pom-dex', 'dpd'])
  })
})
