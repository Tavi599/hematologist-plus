import { describe, expect, it } from 'vitest'

import { CLASSES } from './classes'
import { findProphylaxis, PROPHYLAXIS, PROPHYLAXIS_TOPICS } from './prophylaxis'

/** The drug cards of `data/drugs`, by file name: only their existence is checked here. */
const drugFiles = Object.keys(import.meta.glob('../../../data/drugs/*.json'))
const hasDrug = (id: string) => drugFiles.some((path) => path.endsWith(`/${id}.json`))

describe('antimicrobial prophylaxis', () => {
  it('has unique section ids and says something under each', () => {
    expect(new Set(PROPHYLAXIS.map((section) => section.id)).size).toBe(PROPHYLAXIS.length)
    for (const section of PROPHYLAXIS) {
      expect(section.title, section.id).not.toBe('')
      expect(section.points.length, section.id).toBeGreaterThan(2)
      for (const point of section.points) {
        expect(PROPHYLAXIS_TOPICS, section.id).toContain(point.topic)
        expect(point.text.length, section.id).toBeGreaterThan(20)
      }
    }
  })

  it('names a source with a link and the day it was read for every point', () => {
    for (const section of PROPHYLAXIS) {
      for (const point of section.points) {
        expect(point.sources.length, point.text).toBeGreaterThan(0)
        for (const source of point.sources) {
          expect(source.short, point.text).not.toBe('')
          expect(source.name, point.text).not.toBe('')
          expect(source.url, point.text).toMatch(
            /^https:\/\/www\.(drlz\.com\.ua|msdmanuals\.com|nccn\.org|medicines\.org\.uk)\//,
          )
          expect(source.checkedOn, point.text).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        }
      }
    }
  })

  it('shows a discrepancy with at least two sources', () => {
    const discrepancies = PROPHYLAXIS.flatMap((section) =>
      section.points.filter((point) => point.topic === 'discrepancy'),
    )
    expect(discrepancies.length).toBeGreaterThan(0)
    for (const point of discrepancies) expect(point.sources.length).toBeGreaterThanOrEqual(2)
  })

  it('ties every drug id to a drug card of the catalog', () => {
    const ids = PROPHYLAXIS.flatMap((section) => [...section.drugIds, ...section.riskDrugIds])
    expect(ids).toContain('levofloxacin')
    expect(ids).toContain('co-trimoxazole')
    for (const id of ids) expect(hasDrug(id), id).toBe(true)
  })

  it('points only at class cards that exist', () => {
    const classIds = new Set(CLASSES.map((cls) => cls.id))
    for (const section of PROPHYLAXIS) {
      if (section.classId !== undefined)
        expect(classIds.has(section.classId), section.id).toBe(true)
    }
  })

  it('finds points by any of their words and keeps a section whole when its title matches', () => {
    expect(findProphylaxis('')).toBe(PROPHYLAXIS)
    const qt = findProphylaxis('qt')
    expect(qt.map((section) => section.id)).toEqual(['fluoroquinolone-neutropenia'])
    expect(qt[0]?.points.length).toBe(1)
    const asplenia = findProphylaxis('аспленія')
    expect(asplenia.find((section) => section.id === 'asplenia')?.points).toBe(
      PROPHYLAXIS.find((section) => section.id === 'asplenia')?.points,
    )
    expect(findProphylaxis('такого слова немає')).toEqual([])
  })
})
