import { describe, expect, it } from 'vitest'

import { formatDays, parseDays } from './parse-days'

describe('parseDays', () => {
  it('reads single days and ranges', () => {
    expect(parseDays('1, 8, 15')).toEqual([1, 8, 15])
    expect(parseDays('1-7, 10')).toEqual([1, 2, 3, 4, 5, 6, 7, 10])
    expect(parseDays('2–4')).toEqual([2, 3, 4])
  })

  it('refuses what is not a day list', () => {
    expect(parseDays('')).toBeNull()
    expect(parseDays('a')).toBeNull()
    expect(parseDays('7-1')).toBeNull()
    expect(parseDays('1-700')).toBeNull()
  })
})

describe('formatDays', () => {
  it('writes runs of three or more as a range', () => {
    expect(formatDays([1, 2, 3, 4, 5, 6, 7, 10])).toBe('1-7, 10')
    expect(formatDays([1, 2, 8])).toBe('1, 2, 8')
    expect(formatDays([])).toBe('')
  })
})
