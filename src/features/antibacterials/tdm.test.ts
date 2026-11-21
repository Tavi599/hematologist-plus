import { describe, expect, it } from 'vitest'

import { CLASSES, DISCREPANCIES } from './classes'
import { findTdm, TDM, TDM_TOPICS } from './tdm'

/** The drug cards of `data/drugs`, by file name: only their existence is checked here. */
const drugFiles = Object.keys(import.meta.glob('../../../data/drugs/*.json'))
const hasDrug = (id: string) => drugFiles.some((path) => path.endsWith(`/${id}.json`))

describe('therapeutic drug monitoring', () => {
  it('has unique section ids and says something under each', () => {
    expect(new Set(TDM.map((section) => section.id)).size).toBe(TDM.length)
    for (const section of TDM) {
      expect(section.title, section.id).not.toBe('')
      expect(section.points.length, section.id).toBeGreaterThan(2)
      for (const point of section.points) {
        expect(TDM_TOPICS, section.id).toContain(point.topic)
        expect(point.text.length, section.id).toBeGreaterThan(20)
      }
    }
  })

  it('names a source with a link and the day it was read for every point', () => {
    for (const section of TDM) {
      for (const point of section.points) {
        expect(point.sources.length, point.text).toBeGreaterThan(0)
        for (const source of point.sources) {
          expect(source.short, point.text).not.toBe('')
          expect(source.name, point.text).not.toBe('')
          expect(source.url, point.text).toMatch(
            /^https:\/\/www\.(drlz\.com\.ua|msdmanuals\.com|medicines\.org\.uk)\//,
          )
          expect(source.checkedOn, point.text).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        }
      }
    }
  })

  it('shows a discrepancy with at least two sources', () => {
    const discrepancies = TDM.flatMap((section) =>
      section.points.filter((point) => point.topic === 'discrepancy'),
    )
    expect(discrepancies.length).toBeGreaterThan(0)
    for (const point of discrepancies) expect(point.sources.length).toBeGreaterThanOrEqual(2)
  })

  it('covers vancomycin and the aminoglycosides, tied to drug cards of the catalog', () => {
    const ids = TDM.flatMap((section) => section.drugIds)
    for (const id of ['vancomycin', 'gentamicin', 'amikacin', 'tobramycin']) {
      expect(ids).toContain(id)
    }
    for (const section of TDM) expect(section.drugIds.length, section.id).toBeGreaterThan(0)
    for (const id of ids) expect(hasDrug(id), id).toBe(true)
  })

  it('points only at class cards and discrepancies that exist', () => {
    const classIds = new Set(CLASSES.map((cls) => cls.id))
    const discrepancyIds = new Set(DISCREPANCIES.map((item) => item.id))
    for (const section of TDM) {
      if (section.classId !== undefined)
        expect(classIds.has(section.classId), section.id).toBe(true)
      for (const id of section.discrepancyIds ?? []) expect(discrepancyIds.has(id), id).toBe(true)
    }
  })

  it('finds points by any of their words and keeps a section whole when its title matches', () => {
    expect(findTdm('')).toBe(TDM)
    const auc = findTdm('17–25')
    expect(auc.map((section) => section.id)).toEqual(['vancomycin'])
    expect(auc[0]?.points.length).toBe(1)
    const teicoplanin = findTdm('тейкопланін')
    expect(teicoplanin.find((section) => section.id === 'teicoplanin')?.points).toBe(
      TDM.find((section) => section.id === 'teicoplanin')?.points,
    )
    expect(findTdm('такого слова немає')).toEqual([])
  })
})
