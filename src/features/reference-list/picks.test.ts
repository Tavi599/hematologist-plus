import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resetPicks, setAllCollapsed, toggleCollapsed, toggleFavorite, visit } from './picks'

const stored = (list: string) =>
  JSON.parse(window.localStorage.getItem(`hp.reference.${list}`) ?? 'null') as unknown

describe('reference list picks', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetPicks()
  })
  afterEach(() => window.localStorage.clear())

  it('toggles a favourite on and off, per list', () => {
    toggleFavorite('diseases', 'dlbcl')
    toggleFavorite('scores', 'ipi')
    expect(stored('diseases')).toEqual({ favorites: ['dlbcl'], recent: [], collapsed: [] })
    toggleFavorite('diseases', 'dlbcl')
    expect(stored('diseases')).toEqual({ favorites: [], recent: [], collapsed: [] })
    expect(stored('scores')).toEqual({ favorites: ['ipi'], recent: [], collapsed: [] })
  })

  it('keeps the last five opened, newest first, without repeats', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'c']) visit('diseases', id)
    expect(stored('diseases')).toMatchObject({ recent: ['c', 'f', 'e', 'd', 'b'] })
  })

  it('folds groups one by one and all at once, leaving other groups alone', () => {
    toggleCollapsed('diseases', 'lymphoma')
    toggleCollapsed('diseases', 'other')
    toggleCollapsed('diseases', 'other')
    expect(stored('diseases')).toMatchObject({ collapsed: ['lymphoma'] })
    setAllCollapsed('diseases', ['mds', 'other'], true)
    expect(stored('diseases')).toMatchObject({ collapsed: ['lymphoma', 'mds', 'other'] })
    setAllCollapsed('diseases', ['mds', 'other'], false)
    expect(stored('diseases')).toMatchObject({ collapsed: ['lymphoma'] })
  })

  it('starts empty from unreadable storage and drops what is not a string', () => {
    window.localStorage.setItem('hp.reference.diseases', '{not json')
    window.localStorage.setItem('hp.reference.scores', JSON.stringify({ favorites: ['x', 3] }))
    resetPicks()
    toggleFavorite('diseases', 'a')
    toggleFavorite('scores', 'y')
    expect(stored('diseases')).toEqual({ favorites: ['a'], recent: [], collapsed: [] })
    expect(stored('scores')).toEqual({ favorites: ['x', 'y'], recent: [], collapsed: [] })
  })
})
