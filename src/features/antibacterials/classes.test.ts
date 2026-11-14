import { describe, expect, it } from 'vitest'

import { CHECKED_ON, CLASSES, DISCREPANCIES, TOPIC_ORDER } from './classes'

/** The drug cards of `data/drugs`, by file name: only their existence is checked here. */
const drugFiles = Object.keys(import.meta.glob('../../../data/drugs/*.json'))
const hasDrug = (id: string) => drugFiles.some((path) => path.endsWith(`/${id}.json`))

describe('antibacterial reference', () => {
  it('ties every named drug id to a drug card of the catalog', () => {
    const ids = [
      ...CLASSES.flatMap((cls) => cls.drugs.flatMap((drug) => drug.drugId ?? [])),
      ...DISCREPANCIES.flatMap((item) => item.drugIds),
    ]
    expect(ids.length).toBeGreaterThan(10)
    for (const id of ids) expect(hasDrug(id), id).toBe(true)
  })

  it('names the source pages of every class and the day they were read', () => {
    expect(CHECKED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    for (const cls of CLASSES) {
      expect(cls.pages.length, cls.id).toBeGreaterThan(0)
      for (const page of cls.pages) expect(page, cls.id).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('has unique class ids and facts that use a known topic and say something', () => {
    expect(new Set(CLASSES.map((cls) => cls.id)).size).toBe(CLASSES.length)
    for (const cls of CLASSES) {
      for (const fact of [...cls.facts, ...cls.drugs.flatMap((drug) => drug.facts)]) {
        expect(TOPIC_ORDER, cls.id).toContain(fact.topic)
        expect(fact.text.length, cls.id).toBeGreaterThan(8)
      }
    }
  })

  it('shows both sides of every discrepancy with a source', () => {
    for (const item of DISCREPANCIES) {
      expect(item.catalog.source, item.id).not.toBe('')
      expect(item.msd.page, item.id).toMatch(/^[a-z0-9-]+$/)
    }
  })
})
