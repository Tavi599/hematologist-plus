import { describe, expect, it } from 'vitest'

import { indexCatalog } from '../../lib/catalog-index'
import { emptyCatalog, type TreatmentNode, type TreatmentNodeRegimen } from '../../schemas/catalog'
import type { PathwayStep } from '../../schemas/common'
import { pageOf, pathwayPages, rankedTreatment, rowAnchor, stepsIn } from './pathway'

const text = { uk: 'т', en: 't' }
const node = (
  id: string,
  parent: string | null,
  extra: Partial<TreatmentNode> = {},
): TreatmentNode => ({
  id,
  disease_id: 'aml',
  parent_id: parent,
  kind: parent === null ? 'pathway' : 'group',
  title: { uk: id, en: id },
  description: null,
  sort_order: 0,
  steps: [],
  ...extra,
})
const link = (
  nodeId: string,
  regimenId: string,
  preference: TreatmentNodeRegimen['preference'] = null,
): TreatmentNodeRegimen => ({
  id: `${nodeId}.${regimenId}`,
  node_id: nodeId,
  regimen_id: regimenId,
  notes: null,
  sort_order: 0,
  preference,
  category: null,
})
const step = (
  column: PathwayStep['column'],
  preference: PathwayStep['preference'] = null,
): PathwayStep => ({
  kind: 'hct',
  column,
  label: text,
  target_id: null,
  preference,
  category: null,
  notes: null,
})

function catalog() {
  const rows = emptyCatalog()
  rows.treatment_nodes = [
    node('aml.nccn', null),
    node('aml.induction', 'aml.nccn', { kind: 'line', steps: [step('treatment')] }),
    node('aml.cbf', 'aml.induction', { sort_order: 1 }),
    node('aml.targeted', 'aml.induction', { sort_order: 2 }),
    node('aml.flt3', 'aml.targeted'),
    node('aml.consolidation', 'aml.nccn', { kind: 'line', sort_order: 1 }),
    node('aml.cons-fav', 'aml.consolidation'),
    node('aml.tree', null, { kind: 'line' }),
  ]
  rows.treatment_node_regimens = [
    link('aml.cbf', 'go-da', 'preferred'),
    link('aml.flt3', 'gilt'),
    link('aml.cons-fav', 'hidac'),
  ]
  return indexCatalog(rows)
}

describe('pathwayPages', () => {
  it('keeps the pathway out of the tree and lays it out as pages and rows', () => {
    const index = catalog()
    expect(index.rootNodesByDisease.get('aml')!.map((entry) => entry.id)).toEqual(['aml.tree'])
    const root = index.pathwaysByDisease.get('aml')![0]!
    const pages = pathwayPages(index, root)
    expect(pages.map((page) => page.node.id)).toEqual(['aml.induction', 'aml.consolidation'])
    // The page with steps of its own is a row; a heading with only children carries its title.
    expect(
      pages[0]!.rows.map((row) => [row.node.id, row.isPage, row.trail.map((entry) => entry.id)]),
    ).toEqual([
      ['aml.induction', true, []],
      ['aml.cbf', false, []],
      ['aml.flt3', false, ['aml.targeted']],
    ])
  })
})

describe('pageOf', () => {
  it('finds the page an arrow lands on, and nothing outside the pathway', () => {
    const index = catalog()
    expect(pageOf(index, 'aml.nccn', 'aml.flt3')).toBe('aml.induction')
    expect(pageOf(index, 'aml.nccn', 'aml.consolidation')).toBe('aml.consolidation')
    expect(pageOf(index, 'aml.nccn', 'aml.tree')).toBeNull()
    expect(pageOf(index, 'aml.nccn', 'missing')).toBeNull()
  })
})

describe('rankedTreatment', () => {
  it('orders by the guideline rank and leaves empty ranks out', () => {
    const groups = rankedTreatment(
      [link('n', 'other-one', 'other'), link('n', 'plain'), link('n', 'best', 'preferred')],
      [step('treatment', 'preferred'), step('next')],
    )
    expect(
      groups.map((group) => [group.preference, group.links.length, group.steps.length]),
    ).toEqual([
      ['preferred', 1, 1],
      ['other', 1, 0],
      [null, 1, 0],
    ])
    expect(stepsIn([step('treatment'), step('next')], 'next')).toHaveLength(1)
    expect(rowAnchor('aml.cons-fav')).toBe('pathway-aml-cons-fav')
  })
})
