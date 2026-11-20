import { describe, expect, it } from 'vitest'

import { CLASSES } from './classes'
import { findInteractions, INTERACTIONS } from './interactions'

/** The drug cards of `data/drugs`, by file name: only their existence is checked here. */
const drugFiles = Object.keys(import.meta.glob('../../../data/drugs/*.json'))
const hasDrug = (id: string) => drugFiles.some((path) => path.endsWith(`/${id}.json`))

describe('antibacterial interactions', () => {
  it('has unique ids and says what happens on both sides', () => {
    expect(new Set(INTERACTIONS.map((row) => row.id)).size).toBe(INTERACTIONS.length)
    for (const row of INTERACTIONS) {
      expect(row.antibacterial, row.id).not.toBe('')
      expect(row.partner, row.id).not.toBe('')
      expect(row.effect.length, row.id).toBeGreaterThan(20)
      if (row.action !== undefined) expect(row.action.length, row.id).toBeGreaterThan(8)
    }
  })

  it('names a source with a link and the day it was read for every row', () => {
    for (const row of INTERACTIONS) {
      expect(row.sources.length, row.id).toBeGreaterThan(0)
      for (const source of row.sources) {
        expect(source.name, row.id).not.toBe('')
        expect(source.url, row.id).toMatch(/^https:\/\/www\.(drlz\.com\.ua|msdmanuals\.com)\//)
        expect(source.checkedOn, row.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    }
  })

  it('ties every drug id to a drug card of the catalog', () => {
    const ids = INTERACTIONS.flatMap((row) => [...row.antibacterialIds, ...row.partnerIds])
    expect(ids.length).toBeGreaterThan(20)
    for (const id of ids) expect(hasDrug(id), id).toBe(true)
    for (const row of INTERACTIONS) expect(row.antibacterialIds.length, row.id).toBeGreaterThan(0)
  })

  it('points only at class cards that exist', () => {
    const classIds = new Set(CLASSES.map((cls) => cls.id))
    for (const row of INTERACTIONS) {
      if (row.classId !== undefined) expect(classIds.has(row.classId), row.id).toBe(true)
    }
  })

  it('finds rows by any of their words', () => {
    expect(findInteractions('')).toBe(INTERACTIONS)
    expect(findInteractions('вальпро').map((row) => row.id)).toEqual(['carbapenems-valproate'])
    expect(findInteractions('венетоклакс').length).toBeGreaterThanOrEqual(2)
    expect(findInteractions('такого слова немає')).toEqual([])
  })
})
