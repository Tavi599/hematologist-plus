import { describe, expect, it } from 'vitest'

import type { HandbookIndex } from './handbook'
import { findInChapter, searchHandbook } from './handbook-search'
import { demoAbbreviations, demoBook, demoChapter, demoIndex, demoParts } from './handbook.fixture'

const index = (): HandbookIndex => ({
  book: demoBook(),
  parts: demoParts(),
  chapters: demoIndex(),
  abbreviations: demoAbbreviations(),
  front: {
    parts: { I: 'Вступ' },
    chapters: { 13: 'Кондиціонування' },
    abbreviations: { GVHD: 'Реакція «трансплантат проти господаря»' },
  },
})

describe('searchHandbook', () => {
  it('finds a chapter by its English title and by its Ukrainian one', () => {
    expect(searchHandbook(index(), 'conditioning', 'uk').map((h) => h.chapter)).toContain(13)
    expect(searchHandbook(index(), 'кондиціонування', 'uk').map((h) => h.chapter)).toContain(13)
  })

  it('shows the Ukrainian title when there is one, and the English when there is not', () => {
    const uk = searchHandbook(index(), 'conditioning', 'uk')
    expect(uk[0]?.label).toBe('13. Кондиціонування')
    // Chapter 1 has no translated title: the original has to be shown, not a blank.
    const first = searchHandbook(index(), 'historical', 'uk')
    expect(first[0]?.label).toBe('1. HCT: Historical Perspective')
  })

  it('finds a section inside a chapter and says which chapter it is in', () => {
    const hits = searchHandbook(index(), 'overview', 'uk')
    expect(hits[0]).toMatchObject({ kind: 'section', chapter: 13, blockId: 'h13' })
    expect(hits[0]?.context).toBe('13. Кондиціонування')
  })

  it('finds an abbreviation by its letters and by its meaning in either language', () => {
    expect(searchHandbook(index(), 'GVHD', 'uk')[0]).toMatchObject({ kind: 'abbreviation' })
    expect(searchHandbook(index(), 'graft-versus-host', 'uk')[0]?.label).toBe('GVHD')
    expect(searchHandbook(index(), 'господаря', 'uk')[0]?.label).toBe('GVHD')
  })

  it('puts an exact abbreviation first, then chapters, then sections', () => {
    const hits = searchHandbook(index(), 'tbi', 'uk')
    expect(hits[0]?.kind).toBe('abbreviation')
  })

  it('needs every word of the query, in any order', () => {
    expect(searchHandbook(index(), 'historical hct', 'uk')).toHaveLength(1)
    expect(searchHandbook(index(), 'historical conditioning', 'uk')).toHaveLength(0)
  })

  it('ignores case and accents', () => {
    expect(searchHandbook(index(), 'CONDITIONING', 'uk').length).toBeGreaterThan(0)
  })

  it('returns nothing for an empty query', () => {
    expect(searchHandbook(index(), '   ', 'uk')).toHaveLength(0)
  })
})

describe('findInChapter', () => {
  it('matches the English, the Ukrainian and the cells of a table', () => {
    const blocks = demoChapter().blocks
    const uk = { p1: 'Трансплантація гемопоетичних клітин' }
    expect(findInChapter(blocks, uk, 'curative')).toEqual(new Set(['p1']))
    expect(findInChapter(blocks, uk, 'гемопоетичних')).toEqual(new Set(['p1']))
    expect(findInChapter(blocks, uk, 'BuCy')).toEqual(new Set(['t1']))
  })

  it('finds nothing for an empty query', () => {
    expect(findInChapter(demoChapter().blocks, {}, '')).toEqual(new Set())
  })
})
