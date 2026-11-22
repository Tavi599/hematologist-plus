import { describe, expect, it } from 'vitest'

import { CLASSES, DISCREPANCIES } from './classes'
import { findResistance, RESISTANCE } from './resistance'

/** The drug cards of `data/drugs`, by file name: only their existence is checked here. */
const drugFiles = Object.keys(import.meta.glob('../../../data/drugs/*.json'))
const hasDrug = (id: string) => drugFiles.some((path) => path.endsWith(`/${id}.json`))

describe('targeted therapy by resistance type', () => {
  it('has unique ids and points with text', () => {
    expect(new Set(RESISTANCE.map((section) => section.id)).size).toBe(RESISTANCE.length)
    for (const section of RESISTANCE) {
      expect(section.points.length, section.id).toBeGreaterThan(0)
      for (const point of section.points) expect(point.text.length, section.id).toBeGreaterThan(10)
    }
  })

  it('names a source with a link and the day it was read for every point', () => {
    for (const section of RESISTANCE) {
      for (const point of section.points) {
        expect(point.sources.length, point.text).toBeGreaterThan(0)
        for (const source of point.sources) {
          expect(source.url, point.text).toMatch(
            /^https:\/\/(www\.idsociety\.org|pmc\.ncbi\.nlm\.nih\.gov)\//,
          )
          expect(source.checkedOn, point.text).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        }
      }
    }
  })

  it('names both sides of every discrepancy', () => {
    for (const section of RESISTANCE) {
      for (const point of section.points.filter((item) => item.topic === 'discrepancy')) {
        expect(point.sources.length, point.text).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('ties drug ids to drug cards and keeps absent agents apart from them', () => {
    for (const section of RESISTANCE) {
      for (const id of section.drugIds) expect(hasDrug(id), `${section.id}: ${id}`).toBe(true)
      for (const item of section.notInCatalog) {
        if (item.status === 'registered') expect(item.registration, item.name).toMatch(/UA\//)
      }
    }
  })

  it('points only at class cards and discrepancies that exist', () => {
    const classIds = new Set(CLASSES.map((cls) => cls.id))
    const discrepancyIds = new Set(DISCREPANCIES.map((item) => item.id))
    for (const section of RESISTANCE) {
      for (const id of section.classIds) expect(classIds.has(id), `${section.id}: ${id}`).toBe(true)
      for (const id of section.discrepancyIds ?? [])
        expect(discrepancyIds.has(id), `${section.id}: ${id}`).toBe(true)
    }
  })

  it('finds points by their words and sections by absent agents', () => {
    expect(findResistance('')).toBe(RESISTANCE)
    expect(findResistance('цефідерокол').length).toBeGreaterThanOrEqual(4)
    expect(findResistance('stenotrophomonas').map((section) => section.id)).toEqual(['steno'])
    expect(findResistance('такого слова немає')).toEqual([])
  })
})
