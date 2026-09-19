import { describe, expect, it } from 'vitest'

import {
  addDays,
  courseDayDates,
  formatTime,
  parseTime,
  scheduleAdministrations,
  untimedIds,
} from './schedule'
import { DomainInputError } from './types'

describe('course dates', () => {
  it('maps regimen days to dates with day 1 as the start', () => {
    // Crosses the EU daylight-saving change on 2026-03-29.
    expect(courseDayDates('2026-03-28', [8, 1, 2, 3, 2])).toEqual([
      { day: 1, date: '2026-03-28' },
      { day: 2, date: '2026-03-29' },
      { day: 3, date: '2026-03-30' },
      { day: 8, date: '2026-04-04' },
    ])
  })

  it('supports day 0 and leap years', () => {
    expect(courseDayDates('2026-01-01', [0])).toEqual([{ day: 0, date: '2025-12-31' }])
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
  })

  it('rejects malformed or impossible dates', () => {
    expect(() => addDays('28.03.2026', 1)).toThrow(DomainInputError)
    expect(() => addDays('2026-02-30', 1)).toThrow(DomainInputError)
    expect(() => addDays('2026-02-01', 1.5)).toThrow(DomainInputError)
    expect(() => courseDayDates('2026-13-01', [1])).toThrow(DomainInputError)
  })
})

describe('time helpers', () => {
  it('parses and formats times', () => {
    expect(parseTime('09:30')).toBe(570)
    expect(parseTime('0:05')).toBe(5)
    expect(formatTime(570)).toEqual({ time: '09:30', dayOffset: 0 })
    expect(formatTime(1500)).toEqual({ time: '01:00', dayOffset: 1 })
    expect(() => parseTime('24:00')).toThrow(DomainInputError)
    expect(() => parseTime('9.30')).toThrow(DomainInputError)
  })
})

describe('scheduleAdministrations', () => {
  it('places administrations sequentially with gaps and manual shifts', () => {
    const schedule = scheduleAdministrations('09:00', [
      { id: 'premed', block: 'infusion' as const, durationMin: 30 },
      { id: 'rituximab', block: 'infusion' as const, durationMin: 240, gapBeforeMin: 30 },
      { id: 'cyclophosphamide', block: 'infusion' as const, durationMin: 60, shiftMin: 15 },
      { id: 'vincristine', block: 'infusion' as const, durationMin: 0 },
    ])
    expect(schedule.map(({ id, start, end }) => ({ id, start, end }))).toEqual([
      { id: 'premed', start: '09:00', end: '09:30' },
      { id: 'rituximab', start: '10:00', end: '14:00' },
      { id: 'cyclophosphamide', start: '14:15', end: '15:15' },
      { id: 'vincristine', start: '15:15', end: '15:15' },
    ])
  })

  it('hangs the support of the day off the first infusion, not off the chain', () => {
    const schedule = scheduleAdministrations('09:00', [
      // Ondansetron 30 min before the cytostatic and then every 8 hours.
      {
        id: 'ondansetron#1',
        block: 'day_support' as const,
        durationMin: 0,
        anchorOffsetMin: -30,
        intervalMin: 480,
        occurrence: 0,
      },
      {
        id: 'ondansetron#2',
        block: 'day_support' as const,
        durationMin: 0,
        anchorOffsetMin: -30,
        intervalMin: 480,
        occurrence: 1,
      },
      { id: 'premed', block: 'infusion' as const, durationMin: 30 },
      { id: 'doxorubicin', block: 'infusion' as const, durationMin: 60 },
      { id: 'aciclovir', block: 'ward' as const, durationMin: 0 },
    ])

    expect(schedule.map(({ id, start }) => ({ id, start }))).toEqual([
      { id: 'ondansetron#1', start: '08:30' },
      { id: 'premed', start: '09:00' },
      { id: 'doxorubicin', start: '09:30' },
      { id: 'ondansetron#2', start: '16:30' },
    ])
    // The tablet is not in the grid at all, so no shift can move it.
    expect(untimedIds(schedule as never)).toEqual([])
  })

  it('moves the support with the infusion it is anchored to', () => {
    const items = [
      { id: 'ondansetron', block: 'day_support' as const, durationMin: 0, anchorOffsetMin: -30 },
      { id: 'doxorubicin', block: 'infusion' as const, durationMin: 60, shiftMin: 120 },
    ]
    const schedule = scheduleAdministrations('09:00', items)
    expect(schedule.map(({ id, start }) => ({ id, start }))).toEqual([
      { id: 'ondansetron', start: '10:30' },
      { id: 'doxorubicin', start: '11:00' },
    ])
    expect(untimedIds(items)).toEqual([])
  })

  it('leaves the inpatient sheet out of the hourly grid', () => {
    const items = [
      { id: 'aciclovir', block: 'ward' as const, durationMin: 0 },
      { id: 'allopurinol', block: 'ward' as const, durationMin: 0 },
    ]
    expect(scheduleAdministrations('09:00', items)).toEqual([])
    expect(untimedIds(items)).toEqual(['aciclovir', 'allopurinol'])
  })

  it('falls back to the start of the day when nothing is infused', () => {
    const [item] = scheduleAdministrations('09:00', [
      { id: 'ondansetron', block: 'day_support' as const, durationMin: 0, anchorOffsetMin: 60 },
    ])
    expect(item?.start).toBe('10:00')
  })

  it('reports administrations running past midnight', () => {
    const [item] = scheduleAdministrations('22:00', [
      { id: 'long', block: 'infusion' as const, durationMin: 180 },
    ])
    expect(item).toMatchObject({ start: '22:00', end: '01:00', startDayOffset: 0, endDayOffset: 1 })
  })

  it('never starts before midnight of the course day', () => {
    const [item] = scheduleAdministrations('00:30', [
      { id: 'x', block: 'infusion' as const, durationMin: 10, shiftMin: -60 },
    ])
    expect(item?.startMin).toBe(0)
  })

  it('validates durations and shifts', () => {
    expect(() =>
      scheduleAdministrations('09:00', [{ id: 'x', block: 'infusion' as const, durationMin: -1 }]),
    ).toThrow(DomainInputError)
    expect(() =>
      scheduleAdministrations('09:00', [
        { id: 'x', block: 'infusion' as const, durationMin: 10, gapBeforeMin: -5 },
      ]),
    ).toThrow(DomainInputError)
    expect(() =>
      scheduleAdministrations('09:00', [
        { id: 'x', block: 'infusion' as const, durationMin: 10, shiftMin: Infinity },
      ]),
    ).toThrow(DomainInputError)
  })
})
