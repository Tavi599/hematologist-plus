import { describe, expect, it } from 'vitest'

import { indexCatalog } from './catalog-index'
import { demoCatalog } from './catalog.fixture'
import { coursePhases, phaseForCycle } from './course-phases'
import type { Regimen } from '../schemas/catalog'

function withCourse() {
  const rows = demoCatalog()
  // The demo catalog has one regimen; three copies of it stand for the phases.
  const base = rows.regimens[0]!
  const [first, second, third] = ['demo-c1', 'demo-c2', 'demo-m'].map((id): Regimen => ({
    ...base,
    id,
  })) as [Regimen, Regimen, Regimen]
  rows.regimens.push(first, second, third)
  first.course = {
    id: 'demo',
    title: { uk: 'Демо' },
    phase: { uk: 'цикл 1' },
    order: 1,
    cycles: { from: 1, to: 1 },
  }
  second.course = {
    id: 'demo',
    title: { uk: 'Демо' },
    phase: { uk: 'з циклу 2' },
    order: 2,
    cycles: { from: 2, to: null },
  }
  third.course = {
    id: 'demo',
    title: { uk: 'Демо' },
    phase: { uk: 'підтримка' },
    order: 3,
    cycles: null,
  }
  return { catalog: indexCatalog(rows), first, second, third }
}

describe('course phases', () => {
  it('lists the phases of the course in order', () => {
    const { catalog, first, second, third } = withCourse()
    expect(coursePhases(catalog, third.id).map((regimen) => regimen.id)).toEqual([
      first.id,
      second.id,
      third.id,
    ])
  })

  it('finds the phase for a cycle, open-ended included, never the maintenance', () => {
    const { catalog, first, second } = withCourse()
    expect(phaseForCycle(catalog, second.id, 1)?.id).toBe(first.id)
    expect(phaseForCycle(catalog, first.id, 9)?.id).toBe(second.id)
  })

  it('says nothing for a regimen outside any course', () => {
    const rows = demoCatalog()
    const catalog = indexCatalog(rows)
    expect(coursePhases(catalog, rows.regimens[0]!.id)).toEqual([])
    expect(phaseForCycle(catalog, rows.regimens[0]!.id, 2)).toBeNull()
  })
})
