import { describe, expect, it } from 'vitest'

import { buildCourseItems } from './course-input'
import { indexCatalog } from './catalog-index'
import { demoCatalog } from './catalog.fixture'
import { groupCourseItems } from './dose-groups'

function grouped(mutate: (rows: ReturnType<typeof demoCatalog>) => void = () => {}) {
  const rows = demoCatalog()
  mutate(rows)
  const items = buildCourseItems(indexCatalog(rows), 'r-chop-21')
  return groupCourseItems(items).map((group) => ({
    kind: group.kind,
    items: group.items.map((item) => item.item.id),
  }))
}

describe('groupCourseItems', () => {
  it('keeps premedication with the drug it precedes', () => {
    const groups = grouped((rows) => {
      const items = rows.regimen_items
      const prednisolone = items.find((row) => row.drug_id === 'prednisolone')!
      // Premedication is taken before the drip, so it is timed with it even as a tablet.
      prednisolone.role = 'premedication'
      prednisolone.block = 'infusion'
      prednisolone.sort_order = -1
    })
    expect(groups[0]).toEqual({
      kind: 'premedicated',
      items: ['r-chop-21.prednisolone', 'r-chop-21.rituximab'],
    })
    expect(groups[1]?.kind).toBe('chemo')
  })

  it('puts tablets on the inpatient sheet and injections on the infusion sheet', () => {
    const groups = grouped((rows) => {
      const oral = rows.regimen_items.find((row) => row.route === 'oral')!
      oral.role = 'supportive'
      oral.block = 'ward'
      const bolus = rows.regimen_items.find((row) => row.drug_id === 'vincristine')!
      bolus.role = 'supportive'
      bolus.block = 'day_support'
    })
    expect(groups.map((group) => group.kind)).toEqual(['chemo', 'day_support', 'ward'])
    expect(groups.at(-1)?.items).toEqual(['r-chop-21.prednisolone'])
  })

  it('shows premedication that has no drug after it', () => {
    const groups = grouped((rows) => {
      for (const row of rows.regimen_items) {
        row.role = 'premedication'
        row.block = 'infusion'
      }
    })
    expect(groups).toHaveLength(1)
    expect(groups[0]?.kind).toBe('premedicated')
    expect(groups[0]?.items).toHaveLength(5)
  })
})
