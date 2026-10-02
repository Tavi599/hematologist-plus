import { describe, expect, it } from 'vitest'

import {
  isWritten,
  manualDayNumbers,
  manualRowsOn,
  manualWardRows,
  moveRow,
  newManualRow,
  daysWithManual,
  type ManualRow,
} from './manual-rows'

const row = (id: string, patch: Partial<ManualRow> = {}): ManualRow => ({
  ...newManualRow(id),
  what: `Призначення ${id}`,
  ...patch,
})

describe('manual rows', () => {
  it('counts a line with nothing written in it as no line at all', () => {
    expect(isWritten(newManualRow('a'))).toBe(false)
    expect(isWritten(row('a', { what: '   ' }))).toBe(false)
    expect(isWritten(row('a'))).toBe(true)
  })

  it('collects the days of every written line, in order and without repeats', () => {
    const rows = [row('a', { days: [3, 1] }), row('b', { days: [1, 8] }), newManualRow('c')]
    expect(manualDayNumbers(rows)).toEqual([1, 3, 8])
  })

  it('keeps each sheet’s lines apart', () => {
    const rows = [row('a', { days: [1] }), row('b', { days: [1], block: 'ward' })]
    expect(manualRowsOn(rows, 'infusion', 1).map((entry) => entry.id)).toEqual(['a'])
    expect(manualRowsOn(rows, 'infusion', 2)).toEqual([])
    expect(manualWardRows(rows).map((entry) => entry.id)).toEqual(['b'])
  })

  it('adds the days a hand-written line falls on to the course’s own', () => {
    const course = [
      { day: 1, date: '2026-10-05' },
      { day: 2, date: '2026-10-06' },
    ]
    const rows = [row('a', { days: [0, 2, 4] })]
    expect(daysWithManual(course, rows, (day) => `день-${day}`)).toEqual([
      { day: 0, date: 'день-0' },
      { day: 1, date: '2026-10-05' },
      { day: 2, date: '2026-10-06' },
      { day: 4, date: 'день-4' },
    ])
  })

  it('moves a line one place, and no further than the ends', () => {
    const rows = [row('a'), row('b'), row('c')]
    expect(moveRow(rows, 'b', -1).map((entry) => entry.id)).toEqual(['b', 'a', 'c'])
    expect(moveRow(rows, 'b', 1).map((entry) => entry.id)).toEqual(['a', 'c', 'b'])
    expect(moveRow(rows, 'a', -1)).toBe(rows)
    expect(moveRow(rows, 'c', 1)).toBe(rows)
    expect(moveRow(rows, 'nope', 1)).toBe(rows)
  })
})
