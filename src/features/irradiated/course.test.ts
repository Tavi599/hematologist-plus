import { describe, expect, it } from 'vitest'

import { indexCatalog } from '../../lib/catalog-index'
import { demoCatalog } from '../../lib/catalog.fixture'
import type { CourseItem } from '../../lib/course-input'
import { irradiationReasons } from './course'

const item = (drugId: string, role: 'main' | 'supportive' = 'main') =>
  ({ item: { id: `x.${drugId}`, drug_id: drugId, role } }) as CourseItem

describe('irradiationReasons', () => {
  const catalog = indexCatalog(demoCatalog())

  it('names a purine analogue or bendamustine of the course, once', () => {
    const reasons = irradiationReasons(
      catalog,
      [item('bendamustine'), item('bendamustine'), item('rituximab')],
      null,
    )
    expect(reasons).toHaveLength(1)
    expect(reasons[0]!.uk).toContain('довічно')
  })

  it('says nothing for a course without such a drug, or with one given as support', () => {
    expect(irradiationReasons(catalog, [item('rituximab')], null)).toEqual([])
    expect(irradiationReasons(catalog, [item('fludarabine', 'supportive')], null)).toEqual([])
  })
})
