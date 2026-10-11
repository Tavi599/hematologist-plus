import { describe, expect, it } from 'vitest'

import {
  PROPHYLAXIS_AGENTS,
  SOURCES,
  THERAPY_RISKS,
  risksOf,
  therapyRisksFor,
} from './therapy-risks'

const drugFiles = import.meta.glob('../../../data/drugs/*.json')
const drugIds = new Set(
  Object.keys(drugFiles).map((path) => path.replace(/^.*\/(.+)\.json$/, '$1')),
)

describe('therapy risks', () => {
  it('names only drugs the catalog has', () => {
    const unknown = THERAPY_RISKS.flatMap((entry) => entry.markDrugIds).filter(
      (id) => !drugIds.has(id),
    )
    expect(unknown).toEqual([])
  })

  it('gives every therapy at least one risk and one measure, each with a known source', () => {
    for (const entry of THERAPY_RISKS) {
      expect(entry.risks.length, entry.id).toBeGreaterThan(0)
      expect(entry.measures.length, entry.id).toBeGreaterThan(0)
    }
    const cited = new Set(
      [...THERAPY_RISKS.flatMap((entry) => entry.measures), ...PROPHYLAXIS_AGENTS].map(
        (measure) => measure.source,
      ),
    )
    expect([...cited].sort()).toEqual(Object.keys(SOURCES).sort())
  })

  it('keeps the ids unique', () => {
    const ids = THERAPY_RISKS.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('marks a course by its main drugs, not by steroids or cytarabine', () => {
    expect(
      therapyRisksFor(['rituximab', 'cyclophosphamide', 'prednisolone']).map((e) => e.id),
    ).toEqual(['anti-cd20'])
    expect(therapyRisksFor(['cytarabine', 'dexamethasone'])).toEqual([])
    expect(risksOf(therapyRisksFor(['bortezomib', 'lenalidomide']))).toEqual(['pjp', 'herpes'])
  })
})
