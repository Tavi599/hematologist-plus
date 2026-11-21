import { describe, expect, it } from 'vitest'

import { TOPIC_ORDER } from '../antibacterials/classes'
import { CLASSES, DISCREPANCIES, REGISTER_CHECKED_ON, SOURCES } from './agents'

/** The drug cards of `data/drugs`, by file name: only their existence is checked here. */
const drugFiles = Object.keys(import.meta.glob('../../../data/drugs/*.json'))
const hasDrug = (id: string) => drugFiles.some((path) => path.endsWith(`/${id}.json`))

const allDrugs = CLASSES.flatMap((cls) => cls.drugs)

describe('antifungal and antiviral reference', () => {
  it('ties every named drug id to a drug card of the catalog', () => {
    const ids = [
      ...allDrugs.flatMap((drug) => drug.drugId ?? []),
      ...DISCREPANCIES.flatMap((item) => item.drugIds),
    ]
    expect(ids.length).toBeGreaterThan(8)
    for (const id of ids) expect(hasDrug(id), id).toBe(true)
  })

  it('says what the State Register holds for every drug without a card, and only for those', () => {
    expect(REGISTER_CHECKED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    for (const drug of allDrugs) {
      if (drug.drugId === undefined) {
        expect(drug.register, drug.name).toBeDefined()
        expect(drug.register?.note.length, drug.name).toBeGreaterThan(5)
      } else {
        expect(drug.register, drug.name).toBeUndefined()
      }
    }
  })

  it('covers both groups and gives every drug a dose fact', () => {
    expect(new Set(CLASSES.map((cls) => cls.group))).toEqual(new Set(['antifungal', 'antiviral']))
    for (const drug of allDrugs) {
      expect(
        drug.facts.some((fact) => fact.topic === 'dose'),
        drug.name,
      ).toBe(true)
    }
  })

  it('names a dated source with a link for every class and fact', () => {
    for (const source of Object.values(SOURCES)) {
      expect(source.url).toMatch(/^https:\/\//)
      expect(source.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    for (const cls of CLASSES) {
      expect(cls.sources.length, cls.id).toBeGreaterThan(0)
      for (const fact of [...cls.facts, ...cls.drugs.flatMap((drug) => drug.facts)]) {
        if (fact.src !== undefined)
          expect(cls.sources, `${cls.id}: ${fact.text}`).toContain(fact.src)
      }
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
      expect(SOURCES[item.other.src], item.id).toBeDefined()
    }
  })
})
