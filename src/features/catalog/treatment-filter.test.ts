import { describe, expect, it } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import { indexCatalog } from '../../lib/catalog-index'
import type { Regimen, TreatmentNode } from '../../schemas/catalog'
import {
  countRegimens,
  courseTiles,
  drugsInTree,
  filterTree,
  regimenHasDrugs,
  splitSituations,
  type FilteredNode,
  type LinkedRegimen,
  type RegimenTile,
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

describe('courseTiles', () => {
  const regimen = (id: string, course: Regimen['course']): LinkedRegimen => ({
    link: { id: `n.${id}`, node_id: 'n', regimen_id: id, notes: null, sort_order: 0 },
    regimen: { id, course } as Regimen,
  })
  const phase = (order: number) => ({
    id: 'dvcd',
    title: { uk: 'Dara-VCd' },
    phase: { uk: `фаза ${order}` },
    order,
    cycles: { from: order, to: order },
  })

  it('makes one tile of the phases of a course, in phase order, where the first stood', () => {
    const tiles = courseTiles([
      regimen('vcd', null),
      regimen('dvcd-2', phase(2)),
      regimen('vrd', null),
      regimen('dvcd-1', phase(1)),
    ])
    expect(tiles.map((tile) => tile.kind)).toEqual(['single', 'course', 'single'])
    const course = tiles[1] as Extract<RegimenTile, { kind: 'course' }>
    expect(course.phases.map((entry) => entry.regimen.id)).toEqual(['dvcd-1', 'dvcd-2'])
  })

  it('leaves a lone phase as an ordinary tile', () => {
    expect(courseTiles([regimen('dvcd-1', phase(1))]).map((tile) => tile.kind)).toEqual(['single'])
  })
})
